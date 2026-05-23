import '@testing-library/jest-dom/vitest';
import React, { Suspense } from 'react';
import { render, screen, waitFor, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { socket } from '@/socket/socket';
import { AppContext } from '@/context/AppContext';
import ChatPage from '@/app/main/chat/[conversationId]/page';

// 1. Mock dependencies
vi.mock('axios');
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));
vi.mock('@/socket/socket', () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}));

// Helper to provide the required AppContext
const TestProvider = ({ children }: { children: React.ReactNode }) => {
  const dummyContext = {
    userData: { id: 'user-123', username: 'current_user' },
    setUserData: vi.fn(),
    isLoggedIn: true,
    setIsLoggedIn: vi.fn(),
    isProfileComplete: true,
    posts: [],
    setPosts: vi.fn(),
    loading: false,
    setLoading: vi.fn(),
    refreshAuth: vi.fn(),
  };

  return (
    <AppContext.Provider value={dummyContext as any}>
      {children}
    </AppContext.Provider>
  );
};

// Dummy data
const CONVERSATION_ID = 'conv-123';
const mockParams = Promise.resolve({ conversationId: CONVERSATION_ID });

const mockConversation = {
  _id: CONVERSATION_ID,
  participants: [
    { _id: 'user-123', username: 'current_user' },
    { _id: 'user-456', username: 'other_user', name: 'Other User' },
  ],
};

const mockMessages = [
  { _id: 'msg-1', conversation: CONVERSATION_ID, sender: { _id: 'user-456', username: 'other_user' }, content: 'Hello there!', createdAt: new Date().toISOString() },
  { _id: 'msg-2', conversation: CONVERSATION_ID, sender: { _id: 'user-123', username: 'current_user' }, content: 'Hi!', createdAt: new Date().toISOString() },
];

describe('ChatPage Component', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });

    // Ensure HTMLElement.prototype.scrollIntoView is mocked (JSDOM lacks it)
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it('fetches chat data on mount and marks messages as read', async () => {
    // Setup axios mocks
    vi.mocked(axios.get).mockImplementation(async (url) => {
      console.log('MOCK AXIOS GET:', url);
      if (url.includes(`/api/conversation/${CONVERSATION_ID}`)) {
        return { data: mockConversation };
      }
      if (url.includes(`/api/messages/${CONVERSATION_ID}`)) {
        return { data: mockMessages };
      }
      throw new Error('not found');
    });
    vi.mocked(axios.patch).mockResolvedValue({ data: { success: true } });

    await act(async () => {
      render(
        <TestProvider>
          <Suspense fallback={<div>Loading...</div>}>
            <ChatPage params={mockParams} />
          </Suspense>
        </TestProvider>
      );
    });

    // Verify messages are rendered
    await waitFor(() => {
      expect(document.querySelectorAll('.chat-bubble-other').length).toBe(1);
      expect(document.querySelectorAll('.chat-bubble-self').length).toBe(1);
    });

    // Verify mark as read was called
    expect(axios.patch).toHaveBeenCalledWith(
      expect.stringContaining(`/api/messages/${CONVERSATION_ID}/read-all`),
      {},
      expect.any(Object)
    );
  });

  it('renders a sent message after API resolves', async () => {
    vi.mocked(axios.get).mockImplementation((url) => {
      if (url.includes(`/api/conversation/${CONVERSATION_ID}`)) return Promise.resolve({ data: mockConversation });
      if (url.includes(`/api/messages/${CONVERSATION_ID}`)) return Promise.resolve({ data: [] });
      return Promise.reject();
    });

    // We delay the post request to verify optimistic update
    let resolvePost: any;
    const postPromise = new Promise((res) => { resolvePost = res; });
    vi.mocked(axios.post).mockReturnValue(postPromise as any);

    await act(async () => {
      render(
        <TestProvider>
          <Suspense fallback={<div>Loading...</div>}>
            <ChatPage params={mockParams} />
          </Suspense>
        </TestProvider>
      );
    });

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      expect(screen.getByText(/No messages yet/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    // Type and send
    fireEvent.change(input, { target: { value: 'Optimistic Test Message' } });
    fireEvent.click(sendButton);

    // It should render "Sending..." before postPromise resolves
    expect(screen.getByText('Sending...')).toBeInTheDocument();
    
    // Explicitly assert the message is NOT in the DOM yet (proving it is a pessimistic update)
    expect(screen.queryByText(/Optimistic Test Message/i)).not.toBeInTheDocument();
    
    // Resolve the promise
    await act(async () => {
      resolvePost({ data: { _id: 'new-msg-123', content: 'Optimistic Test Message', sender: { _id: 'user-123', username: 'current_user' } } });
    });

    // NOW it should render the sent message
    await waitFor(() => {
      expect(screen.getByText(/Optimistic Test Message/i)).toBeInTheDocument();
    });
    expect(input).toHaveValue(''); // Input should be cleared
  });

  it('receives real-time socket updates and displays the new message', async () => {
    vi.mocked(axios.get).mockImplementation((url) => {
      if (url.includes(`/api/conversation/${CONVERSATION_ID}`)) return Promise.resolve({ data: mockConversation });
      if (url.includes(`/api/messages/${CONVERSATION_ID}`)) return Promise.resolve({ data: [] });
      return Promise.reject();
    });

    let socketReceiveCallback: any = null;
    vi.mocked(socket.on).mockImplementation((event, cb) => {
      if (event === 'receive_message') socketReceiveCallback = cb;
      return socket as any;
    });

    await act(async () => {
      render(
        <TestProvider>
          <Suspense fallback={<div>Loading...</div>}>
            <ChatPage params={mockParams} />
          </Suspense>
        </TestProvider>
      );
    });

    await waitFor(() => {
      expect(socketReceiveCallback).not.toBeNull();
    });

    // Simulate incoming socket message
    await act(async () => {
      socketReceiveCallback({
        _id: 'socket-msg-1',
        conversation: CONVERSATION_ID,
        sender: { _id: 'user-456', username: 'other_user' },
        content: 'Incoming socket message',
        createdAt: new Date().toISOString()
      });
    });

    expect(screen.getByText(/Incoming socket message/i)).toBeInTheDocument();
  });

  it('successfully clears the chat after confirming the modal', async () => {
    vi.mocked(axios.get).mockImplementation((url) => {
      if (url.includes(`/api/conversation/${CONVERSATION_ID}`)) return Promise.resolve({ data: mockConversation });
      if (url.includes(`/api/messages/${CONVERSATION_ID}`)) return Promise.resolve({ data: mockMessages });
      return Promise.reject();
    });
    vi.mocked(axios.delete).mockResolvedValue({ data: { success: true } });

    await act(async () => {
      render(
        <TestProvider>
          <Suspense fallback={<div>Loading...</div>}>
            <ChatPage params={mockParams} />
          </Suspense>
        </TestProvider>
      );
    });

    // Wait for chat to load
    await waitFor(() => expect(document.querySelectorAll('.chat-bubble-self').length).toBeGreaterThan(0));

    // Click trash button (Clear Chat)
    // The button has a title or standard icon. We can find it by className or SVG.
    // In ChatPage, the trash button is usually rendered directly in the header.
    // It triggers setDeleteChatConfirmOpen(true).
    const clearChatButton = screen.getByTitle('Clear chat');
    fireEvent.click(clearChatButton);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByText(/Clear this chat\?/i)).toBeInTheDocument();
    });

    // Confirm deletion
    const confirmButton = screen.getByText('Clear Chat');
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining(`/api/conversation/${CONVERSATION_ID}`),
        expect.any(Object)
      );
    });

    // Verify redirection
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/main/chat');
    });
  });

  it('shows error state when clearing chat fails', async () => {
    vi.mocked(axios.get).mockImplementation((url) => {
      if (url.includes(`/api/conversation/${CONVERSATION_ID}`)) return Promise.resolve({ data: mockConversation });
      if (url.includes(`/api/messages/${CONVERSATION_ID}`)) return Promise.resolve({ data: mockMessages });
      return Promise.reject();
    });
    
    // Mock delete to fail
    vi.mocked(axios.delete).mockRejectedValue(new Error('Failed to delete'));

    await act(async () => {
      render(
        <TestProvider>
          <Suspense fallback={<div>Loading...</div>}>
            <ChatPage params={mockParams} />
          </Suspense>
        </TestProvider>
      );
    });

    await waitFor(() => expect(document.querySelectorAll('.chat-bubble-self').length).toBeGreaterThan(0));

    const clearChatButton = screen.getByTitle('Clear chat');
    fireEvent.click(clearChatButton);

    await waitFor(() => {
      expect(screen.getByText(/Clear this chat\?/i)).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('Clear Chat');
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    // The modal should close or the page shouldn't redirect
    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalled();
    });
    expect(mockPush).not.toHaveBeenCalled();
    
    // We expect the original messages to still be in the document
    expect(document.querySelectorAll('.chat-bubble-self').length).toBeGreaterThan(0);
  });
});

import '@testing-library/jest-dom/vitest';
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { Suspense } from 'react';
import { render, screen, waitFor, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { socket } from '@/socket/socket';
import { AppContext } from '@/context/AppContext';
import ChatPage from '@/app/main/chat/[conversationId]/page';

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

    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it('fetches chat data on mount and marks messages as read', async () => {
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

    await waitFor(() => {
      expect(document.querySelectorAll('.chat-bubble-other').length).toBe(1);
      expect(document.querySelectorAll('.chat-bubble-self').length).toBe(1);
    });

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

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      expect(screen.getByText(/No messages yet/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Optimistic Test Message' } });
    fireEvent.click(sendButton);

    expect(screen.getByText('Sending...')).toBeInTheDocument();
    
    expect(screen.queryByText(/Optimistic Test Message/i)).not.toBeInTheDocument();
    
    await act(async () => {
      resolvePost({ data: { _id: 'new-msg-123', content: 'Optimistic Test Message', sender: { _id: 'user-123', username: 'current_user' } } });
    });

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

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining(`/api/conversation/${CONVERSATION_ID}`),
        expect.any(Object)
      );
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/main/chat');
    });
  });

  describe('character limit enforcement', () => {
    beforeEach(async () => {
      vi.mocked(axios.get).mockImplementation((url) => {
        if (url.includes(`/api/conversation/${CONVERSATION_ID}`)) return Promise.resolve({ data: mockConversation });
        if (url.includes(`/api/messages/${CONVERSATION_ID}`)) return Promise.resolve({ data: [] });
        return Promise.reject();
      });
      vi.mocked(axios.patch).mockResolvedValue({ data: {} });

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
        expect(screen.queryByText(/No messages yet/i)).toBeInTheDocument();
      });
    });

    it('Send button is disabled when the input is empty', async () => {
      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();
    });

    it('Send button becomes enabled when valid text is typed', async () => {
      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'Hello!' } });

      expect(sendButton).not.toBeDisabled();
    });

    it('character counter appears once the user starts typing', async () => {
      const input = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(input, { target: { value: 'Hello' } });

      await waitFor(() => {
        expect(screen.getByText(/5 \/ 2000/)).toBeInTheDocument();
      });
    });

    it('Send button is disabled and counter shows error when over 2000 characters', async () => {
      const input = screen.getByPlaceholderText('Type a message...');
      const longText = 'a'.repeat(2001);

      fireEvent.change(input, { target: { value: longText } });

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByText(/Message too long/i)).toBeInTheDocument();
      });
    });

    it('Send button re-enables once text is trimmed back within the limit', async () => {
      const input = screen.getByPlaceholderText('Type a message...');

      fireEvent.change(input, { target: { value: 'a'.repeat(2001) } });
      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();

      fireEvent.change(input, { target: { value: 'Valid message' } });
      expect(sendButton).not.toBeDisabled();
    });

    it('Send button is disabled for whitespace-only content', async () => {
      const input = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(input, { target: { value: '     ' } });

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();
    });
  });

  it('shows error state when clearing chat fails', async () => {
    vi.mocked(axios.get).mockImplementation((url) => {
      if (url.includes(`/api/conversation/${CONVERSATION_ID}`)) return Promise.resolve({ data: mockConversation });
      if (url.includes(`/api/messages/${CONVERSATION_ID}`)) return Promise.resolve({ data: mockMessages });
      return Promise.reject();
    });
    
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

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalled();
    });
    expect(mockPush).not.toHaveBeenCalled();
    
    expect(document.querySelectorAll('.chat-bubble-self').length).toBeGreaterThan(0);
  });
});

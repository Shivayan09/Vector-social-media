# Vector

Vector is a full-stack social media platform built with a Next.js frontend and an Express/MongoDB backend. It supports account creation, Google OAuth, profile setup, a post feed, likes, comments, following, notifications, and real-time direct messaging with Socket.IO.

## Overview

The repository is split into two main apps:

- `client` - Next.js 16 app router frontend built with React 19, TypeScript, Tailwind CSS, `axios`, and `socket.io-client`
- `server` - Express 5 backend using MongoDB with Mongoose, JWT cookie auth, Passport Google OAuth, Cloudinary image uploads, and Socket.IO

## Core Features

- Email/password registration and login
- Google sign-in with Passport
- Profile onboarding flow after signup
- Avatar upload with Cloudinary
- Editable user profiles with bio and description
- Public user profile pages
- Follow and unfollow users
- Global post feed
- Post creation with intent tags: `ask`, `build`, `share`, `discuss`, `reflect`
- Post likes and comment threads
- Single post pages
- Explore page with user search and weekly top posts
- Notification center for follows, likes, comments, and messages
- Direct messaging with conversation threads
- Real-time incoming message and message deletion events over Socket.IO
- Protected app flow based on auth state and profile completion

## Tech Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- `axios`
- `react-toastify`
- `lucide-react`
- `next-themes`
- `socket.io-client`

### Backend

- Node.js
- Express 5
- MongoDB + Mongoose
- JWT auth via HTTP-only cookies
- Passport Google OAuth 2.0
- Cloudinary for avatar uploads
- Multer for file handling
- Socket.IO

## Project Structure

```text
.
|-- client/
|   |-- app/                # Next.js routes
|   |-- components/         # UI, feed, profile, forms, layout, modals
|   |-- context/            # Global auth + post state
|   |-- socket/             # Client socket connection
|   `-- public/             # Static assets
|-- server/
|   |-- src/
|   |   |-- config/         # MongoDB, Cloudinary, Passport
|   |   |-- controllers/    # Route handlers
|   |   |-- middlewares/    # Auth and upload middleware
|   |   |-- models/         # Mongoose schemas
|   |   |-- routes/         # API routes
|   |   `-- socket/         # Socket.IO setup
|   `-- server.js           # Backend entrypoint
`-- README.md
```

## Main User Flow

1. A user registers with email/password or signs in with Google.
2. If the profile is incomplete, the app sends them through profile setup.
3. Authenticated users land in the main app feed.
4. Users can create posts, like posts, comment, follow others, browse profiles, explore trending content, and open chats.
5. Notifications are created for follow, like, comment, and message actions.
6. Messages are delivered in real time when the recipient is online.

## API Areas

The backend exposes these main route groups:

- `/api/auth` - register, login, logout, current user, profile setup, Google OAuth
- `/api/users` - avatar upload, profile update, follow toggle, user search, followers/following, profile lookup
- `/api/posts` - create, fetch feed, fetch single post, fetch user posts, like/unlike, delete, top posts of the week
- `/api/comments` - list, create, delete comments
- `/api/notifications` - list, mark as read, delete one, delete selected, clear all
- `/api/conversation` - create and fetch conversations
- `/api/messages` - list messages, send message, delete message

## Environment Variables

### Frontend (`client/.env.local`)

```env
NEXT_PUBLIC_BACKEND_URL = 'http://localhost:5000'
NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'create your own (same as the backend Google Client ID)'
```

### Backend (`server/.env`)

```env
MONGO_URI = 'create your own'

JWT_SECRET = 'anytext'

NODE_ENV = 'development'

CLOUDINARY_CLOUD_NAME = 'create your own'

CLOUDINARY_API_KEY = 'create your own'

CLOUDINARY_API_SECRET = 'create your own'

GOOGLE_CLIENT_ID = 'create your own'

GOOGLE_CLIENT_SECRET = 'create your own'

FRONTEND_URL = 'your frontend url'
```

## Local Development

### 1. Install dependencies

```bash
cd client
npm install
```

```bash
cd server
npm install
```

### 2. Start the backend

```bash
cd server
npm run dev
```

### 3. Start the frontend

```bash
cd client
npm run dev
```

Frontend runs on `http://localhost:3000` and the backend runs on `http://localhost:5000` by default.

## Notes

- Authentication is cookie-based, so frontend requests use `withCredentials: true`.
- Google OAuth redirects users back to the frontend after authentication.
- Avatar uploads are sent to Cloudinary after being accepted by Multer.
- The repo currently does not include automated tests.
- Detailed setup instructions are available in `client/README.md` and `server/README.md`.

## Status

This codebase represents a working social platform foundation with authentication, social graph features, content posting, notifications, and real-time chat. It is a strong base for continuing work on moderation, richer media support, password recovery, deployment hardening, and test coverage.

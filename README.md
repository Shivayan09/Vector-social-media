# Vector

Vector is a full-stack social media platform built with a Next.js frontend and an Express + MongoDB backend. It supports authentication, profiles, posts, comments, notifications, and real-time direct messaging.

# <img src="https://www.nsoc.in/_next/image?url=%2Flogo.png&w=64&q=75" width="45" align="center" /> Nexus Spring of Code

> This project is listed in **Nexus Spring of Code 2026**

## Highlights

- Email/password authentication
- Google sign-in
- Profile onboarding and avatar upload
- Public and private profiles
- Follow system with follow requests
- Post creation with intent tags
- Likes, comments, and notifications
- Real-time messaging with Socket.IO
- Client and server test setup in progress

## Tech Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Axios
- Socket.IO client
- React Toastify
- Vitest

### Backend

- Node.js
- Express 5
- MongoDB + Mongoose
- JWT cookie authentication
- Passport Google OAuth
- Cloudinary
- Socket.IO
- Jest + Supertest

## Repository Structure

```text
.
|-- client/
|   |-- app/                  # Next.js routes and layouts
|   |-- components/           # UI, feed, profile, chat, forms, modals
|   |-- context/              # Shared auth and post state
|   |-- lib/                  # Shared types and utilities
|   |-- socket/               # Client socket setup
|   `-- tests/                # Client-side tests
|-- server/
|   |-- src/
|   |   |-- config/           # DB, Passport, Cloudinary
|   |   |-- controllers/      # Route handlers
|   |   |-- middlewares/      # Auth and upload middleware
|   |   |-- models/           # Mongoose models
|   |   |-- routes/           # API routes
|   |   `-- socket/           # Socket.IO server setup
|   `-- tests/                # Server tests
`-- README.md
```

## Core Features

### Authentication

- Register and log in with email/password
- Google login support
- Cookie-based session handling
- Password reset flow

### Social Graph

- View user profiles
- Follow and unfollow users
- Private accounts with follow requests
- Followers and following lists

### Posts

- Create text and image posts
- Use intent tags: `ask`, `build`, `share`, `discuss`, `reflect`
- Like posts
- Comment on posts
- View single-post pages and user post feeds

### Notifications

- Follow notifications
- Like notifications
- Comment notifications
- Message notifications
- Mark-as-read and delete flows

### Messaging

- One-to-one conversations
- Real-time incoming messages
- Real-time message deletion updates

## API Areas

- `/api/auth` - auth, session, password reset, Google login
- `/api/users` - profile, avatar, follow flows, search, suggestions
- `/api/posts` - feed, single post, create, edit, like, delete, top posts
- `/api/comments` - comment create, list, delete
- `/api/notifications` - fetch, mark read, delete one, bulk delete, clear all
- `/api/conversation` - start and fetch conversations
- `/api/messages` - fetch, send, read, delete messages
- `/api/contact` - contact form submission
- `/api/reports` - report-related flows

## Getting Started

### 1. Install dependencies

```bash
cd client
npm install
```

```bash
cd server
npm install
```

### 2. Configure environment variables

Frontend: `client/.env.local`

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

Backend: `server/.env`

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development
PORT=5000

CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

FRONTEND_URL=http://localhost:3000
EMAIL=your_email_address
EMAIL_PASS=your_email_password_or_app_password
```

### 3. Start the apps

Backend:

```bash
cd server
npm run dev
```

Frontend:

```bash
cd client
npm run dev
```

By default:

- frontend runs on `http://localhost:3000`
- backend runs on `http://localhost:5000`

## Scripts

### Client

- `npm run dev` - start the Next.js dev server
- `npm run build` - create a production build
- `npm run start` - run the production build
- `npm run lint` - run ESLint
- `npm run test` - run Vitest

### Server

- `npm run dev` - start the API with Nodemon
- `npm run start` - start the API with Node
- `npm run test` - run Jest tests
- `npm run lint` - run ESLint

## Testing

The repository now includes both client and server test setup:

- client tests use `Vitest`
- server tests use `Jest` + `Supertest` + `mongodb-memory-server`

Examples:

```bash
cd client
npm run test
```

```bash
cd server
npm test
```

## Notes

- The app uses cookie-based auth, so frontend API requests send credentials.
- Socket.IO registration is authenticated through the server-side handshake.
- Some routes use optional auth so they can return public data for guests and personalized data for logged-in users.
- The codebase is under active development and still has room for additional tests, cleanup, and UX refinements.

## Contributing

Good first contributions include:

- adding missing tests
- fixing loading or empty states
- tightening validation and error messages
- improving documentation
- cleaning duplicated logic across routes and components

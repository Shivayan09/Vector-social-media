# Vector Backend

This is the Express and MongoDB backend for Vector. It powers authentication, profiles, posts, comments, notifications, conversations, messages, and real-time Socket.IO events.

## What This API Does

- Registers users, logs them in, and returns the current session user
- Supports Google OAuth login
- Stores and updates user profiles and avatars
- Creates, lists, likes, and deletes posts
- Handles comments and notification data
- Creates chat conversations and sends messages
- Broadcasts message events over Socket.IO

## Tech Stack

- Node.js
- Express 5
- MongoDB + Mongoose
- JWT auth with HTTP-only cookies
- Passport Google OAuth 2.0
- Cloudinary for image uploads
- Multer for file handling
- Socket.IO
- CORS and cookie-parser

## Project Structure

- `src/config/` - database, Cloudinary, and Passport setup
- `src/controllers/` - route handlers
- `src/middlewares/` - auth, upload, and error middleware
- `src/models/` - Mongoose schemas
- `src/routes/` - API route definitions
- `src/socket/` - Socket.IO setup
- `src/utils/` - helper utilities

## Setup

1. Install dependencies:

```bash
cd server
npm install
```

2. Create `server/.env`:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FRONTEND_URL=http://localhost:3000
PORT=5000
```

3. Start the server:

```bash
npm run dev
```

4. The API will be available at `http://localhost:5000`.

## Available Scripts

- `npm run dev` - start the server with Nodemon
- `npm run start` - start the server with Node

## Main API Routes

- `/api/auth` - register, login, logout, current user, Google auth
- `/api/users` - profile updates, avatar upload, follow/unfollow, search
- `/api/posts` - create posts, feed, single post, likes, top posts
- `/api/comments` - comment operations
- `/api/notifications` - notification list and cleanup actions
- `/api/conversation` - conversation creation and lookup
- `/api/messages` - list, send, and delete messages

## Notes

- `server.js` connects to MongoDB, enables CORS, and initializes Socket.IO.
- The frontend origin must be allowed in `FRONTEND_URL` and CORS settings.
- This backend is cookie-based, so frontend requests should include credentials.
- If you deploy the frontend, update the allowed origin and environment values.

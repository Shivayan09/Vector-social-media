# Vector Frontend

This is the Next.js client for Vector, a social platform with posts, comments, follows, notifications, profiles, and real-time chat.

## What This App Does

- Handles sign up, login, and Google sign-in
- Keeps track of auth and profile state in a shared context
- Shows the main feed, explore page, activity page, profile pages, and chat screens
- Connects to the backend API with cookie-based authentication
- Uses Socket.IO for live messaging and message updates

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Axios
- Socket.IO client
- React Toastify
- next-themes
- lucide-react

## Project Structure

- `app/` - route pages and layouts
- `components/` - UI, feed, forms, layouts, modals, and profile components
- `context/` - global auth and post state
- `socket/` - client Socket.IO setup
- `public/` - static images and assets

## Setup

1. Install dependencies:

```bash
cd client
npm install
```

2. Create `client/.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

3. Start the dev server:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Available Scripts

- `npm run dev` - start development server
- `npm run build` - create production build
- `npm run start` - run the production build
- `npm run lint` - run ESLint

## Notes

- The app expects the backend to be running on the URL in `NEXT_PUBLIC_BACKEND_URL`.
- Auth requests use `withCredentials: true`, so cookies must be enabled.
- The same Google client ID must be configured on both the frontend and backend.
- The authenticated experience lives under `app/main`.

## Contribution Tip

For a first contribution, a small UI polish, documentation fix, or loading/error state improvement is a good fit.

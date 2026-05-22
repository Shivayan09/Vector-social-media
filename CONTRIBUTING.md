# Contributing to Vector

Thanks for contributing to Vector. This project is a full-stack social media app with a Next.js frontend in `client/` and an Express/MongoDB backend in `server/`.

This guide is here to help you get set up quickly and make contributions that are easy to review and merge.

## Before You Start

- Read the root [README.md] for the project overview.
- Check the app-specific docs in [client/README.md] and [server/README.md]
- If you are working through an open source program or issue board, make sure the task is not already being worked on before you start.

## Project Layout

```text
client/   Next.js 16 frontend with React 19 and TypeScript
server/   Express 5 backend with MongoDB, Mongoose, and Socket.IO
```

## Local Setup

### 1. Fork and clone

```bash
git clone <your-fork-url>
cd Vector-social-media
```

### 2. Install dependencies

```bash
cd client
npm install
```

```bash
cd ../server
npm install
```

### 3. Create environment files

Create `client/.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

Create `server/.env`:

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

### 4. Run the apps

Start the backend:

```bash
cd server
npm run dev
```

Start the frontend in another terminal:

```bash
cd client
npm run dev
```

The frontend runs on `http://localhost:3000` and the backend runs on `http://localhost:5000`.

## Ways to Contribute

Good contribution areas include:

- bug fixes
- UI polish and accessibility improvements
- loading, empty, and error states
- performance improvements
- documentation updates
- backend validation and API hardening
- test coverage additions

If you want an easier first contribution, small documentation fixes and focused UI improvements are great starting points.

## Contribution Workflow

1. Create a branch from the latest default branch.
2. Keep your change focused on one issue or feature.
3. Make and verify your changes locally.
4. Open a pull request with a clear summary.

Example branch names:

- `fix/navbar-mobile-overflow`
- `feat/add-post-empty-state`
- `docs/update-setup-guide`

## Coding Expectations

Please try to match the patterns already used in the codebase.

- Keep frontend changes inside `client/` and backend changes inside `server/`.
- Use TypeScript for frontend code and keep component props/types explicit when possible.
- Keep API and controller changes aligned with existing route and model structure.
- Prefer small, readable functions over large rewrites.
- Avoid unrelated refactors in the same pull request.
- Update documentation when behavior or setup changes.

## Linting and Checks

Run the relevant checks before opening a pull request.

Frontend:

```bash
cd client
npm run lint
```

Backend:

```bash
cd server
npm run lint
```

## Testing

This repository currently does not include a complete automated test suite, so manual verification is important.

When submitting a change, include:

- what you changed
- how you tested it
- any screenshots or screen recordings for UI work
- any API routes or flows you manually verified

Useful manual checks:

- authentication flows
- profile setup and profile editing
- post creation, likes, and comments
- follow and unfollow behavior
- notifications
- messaging and real-time updates

## Pull Request Guidelines

Please make your pull request easy to review.

- Use a clear title.
- Link the related issue if there is one.
- Describe the problem and the solution.
- Mention any environment or schema changes.
- Include before/after screenshots for UI updates when relevant.
- Call out anything that still needs follow-up.

## Commit Messages

Clear commit messages help maintainers review history more easily.

Examples:

- `fix: prevent duplicate like requests`
- `feat: add loading state for profile page`
- `docs: add backend env setup notes`

## Need Help?

If something in setup or the codebase is unclear, open an issue or ask in the contribution thread associated with the project listing. Clear questions are welcome, and documentation improvements are always appreciated.

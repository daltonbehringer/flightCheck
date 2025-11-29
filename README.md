# Duffel Flight Search

A modern flight search experience built with Next.js, TypeScript, and Tailwind CSS. The app talks to the Duffel API on the server to fetch real fares, routes, and cabin details, while keeping the UI clean and responsive for rapid UX iteration.

## Tech stack
- Next.js 14 (App Router) + React 18
- TypeScript with strict mode
- Tailwind CSS for styling
- API routes for server-side Duffel calls
- Jest + Testing Library for tests
- npm for package management

## Getting started
1. **Install Node 20** (see `.nvmrc`).
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Create environment file**
   ```bash
   cp .env.example .env
   # Set DUFFEL_API_KEY to your secret key
   ```
4. **Run the dev server**
   ```bash
   npm run dev
   ```
5. Visit `http://localhost:3000/search` to use the UI.

## Environment variables
- `DUFFEL_API_KEY` (required): your Duffel API token. Used only on the server.
- `DUFFEL_API_BASE_URL` (optional): defaults to `https://api.duffel.com`.

## Project structure
```
app/
  (flight-search)/search/page.tsx   # Main flight search UI
  api/flights/search/route.ts       # Server route proxying Duffel search
  layout.tsx, globals.css           # App shell and global styles
components/
  FlightSearchForm.tsx              # Form inputs
  FlightResultsList.tsx             # Results rendering
  FlightSearchShell.tsx             # State + data fetching orchestration
lib/
  duffel/client.ts                  # Server-only Duffel API wrapper
  types/duffel.ts                   # Shared types
```

## Architecture notes
- The browser never sees the Duffel key. The UI posts to `/api/flights/search`, which validates input and calls `DuffelClient` on the server.
- `DuffelClient` normalizes Duffel offers into frontend-friendly shapes (segments, slices, durations, prices) and handles basic error reporting.
- Components are intentionally lean so you can swap layouts or experiment with new UX flows quickly.

## Scripts
- `npm run dev` - start Next.js locally
- `npm run build` - production build
- `npm run start` - run the built app
- `npm run lint` - ESLint
- `npm run type-check` - TypeScript without emit
- `npm run test` - Jest test suite
- `npm run format` / `npm run format:write` - Prettier checks/fixes

## Testing
- Unit test for the Duffel client (`__tests__/duffelClient.test.ts`) uses mocked `fetch` to verify normalization and error handling.
- Component test for `FlightSearchForm` ensures user input and submission behave as expected.

## Next steps
- Add persisted search history and analytics for UX experiments.
- Expand validation (dates, passenger counts per cabin rules) and surface Duffel's richer fare data.
- Add loading skeletons per segment and integrate seat maps/ancillaries as needed.

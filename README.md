# Duffel Flight Search

A modern flight search experience built with Next.js, TypeScript, and Tailwind CSS. The current iteration focuses on multi-airport flight cost comparisons (airfare only) with a mock provider that can be swapped for a real API.

## Tech stack
- Next.js 14 (App Router) + React 18
- TypeScript with strict mode
- Tailwind CSS for styling
- API routes for server-side flight search
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
   ```
4. **Run the dev server**
   ```bash
   npm run dev
   ```
5. Visit `http://localhost:3000/search` to use the UI.

## Environment variables
- `DEFAULT_AIRPORT_RADIUS_KM` (optional): fallback distance for nearby airport search (defaults to 150 km).
- `DUFFEL_API_KEY` / `DUFFEL_API_BASE_URL` (optional): kept for the Duffel sample route.

## Project structure
```
app/
  (flight-search)/search/page.tsx   # Main flight search UI
  api/flight-search/route.ts        # Multi-airport cost-first search endpoint
  api/flights/search/route.ts       # Legacy Duffel sample route
  layout.tsx, globals.css           # App shell and global styles
components/
  FlightSearchForm.tsx              # Form inputs (multi-airport aware)
  FlightResultsList.tsx             # Results rendering (fare-first)
  FlightSearchShell.tsx             # State + data fetching orchestration
lib/
  shared/types/flights.ts           # Shared flight models
  server/airports/airportService.ts # Nearby airport resolution
  server/flights/flightSearchProvider.ts # Flight search provider abstraction + mock
  server/flights/itineraryRanking.ts # Sorting helpers
  duffel/client.ts                  # Server-only Duffel API wrapper
  types/duffel.ts                   # Shared types
```

## Architecture notes
- UI posts to `/api/flight-search`, which validates the request with zod, resolves nearby origin airports, runs the `FlightSearchProvider`, ranks results by price then duration, and returns a unified response.
- `MockFlightSearchProvider` lives behind the `FlightSearchProvider` interface so a real API client can be dropped in later.
- Airport resolution is driven by a static dataset and Haversine distance; preferred airport lists override radius searches.
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
- Airport resolution and itinerary ranking are covered by unit tests.
- Component test for `FlightSearchForm` ensures user input and submission behave as expected.
- Duffel client mock test (`__tests__/duffelClient.test.ts`) remains for the legacy endpoint.

## Next steps
- Swap `MockFlightSearchProvider` for a real provider (Amadeus, Skyscanner, Duffel) behind the same interface.
- Add parking/ground costs as additional legs or surcharges without changing the public response shape.
- Persist search history and add analytics hooks for UX experiments.

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveDepartureAirports, resolveDestinationAirports } from '@/lib/server/airports/airportService';
import { MockFlightSearchProvider } from '@/lib/server/flights/flightSearchProvider';
import { rankItineraries } from '@/lib/server/flights/itineraryRanking';
import type { FlightSearchRequest } from '@/lib/shared/types/flights';

const requestSchema = z
  .object({
    origin: z
      .object({
        city: z.string().optional(),
        airportCode: z.string().optional(),
        lat: z.number().optional(),
        lon: z.number().optional()
      })
      .refine(
        (value) =>
          Boolean(value.city) ||
          Boolean(value.airportCode) ||
          (value.lat !== undefined && value.lon !== undefined),
        { message: 'Provide city, airportCode, or lat/lon for origin.' }
      )
      .refine((value) =>
        (value.lat === undefined && value.lon === undefined) ||
        (value.lat !== undefined && value.lon !== undefined)
      ),
    destination: z
      .object({
        city: z.string().optional(),
        airportCode: z.string().optional()
      })
      .refine((value) => Boolean(value.city) || Boolean(value.airportCode), {
        message: 'Provide city or airportCode for destination.'
      }),
    tripType: z.enum(['oneway', 'roundtrip']),
    departureDate: z.string(),
    returnDate: z.string().optional(),
    maxDepartureAirportDistanceKm: z.number().positive().optional(),
    preferredDepartureAirports: z.array(z.string()).optional(),
    nonStopOnly: z.boolean().optional(),
    maxStops: z.number().int().nonnegative().optional()
  })
  .refine((value) => (value.tripType === 'roundtrip' ? Boolean(value.returnDate) : true), {
    message: 'returnDate is required for roundtrip searches.'
  });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid search parameters.', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload: FlightSearchRequest = parsed.data;

  const destinationAirports = resolveDestinationAirports(payload.destination);
  if (!destinationAirports.length) {
    return NextResponse.json(
      { error: 'No destination airports found for the provided destination.' },
      { status: 400 }
    );
  }

  const { candidates: originAirports } = resolveDepartureAirports(payload);
  if (!originAirports.length) {
    return NextResponse.json(
      { error: 'No origin airports found within the configured search area.' },
      { status: 400 }
    );
  }

  try {
    const provider = new MockFlightSearchProvider();
    const itineraries = await provider.searchFlights({
      ...payload,
      departureAirportCodes: originAirports.map((airport) => airport.iata)
    });

    const ranked = rankItineraries(itineraries);
    const currency = ranked[0]?.currency ?? 'USD';

    const response = {
      itineraries: ranked,
      originAirportsConsidered: originAirports,
      destinationAirportsConsidered: destinationAirports,
      currency
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Multi-airport flight search failed', error);
    const message = error instanceof Error ? error.message : 'Unable to search flights right now.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json(
    { message: 'Use POST to search flights.' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { searchFlights } from '@/lib/duffel/client';
import { CabinClass, FlightSearchParams } from '@/lib/types/duffel';

const searchSchema = z.object({
  origin: z.string().min(3, 'Origin must be at least 3 characters.'),
  destination: z.string().min(3, 'Destination must be at least 3 characters.'),
  departureDate: z.string(),
  returnDate: z.string().optional(),
  passengers: z.number().int().positive().max(9),
  cabinClass: z.enum(['economy', 'premium_economy', 'business', 'first'])
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const parsed = searchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid search parameters.', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload: FlightSearchParams = {
    ...parsed.data,
    origin: parsed.data.origin.trim().toUpperCase(),
    destination: parsed.data.destination.trim().toUpperCase()
  };

  try {
    const offers = await searchFlights(payload);
    return NextResponse.json({ offers });
  } catch (error) {
    console.error('Duffel search failed', error);
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

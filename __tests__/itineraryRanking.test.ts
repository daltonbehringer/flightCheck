import { rankItineraries } from '@/lib/server/flights/itineraryRanking';
import type { Itinerary } from '@/lib/shared/types/flights';

const airport = {
  id: 'sfo',
  iata: 'SFO',
  name: 'SFO',
  city: 'San Francisco',
  country: 'USA',
  lat: 0,
  lon: 0
};

const itinerary = (overrides: Partial<Itinerary>): Itinerary => ({
  id: `it-${Math.random()}`,
  legs: [],
  totalDurationMinutes: 100,
  totalPrice: 200,
  currency: 'USD',
  numberOfStops: 0,
  departureAirport: airport,
  arrivalAirport: airport,
  ...overrides
});

describe('rankItineraries', () => {
  it('sorts by price then duration', () => {
    const items = rankItineraries([
      itinerary({ id: '3', totalPrice: 300, totalDurationMinutes: 80 }),
      itinerary({ id: '1', totalPrice: 150, totalDurationMinutes: 150 }),
      itinerary({ id: '2', totalPrice: 150, totalDurationMinutes: 120 })
    ]);

    expect(items.map((it) => it.id)).toEqual(['2', '1', '3']);
  });
});

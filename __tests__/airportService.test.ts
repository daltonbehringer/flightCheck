import { resolveDepartureAirports, resolveDestinationAirports } from '@/lib/server/airports/airportService';
import type { FlightSearchRequest } from '@/lib/shared/types/flights';

describe('airportService', () => {
  const baseRequest: FlightSearchRequest = {
    origin: { lat: 37.6213, lon: -122.379 },
    destination: { airportCode: 'LHR' },
    tripType: 'oneway',
    departureDate: '2024-01-01'
  };

  it('returns nearby airports within radius when using coordinates', () => {
    const { candidates } = resolveDepartureAirports({
      ...baseRequest,
      maxDepartureAirportDistanceKm: 80
    });

    const codes = candidates.map((airport) => airport.iata);
    expect(codes).toEqual(expect.arrayContaining(['SFO', 'OAK', 'SJC']));
  });

  it('prefers explicit airport list over radius search', () => {
    const { candidates } = resolveDepartureAirports({
      ...baseRequest,
      preferredDepartureAirports: ['LAX']
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].iata).toBe('LAX');
  });

  it('resolves destination by code', () => {
    const destinations = resolveDestinationAirports({ airportCode: 'CDG' });
    expect(destinations[0].iata).toBe('CDG');
  });
});

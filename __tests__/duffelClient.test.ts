import { DuffelClient } from '@/lib/duffel/client';
import type { FlightSearchParams } from '@/lib/types/duffel';

describe('DuffelClient', () => {
  const params: FlightSearchParams = {
    origin: 'SFO',
    destination: 'LHR',
    departureDate: '2024-01-01',
    passengers: 1,
    cabinClass: 'economy'
  };

  const mockFetch = jest.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it('maps Duffel offers into internal shape', async () => {
    const mockResponse = {
      data: {
        offers: [
          {
            id: 'offer_1',
            total_amount: '123.45',
            total_currency: 'USD',
            slices: [
              {
                duration: 'PT2H',
                segments: [
                  {
                    id: 'segment_1',
                    origin: { iata_code: 'SFO' },
                    destination: { iata_code: 'LAX' },
                    marketing_carrier: { name: 'Test Air', iata_code: 'TA' },
                    operating_carrier: { name: 'Test Air', iata_code: 'TA' },
                    departing_at: '2024-01-01T10:00:00Z',
                    arriving_at: '2024-01-01T12:00:00Z',
                    duration: 'PT2H',
                    aircraft: { name: 'Boeing 737' }
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => mockResponse
    });

    const client = new DuffelClient({ apiKey: 'test_key', baseUrl: 'https://example.com' });
    const offers = await client.searchFlights(params);

    expect(offers).toHaveLength(1);
    expect(offers[0].totalPrice).toBe('123.45');
    expect(offers[0].slices[0].segments[0].departureAirport).toBe('SFO');
    expect(offers[0].numberOfStops).toBe(0);
  });

  it('throws when API key is missing', () => {
    expect(() => new DuffelClient({ apiKey: undefined })).toThrow('DUFFEL_API_KEY');
  });

  it('throws when Duffel responds with an error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Unauthorized'
    });

    const client = new DuffelClient({ apiKey: 'bad-key', baseUrl: 'https://example.com' });

    await expect(client.searchFlights(params)).rejects.toThrow('Duffel API responded with 401');
  });
});

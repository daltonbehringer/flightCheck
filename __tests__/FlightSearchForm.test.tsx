import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import FlightSearchForm, {
  FlightSearchFormValues,
  NEARBY_AIRPORT_RADIUS_KM
} from '@/components/FlightSearchForm';
import type { FlightSearchRequest } from '@/lib/shared/types/flights';

describe('FlightSearchForm', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '37.7749', lon: '-122.4194' }]
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const defaultValues: FlightSearchFormValues = {
    originInput: 'SFO',
    destinationInput: 'LHR',
    tripType: 'roundtrip',
    departureDate: '2024-01-01',
    returnDate: '2024-01-08',
    nonStopOnly: false,
    useNearbyAirports: false
  };

  it('submits normalized request payload', async () => {
    const handleSubmit = jest.fn();

    render(<FlightSearchForm defaultValues={defaultValues} onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/Origin/i), { target: { value: 'jfk' } });
    fireEvent.change(screen.getByLabelText(/Destination/i), { target: { value: 'lax' } });
    fireEvent.click(screen.getByText(/One way/i));
    fireEvent.click(
      screen.getByLabelText(/I'm willing to drive to\/from a nearby airport for a better deal/i)
    );
    fireEvent.click(screen.getByLabelText(/Non-stop only/i));

    fireEvent.click(screen.getByRole('button', { name: /Search flights/i }));

    await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));

    const payload = handleSubmit.mock.calls[0][0] as FlightSearchRequest;
    expect(payload.tripType).toBe('oneway');
    expect(payload.origin.airportCode).toBe('JFK');
    expect(payload.destination.airportCode).toBe('LAX');
    expect(payload.returnDate).toBeUndefined();
    expect(payload.includeNearbyAirports).toBe(true);
    expect(payload.maxDepartureAirportDistanceKm).toBe(NEARBY_AIRPORT_RADIUS_KM);
    expect(payload.maxArrivalAirportDistanceKm).toBe(NEARBY_AIRPORT_RADIUS_KM);
    expect(payload.nonStopOnly).toBe(true);
  });

  it('limits search to entered airports when nearby toggle is off', async () => {
    const handleSubmit = jest.fn();

    render(<FlightSearchForm defaultValues={defaultValues} onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/Origin/i), { target: { value: 'jfk' } });
    fireEvent.change(screen.getByLabelText(/Destination/i), { target: { value: 'lax' } });

    fireEvent.click(screen.getByRole('button', { name: /Search flights/i }));

    await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));

    const payload = handleSubmit.mock.calls[0][0] as FlightSearchRequest;
    expect(payload.includeNearbyAirports).toBe(false);
    expect(payload.maxDepartureAirportDistanceKm).toBeUndefined();
    expect(payload.maxArrivalAirportDistanceKm).toBeUndefined();
    expect(payload.preferredDepartureAirports).toBeUndefined();
    expect(payload.preferredArrivalAirports).toBeUndefined();
  });

  it('passes through current location coordinates when nearby search is disabled', async () => {
    const handleSubmit = jest.fn();

    render(
      <FlightSearchForm
        defaultValues={{
          ...defaultValues,
          originInput: 'Current location',
          originLat: 30.2672,
          originLon: -97.7431
        }}
        onSubmit={handleSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Search flights/i }));

    await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));

    const payload = handleSubmit.mock.calls[0][0] as FlightSearchRequest;
    expect(payload.origin.lat).toBeCloseTo(30.2672);
    expect(payload.origin.lon).toBeCloseTo(-97.7431);
    expect(payload.includeNearbyAirports).toBe(false);
  });

  it('geocodes city names when coordinates are missing', async () => {
    const handleSubmit = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ lat: '36.327', lon: '-119.645' }]
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ lat: '33.4484', lon: '-94.3246' }]
    });

    render(
      <FlightSearchForm
        defaultValues={{ ...defaultValues, useNearbyAirports: true }}
        onSubmit={handleSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/Origin/i), { target: { value: 'Hanford, CA' } });
    fireEvent.change(screen.getByLabelText(/Destination/i), { target: { value: 'Texarkana, TX' } });

    fireEvent.click(screen.getByRole('button', { name: /Search flights/i }));

    await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));

    const payload = handleSubmit.mock.calls[0][0] as FlightSearchRequest;
    expect(payload.origin.lat).toBeCloseTo(36.327);
    expect(payload.origin.lon).toBeCloseTo(-119.645);
    expect(payload.destination.lat).toBeCloseTo(33.4484);
    expect(payload.destination.lon).toBeCloseTo(-94.3246);
    expect(payload.includeNearbyAirports).toBe(true);
  });

  it('applies airport suggestions to the payload', async () => {
    const handleSubmit = jest.fn();

    render(
      <FlightSearchForm
        defaultValues={{ ...defaultValues, originInput: '', destinationInput: 'LAX' }}
        onSubmit={handleSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/Origin/i), { target: { value: 'SFO' } });

    const suggestionButton = await screen.findByRole('button', { name: /san francisco .*sfo/i });
    fireEvent.click(suggestionButton);

    fireEvent.click(screen.getByRole('button', { name: /Search flights/i }));

    await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));

    const payload = handleSubmit.mock.calls[0][0] as FlightSearchRequest;
    expect(payload.origin.airportCode).toBe('SFO');
    expect(payload.origin.lat).toBeCloseTo(37.6213, 3);
    expect(payload.origin.lon).toBeCloseTo(-122.379, 3);
  });
});

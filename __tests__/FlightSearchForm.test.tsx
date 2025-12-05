import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import FlightSearchForm, {
  FlightSearchFormValues,
  NEARBY_AIRPORT_RADIUS_KM
} from '@/components/FlightSearchForm';
import type { FlightSearchRequest } from '@/lib/shared/types/flights';

describe('FlightSearchForm', () => {
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
    expect(payload.origin.airportCode).toBe('jfk');
    expect(payload.destination.airportCode).toBe('lax');
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
});

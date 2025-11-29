import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import FlightSearchForm, { FlightSearchFormValues } from '@/components/FlightSearchForm';
import type { FlightSearchRequest } from '@/lib/shared/types/flights';

describe('FlightSearchForm', () => {
  const defaultValues: FlightSearchFormValues = {
    originInput: 'SFO',
    destinationInput: 'LHR',
    tripType: 'roundtrip',
    departureDate: '2024-01-01',
    returnDate: '2024-01-08',
    maxDepartureAirportDistanceKm: 150,
    nonStopOnly: false,
    maxStops: 1
  };

  it('submits normalized request payload', async () => {
    const handleSubmit = jest.fn();

    render(<FlightSearchForm defaultValues={defaultValues} onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/Origin/i), { target: { value: 'jfk' } });
    fireEvent.change(screen.getByLabelText(/Destination/i), { target: { value: 'lax' } });
    fireEvent.click(screen.getByText(/One way/i));
    fireEvent.change(screen.getByLabelText(/Max distance/i), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText(/Preferred departure airports/i), {
      target: { value: 'JFK, EWR' }
    });
    fireEvent.click(screen.getByLabelText(/Non-stop only/i));

    fireEvent.click(screen.getByRole('button', { name: /Search flights/i }));

    await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));

    const payload = handleSubmit.mock.calls[0][0] as FlightSearchRequest;
    expect(payload.tripType).toBe('oneway');
    expect(payload.origin.airportCode).toBe('jfk');
    expect(payload.destination.airportCode).toBe('lax');
    expect(payload.returnDate).toBeUndefined();
    expect(payload.maxDepartureAirportDistanceKm).toBe(120);
    expect(payload.preferredDepartureAirports).toEqual(['JFK', 'EWR']);
    expect(payload.nonStopOnly).toBe(true);
  });
});

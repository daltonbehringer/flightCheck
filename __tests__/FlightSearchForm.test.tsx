import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import FlightSearchForm from '@/components/FlightSearchForm';
import type { FlightSearchParams } from '@/lib/types/duffel';

describe('FlightSearchForm', () => {
  const defaultValues: FlightSearchParams = {
    origin: 'SFO',
    destination: 'LHR',
    departureDate: '2024-01-01',
    passengers: 1,
    cabinClass: 'economy'
  };

  it('submits updated values', async () => {
    const handleSubmit = jest.fn();

    render(<FlightSearchForm defaultValues={defaultValues} onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/Origin/i), { target: { value: 'jfk' } });
    fireEvent.change(screen.getByLabelText(/Passengers/i), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/Return date/i), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /Search flights/i }));

    await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ origin: 'JFK', passengers: 2, returnDate: undefined })
    );
  });
});

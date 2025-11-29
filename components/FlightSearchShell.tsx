'use client';

import { useMemo, useState } from 'react';

import FlightResultsList from '@/components/FlightResultsList';
import FlightSearchForm from '@/components/FlightSearchForm';
import { FlightOffer, FlightSearchParams } from '@/lib/types/duffel';

type RequestState = 'idle' | 'loading' | 'success' | 'error';

const formatInputDate = (date: Date) => date.toISOString().split('T')[0];

const defaultParams: FlightSearchParams = {
  origin: 'SFO',
  destination: 'LHR',
  departureDate: formatInputDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 14)),
  returnDate: formatInputDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 21)),
  passengers: 1,
  cabinClass: 'economy'
};

export default function FlightSearchShell() {
  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [status, setStatus] = useState<RequestState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSearch, setLastSearch] = useState<FlightSearchParams | null>(null);

  const handleSearch = async (params: FlightSearchParams) => {
    setStatus('loading');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/flights/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Search failed. Please try again.');
      }

      setOffers(data?.offers ?? []);
      setStatus('success');
      setLastSearch(params);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      setErrorMessage(message);
      setStatus('error');
    }
  };

  const hasSearched = useMemo(() => status !== 'idle', [status]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_1.85fr]">
      <div className="card p-6 lg:sticky lg:top-6 lg:h-fit">
        <FlightSearchForm
          defaultValues={defaultParams}
          onSubmit={handleSearch}
          loading={status === 'loading'}
        />
      </div>

      <div className="card min-h-[480px] p-6">
        <FlightResultsList
          offers={offers}
          loading={status === 'loading'}
          error={errorMessage}
          hasSearched={hasSearched}
          lastSearch={lastSearch}
        />
      </div>
    </div>
  );
}

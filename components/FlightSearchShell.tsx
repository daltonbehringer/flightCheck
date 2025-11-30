'use client';

import { useMemo, useState } from 'react';

import FlightResultsList from '@/components/FlightResultsList';
import FlightSearchForm, { FlightSearchFormValues } from '@/components/FlightSearchForm';
import type { FlightSearchRequest, FlightSearchResponse } from '@/lib/shared/types/flights';
import React = require('react');

type RequestState = 'idle' | 'loading' | 'success' | 'error';

const formatInputDate = (date: Date) => date.toISOString().split('T')[0];

const defaultFormValues: FlightSearchFormValues = {
  originInput: 'San Francisco',
  destinationInput: 'London',
  tripType: 'roundtrip',
  departureDate: formatInputDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 14)),
  returnDate: formatInputDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 21)),
  maxDepartureAirportDistanceKm: 150,
  preferredDepartureAirports: '',
  nonStopOnly: false,
  maxStops: 1
};

export default function FlightSearchShell() {
  const [result, setResult] = useState<FlightSearchResponse | null>(null);
  const [status, setStatus] = useState<RequestState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSearch, setLastSearch] = useState<FlightSearchRequest | null>(null);

  const handleSearch = async (payload: FlightSearchRequest) => {
    setStatus('loading');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/flight-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Search failed. Please try again.');
      }

      setResult(data as FlightSearchResponse);
      setStatus('success');
      setLastSearch(payload);
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
          defaultValues={defaultFormValues}
          onSubmit={handleSearch}
          loading={status === 'loading'}
        />
      </div>

      <div className="card min-h-[520px] p-6">
        <FlightResultsList
          itineraries={result?.itineraries ?? []}
          originAirports={result?.originAirportsConsidered ?? []}
          destinationAirports={result?.destinationAirportsConsidered ?? []}
          currency={result?.currency ?? 'USD'}
          loading={status === 'loading'}
          error={errorMessage}
          hasSearched={hasSearched}
          lastSearch={lastSearch}
        />
      </div>
    </div>
  );
}

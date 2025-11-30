'use client';

import { FormEvent, useState } from 'react';

import type { FlightSearchRequest, TripType } from '@/lib/shared/types/flights';

export interface FlightSearchFormValues {
  originInput: string;
  destinationInput: string;
  tripType: TripType;
  departureDate: string;
  returnDate?: string;
  maxDepartureAirportDistanceKm?: number;
  preferredDepartureAirports?: string;
  nonStopOnly?: boolean;
  maxStops?: number;
}

interface FlightSearchFormProps {
  defaultValues: FlightSearchFormValues;
  onSubmit: (params: FlightSearchRequest) => Promise<void> | void;
  loading?: boolean;
}

const tripOptions: { label: string; value: TripType }[] = [
  { label: 'Round trip', value: 'roundtrip' },
  { label: 'One way', value: 'oneway' }
];

const parsePreferredAirports = (value?: string) =>
  value
    ?.split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

export default function FlightSearchForm({ defaultValues, onSubmit, loading }: FlightSearchFormProps) {
  const [form, setForm] = useState<FlightSearchFormValues>(defaultValues);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const preferredDepartureAirports = parsePreferredAirports(form.preferredDepartureAirports);
    const payload: FlightSearchRequest = {
      origin: {
        city: form.originInput.trim() || undefined,
        airportCode: form.originInput.trim() || undefined
      },
      destination: {
        city: form.destinationInput.trim() || undefined,
        airportCode: form.destinationInput.trim() || undefined
      },
      tripType: form.tripType,
      departureDate: form.departureDate,
      returnDate: form.tripType === 'roundtrip' ? form.returnDate : undefined,
      maxDepartureAirportDistanceKm: form.maxDepartureAirportDistanceKm || undefined,
      preferredDepartureAirports: preferredDepartureAirports?.length
        ? preferredDepartureAirports
        : undefined,
      nonStopOnly: form.nonStopOnly,
      maxStops: form.maxStops !== undefined && form.maxStops !== null ? form.maxStops : undefined
    };

    await onSubmit(payload);
  };

  const disableReturn = form.tripType === 'oneway';

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Trip</p>
          <h2 className="text-xl font-semibold text-ink">Multi-airport search</h2>
        </div>
        <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          Flight cost only
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-1 text-sm font-semibold text-slate-700">
        {tripOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, tripType: option.value }))}
            className={`rounded-lg px-3 py-2 transition ${
              form.tripType === option.value
                ? 'bg-white shadow-sm ring-1 ring-accent text-ink'
                : 'text-slate-600 hover:bg-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Origin (city or airport)
          <input
            required
            name="origin"
            value={form.originInput}
            onChange={(e) => setForm((prev) => ({ ...prev, originInput: e.target.value }))}
            placeholder="SFO"
            className="w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-inner focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          Destination
          <input
            required
            name="destination"
            value={form.destinationInput}
            onChange={(e) => setForm((prev) => ({ ...prev, destinationInput: e.target.value }))}
            placeholder="LHR"
            className="w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-inner focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Departure date
          <input
            required
            type="date"
            name="departureDate"
            value={form.departureDate}
            onChange={(e) => setForm((prev) => ({ ...prev, departureDate: e.target.value }))}
            className="w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-inner focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          Return date
          <input
            type="date"
            name="returnDate"
            value={form.returnDate ?? ''}
            min={form.departureDate}
            disabled={disableReturn}
            onChange={(e) => setForm((prev) => ({ ...prev, returnDate: e.target.value || undefined }))}
            className="w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-inner focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Max distance for nearby airports (km)
          <input
            type="number"
            min={10}
            max={500}
            name="maxDepartureAirportDistanceKm"
            value={form.maxDepartureAirportDistanceKm ?? ''}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                maxDepartureAirportDistanceKm: e.target.value ? Number(e.target.value) : undefined
              }))
            }
            className="w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-inner focus:border-accent focus:ring-2 focus:ring-accent/30"
            placeholder="150"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          Preferred departure airports (IATA, comma separated)
          <input
            type="text"
            name="preferredDepartureAirports"
            value={form.preferredDepartureAirports ?? ''}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, preferredDepartureAirports: e.target.value }))
            }
            placeholder="SFO, OAK, SJC"
            className="w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-inner focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <p className="text-xs text-slate-500">Overrides the distance radius when provided.</p>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            name="nonStopOnly"
            checked={Boolean(form.nonStopOnly)}
            onChange={(e) => setForm((prev) => ({ ...prev, nonStopOnly: e.target.checked }))}
            className="h-5 w-5 rounded border-slate-300 text-accent focus:ring-accent/40"
          />
          Non-stop only
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          Max stops
          <input
            type="number"
            min={0}
            max={3}
            name="maxStops"
            value={form.maxStops ?? ''}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                maxStops: e.target.value === '' ? undefined : Number(e.target.value)
              }))
            }
            className="w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-inner focus:border-accent focus:ring-2 focus:ring-accent/30"
            placeholder="1"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-base font-semibold text-white shadow-lg shadow-ink/10 transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
        )}
        Search flights
      </button>

      <p className="text-xs text-slate-500">
        Prices shown are flight costs only; ground transport will be added in a later iteration.
      </p>
    </form>
  );
}

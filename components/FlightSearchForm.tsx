'use client';

import { FormEvent, useState } from 'react';

import type { CabinClass, FlightSearchParams } from '@/lib/types/duffel';

interface FlightSearchFormProps {
  defaultValues: FlightSearchParams;
  onSubmit: (params: FlightSearchParams) => Promise<void> | void;
  loading?: boolean;
}

const cabinClassOptions: { value: CabinClass; label: string }[] = [
  { value: 'economy', label: 'Economy' },
  { value: 'premium_economy', label: 'Premium Economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First' }
];

export default function FlightSearchForm({ defaultValues, onSubmit, loading }: FlightSearchFormProps) {
  const [form, setForm] = useState<FlightSearchParams>(defaultValues);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({ ...form, returnDate: form.returnDate || undefined });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Trip</p>
          <h2 className="text-xl font-semibold text-ink">Search flights</h2>
        </div>
        <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          Live Duffel
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Origin
          <input
            required
            name="origin"
            value={form.origin}
            onChange={(e) => setForm((prev) => ({ ...prev, origin: e.target.value.toUpperCase() }))}
            placeholder="SFO"
            className="w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-inner focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          Destination
          <input
            required
            name="destination"
            value={form.destination}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, destination: e.target.value.toUpperCase() }))
            }
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
          Return date (optional)
          <input
            type="date"
            name="returnDate"
            value={form.returnDate ?? ''}
            min={form.departureDate}
            onChange={(e) => setForm((prev) => ({ ...prev, returnDate: e.target.value || undefined }))}
            className="w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-inner focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Passengers
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={9}
              name="passengers"
              value={form.passengers}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, passengers: Number(e.target.value) || 1 }))
              }
              className="w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-inner focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, passengers: Math.max(prev.passengers - 1, 1) }))}
              className="h-10 w-10 rounded-full border border-slate-200 bg-white text-lg font-semibold text-slate-700 transition hover:border-accent hover:text-accent"
              aria-label="Decrease passengers"
            >
              -
            </button>
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({ ...prev, passengers: Math.min(prev.passengers + 1, 9) }))
              }
              className="h-10 w-10 rounded-full border border-slate-200 bg-white text-lg font-semibold text-slate-700 transition hover:border-accent hover:text-accent"
              aria-label="Increase passengers"
            >
              +
            </button>
          </div>
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          Cabin class
          <select
            name="cabinClass"
            value={form.cabinClass}
            onChange={(e) => setForm((prev) => ({ ...prev, cabinClass: e.target.value as CabinClass }))}
            className="w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-inner focus:border-accent focus:ring-2 focus:ring-accent/30"
          >
            {cabinClassOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-base font-semibold text-white shadow-lg shadow-ink/10 transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />} 
        Search flights
      </button>

      <p className="text-xs text-slate-500">
        We talk to Duffel from the server only. Your API key stays on the backend, never in the browser.
      </p>
    </form>
  );
}

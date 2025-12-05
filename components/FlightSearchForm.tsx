'use client';

import { FormEvent, useRef, useState } from 'react';

import { searchAirportSuggestions, type AirportSuggestion } from '@/lib/shared/airports/airportSuggestions';
import type { FlightSearchRequest, TripType } from '@/lib/shared/types/flights';

export interface FlightSearchFormValues {
  originInput: string;
  originAirportCode?: string;
  originLat?: number;
  originLon?: number;
  destinationInput: string;
  destinationAirportCode?: string;
  destinationLat?: number;
  destinationLon?: number;
  tripType: TripType;
  departureDate: string;
  returnDate?: string;
  nonStopOnly?: boolean;
  useNearbyAirports?: boolean;
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

export const NEARBY_AIRPORT_RADIUS_KM = 120;

const extractIataCode = (value?: string) => {
  if (!value) return undefined;
  const match = value.toUpperCase().match(/\b([A-Z]{3})\b/);
  return match ? match[1] : undefined;
};

export default function FlightSearchForm({ defaultValues, onSubmit, loading }: FlightSearchFormProps) {
  const [form, setForm] = useState<FlightSearchFormValues>(defaultValues);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [originSuggestions, setOriginSuggestions] = useState<AirportSuggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<AirportSuggestion[]>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const originBlurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destinationBlurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const forwardGeocodeCity = async (
    query: string
  ): Promise<{ lat: number; lon: number } | null> => {
    if (!query.trim()) return null;

    try {
      const response = await fetch(
        `https://geocode.maps.co/search?q=${encodeURIComponent(query)}&limit=1`
      );
      if (!response.ok) return null;
      const results = (await response.json()) as Array<{ lat?: string; lon?: string }>;
      const match = results?.[0];
      if (!match?.lat || !match?.lon) return null;
      const lat = Number(match.lat);
      const lon = Number(match.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return { lat, lon };
    } catch (error) {
      console.error('Forward geocoding failed', error);
      return null;
    }
  };

  const ensureCoordinates = async (input: string, lat?: number, lon?: number) => {
    if (lat !== undefined && lon !== undefined) return { lat, lon };
    if (!input.trim()) return { lat: undefined, lon: undefined };
    const geocoded = await forwardGeocodeCity(input);
    return geocoded ?? { lat: undefined, lon: undefined };
  };

  const handleSuggestionSelect = (field: 'origin' | 'destination', suggestion: AirportSuggestion) => {
    if (field === 'origin') {
      setForm((prev) => ({
        ...prev,
        originInput: suggestion.label,
        originAirportCode: suggestion.iata,
        originLat: suggestion.lat,
        originLon: suggestion.lon
      }));
      setShowOriginSuggestions(false);
    } else {
      setForm((prev) => ({
        ...prev,
        destinationInput: suggestion.label,
        destinationAirportCode: suggestion.iata,
        destinationLat: suggestion.lat,
        destinationLon: suggestion.lon
      }));
      setShowDestinationSuggestions(false);
    }
  };

  const updateSuggestions = (field: 'origin' | 'destination', value: string) => {
    const results = searchAirportSuggestions(value);
    if (field === 'origin') {
      setOriginSuggestions(results);
      setShowOriginSuggestions(results.length > 0);
    } else {
      setDestinationSuggestions(results);
      setShowDestinationSuggestions(results.length > 0);
    }
  };

  const handleBlurWithDelay = (field: 'origin' | 'destination') => {
    const ref = field === 'origin' ? originBlurTimeout : destinationBlurTimeout;
    const setter = field === 'origin' ? setShowOriginSuggestions : setShowDestinationSuggestions;
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(() => setter(false), 120);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const originCoords = await ensureCoordinates(form.originInput, form.originLat, form.originLon);
    const destinationCoords = await ensureCoordinates(
      form.destinationInput,
      form.destinationLat,
      form.destinationLon
    );

    const originAirportCode = form.originAirportCode ?? extractIataCode(form.originInput);
    const destinationAirportCode =
      form.destinationAirportCode ?? extractIataCode(form.destinationInput);

    const payload: FlightSearchRequest = {
      origin: {
        city: form.originInput.trim() || undefined,
        airportCode: originAirportCode,
        lat: originCoords.lat,
        lon: originCoords.lon
      },
      destination: {
        city: form.destinationInput.trim() || undefined,
        airportCode: destinationAirportCode,
        lat: destinationCoords.lat,
        lon: destinationCoords.lon
      },
      tripType: form.tripType,
      departureDate: form.departureDate,
      returnDate: form.tripType === 'roundtrip' ? form.returnDate : undefined,
      includeNearbyAirports: form.useNearbyAirports,
      maxDepartureAirportDistanceKm: form.useNearbyAirports ? NEARBY_AIRPORT_RADIUS_KM : undefined,
      maxArrivalAirportDistanceKm: form.useNearbyAirports ? NEARBY_AIRPORT_RADIUS_KM : undefined,
      nonStopOnly: form.nonStopOnly
    };

    await onSubmit(payload);
  };

  const disableReturn = form.tripType === 'oneway';
  const reverseGeocodeCity = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
      );
      if (!response.ok) return null;
      const data = (await response.json()) as Record<string, any>;
      const city =
        data.city ||
        data.locality ||
        data.localityInfo?.locality?.name ||
        data.localityInfo?.administrative?.[0]?.name;
      const region = data.principalSubdivision || data.countryName;
      const label = [city, region].filter(Boolean).join(', ');
      return label || null;
    } catch (error) {
      console.error('Reverse geocoding failed', error);
      return null;
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }

    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const resolvedLabel = await reverseGeocodeCity(latitude, longitude);
        setForm((prev) => ({
          ...prev,
          originInput: resolvedLabel || 'Current location',
          originAirportCode: undefined,
          originLat: latitude,
          originLon: longitude
        }));
        setOriginSuggestions([]);
        setShowOriginSuggestions(false);
        setLocating(false);
      },
      () => {
        setLocationError('Unable to fetch your location. Please enter your origin manually.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit} aria-label="Flight search form">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Trip</p>
          <h2 className="text-xl font-semibold text-ink">Meta Search</h2>
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

      <div className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
          <label className="flex-1 space-y-2 text-sm font-medium text-slate-700">
            Origin (city or airport)
            <div className="relative flex-1">
              <input
                required
                name="origin"
                value={form.originInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    originInput: value,
                    originLat: undefined,
                    originLon: undefined,
                    originAirportCode: undefined
                  }));
                  updateSuggestions('origin', value);
                }}
                onFocus={() => updateSuggestions('origin', form.originInput)}
                onBlur={() => handleBlurWithDelay('origin')}
                placeholder="SFO"
                aria-autocomplete="list"
                aria-expanded={showOriginSuggestions}
                className="w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2.5 pr-12 text-slate-900 shadow-inner focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locating}
                className="absolute inset-y-0 right-2 my-auto inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Use my location"
              >
                {locating ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path d="M12 3a1 1 0 0 1 1 1v1.07a7.002 7.002 0 0 1 5.93 5.93H20a1 1 0 1 1 0 2h-1.07a7.002 7.002 0 0 1-5.93 5.93V20a1 1 0 1 1-2 0v-1.07a7.002 7.002 0 0 1-5.93-5.93H4a1 1 0 1 1 0-2h1.07a7.002 7.002 0 0 1 5.93-5.93V4a1 1 0 0 1 1-1zm0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
                  </svg>
                )}
              </button>
              {showOriginSuggestions && originSuggestions.length > 0 && (
                <SuggestionList
                  suggestions={originSuggestions}
                  onSelect={(suggestion) => handleSuggestionSelect('origin', suggestion)}
                  onMouseDown={() => {
                    if (originBlurTimeout.current) clearTimeout(originBlurTimeout.current);
                  }}
                />
              )}
            </div>
            {locationError && <p className="text-xs text-red-600">{locationError}</p>}
          </label>

          <label className="flex-1 space-y-2 text-sm font-medium text-slate-700">
            Destination
            <input
              required
              name="destination"
              value={form.destinationInput}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  destinationInput: value,
                  destinationLat: undefined,
                  destinationLon: undefined,
                  destinationAirportCode: undefined
                }));
                updateSuggestions('destination', value);
              }}
              onFocus={() => updateSuggestions('destination', form.destinationInput)}
              onBlur={() => handleBlurWithDelay('destination')}
              placeholder="DFW"
              aria-autocomplete="list"
              aria-expanded={showDestinationSuggestions}
              className="w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2.5 pr-12 text-slate-900 shadow-inner focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            {showDestinationSuggestions && destinationSuggestions.length > 0 && (
              <SuggestionList
                suggestions={destinationSuggestions}
                onSelect={(suggestion) => handleSuggestionSelect('destination', suggestion)}
                onMouseDown={() => {
                  if (destinationBlurTimeout.current) clearTimeout(destinationBlurTimeout.current);
                }}
              />
            )}
          </label>

          <label className="flex-1 space-y-2 text-sm font-medium text-slate-700">
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

          <label className="flex-1 space-y-2 text-sm font-medium text-slate-700">
            Return date
            <input
              type="date"
              name="returnDate"
              value={form.returnDate ?? ''}
              min={form.departureDate}
              disabled={disableReturn}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, returnDate: e.target.value || undefined }))
              }
              className="w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-inner focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-base font-semibold text-white shadow-lg shadow-ink/10 transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto lg:min-w-[160px]"
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
            )}
            Search flights
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <label className="inline-flex items-center gap-3 font-medium">
              <input
                type="checkbox"
                name="useNearbyAirports"
                checked={Boolean(form.useNearbyAirports)}
                onChange={(e) => setForm((prev) => ({ ...prev, useNearbyAirports: e.target.checked }))}
                className="h-5 w-5 rounded border-slate-300 text-accent focus:ring-accent/40"
              />
              I&apos;m willing to drive to/from a nearby airport for a better deal
            </label>

            <label className="inline-flex items-center gap-3 font-medium">
              <input
                type="checkbox"
                name="nonStopOnly"
                checked={Boolean(form.nonStopOnly)}
                onChange={(e) => setForm((prev) => ({ ...prev, nonStopOnly: e.target.checked }))}
                className="h-5 w-5 rounded border-slate-300 text-accent focus:ring-accent/40"
              />
              Non-stop only
            </label>
          </div>
          <p className="text-xs text-slate-500">
            Nearby search radius: {NEARBY_AIRPORT_RADIUS_KM}km
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Prices shown are flight costs only; ground transport will be added in a later iteration.
      </p>
    </form>
  );
}

function SuggestionList({
  suggestions,
  onSelect,
  onMouseDown
}: {
  suggestions: AirportSuggestion[];
  onSelect: (suggestion: AirportSuggestion) => void;
  onMouseDown?: () => void;
}) {
  return (
    <ul
      role="listbox"
      onMouseDown={onMouseDown}
      className="absolute left-0 right-0 z-20 mt-2 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg ring-1 ring-black/5"
    >
      {suggestions.map((suggestion) => (
        <li key={suggestion.iata}>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-slate-50"
            onClick={() => onSelect(suggestion)}
          >
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-ink">{suggestion.label}</span>
              <span className="text-xs text-slate-500">
                {suggestion.description ?? 'Airport'}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                {suggestion.iata}
              </span>
              {suggestion.badge && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-accent">
                  {suggestion.badge}
                </span>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

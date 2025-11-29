import { Fragment } from 'react';

import type { FlightOffer, FlightSearchParams } from '@/lib/types/duffel';

interface FlightResultsListProps {
  offers: FlightOffer[];
  loading?: boolean;
  error?: string | null;
  hasSearched?: boolean;
  lastSearch: FlightSearchParams | null;
}

const formatCurrency = (value: string, currency: string) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return `${value} ${currency}`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!minutes) return 'N/A';
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export default function FlightResultsList({
  offers,
  loading = false,
  error,
  hasSearched,
  lastSearch
}: FlightResultsListProps) {
  if (loading) {
    return (
      <div className="space-y-4" aria-live="polite">
        <ResultSkeleton />
        <ResultSkeleton />
        <ResultSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <div className="h-12 w-12 rounded-full bg-red-100 text-red-500">
          <div className="flex h-full items-center justify-center text-2xl">!</div>
        </div>
        <div>
          <p className="text-lg font-semibold text-red-600">We hit a snag</p>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!offers.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-600">
        <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400">
          <div className="flex h-full items-center justify-center text-xl">Fly</div>
        </div>
        <div>
          <p className="text-lg font-semibold text-ink">
            {hasSearched ? 'No flights found yet.' : 'Ready when you are.'}
          </p>
          <p className="text-sm text-slate-600">
            {hasSearched
              ? 'Try adjusting dates, passengers, or cabin class to see more options.'
              : 'Enter your route and dates to start exploring fares.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
            <div>
              Showing <span className="font-semibold text-ink">{offers.length}</span> option
              {offers.length === 1 ? '' : 's'}
            </div>
            {lastSearch && (
              <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-700">
                {lastSearch.origin} -> {lastSearch.destination}
                {lastSearch.returnDate ? ' (round trip)' : ' (one way)'}
              </div>
            )}
          </div>

      {offers.map((offer) => (
        <article
          key={offer.id}
          className="rounded-xl border border-slate-100 bg-white/80 p-5 shadow-sm ring-1 ring-transparent transition hover:-translate-y-0.5 hover:shadow-md hover:ring-accent/20"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Total</p>
              <p className="text-2xl font-semibold text-ink">{formatCurrency(offer.totalPrice, offer.currency)}</p>
              <p className="text-sm text-slate-500">
                {offer.cabinClass.replace('_', ' ')} |{' '}
                {offer.numberOfStops === 0
                  ? 'Nonstop'
                  : `${offer.numberOfStops} stop${offer.numberOfStops > 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="text-right text-sm text-slate-500">
              Total duration
              <div className="text-lg font-semibold text-ink">{formatDuration(offer.totalDurationMinutes)}</div>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {offer.slices.map((slice, sliceIndex) => (
              <div key={sliceIndex} className="rounded-lg bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span className="font-semibold text-slate-700">
                    {sliceIndex === 0 ? 'Outbound' : 'Return'}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {formatDuration(slice.durationMinutes)}
                  </span>
                </div>

                <div className="mt-3 space-y-3">
                  {slice.segments.map((segment, segmentIndex) => (
                    <Fragment key={segment.id}>
                      <div className="grid grid-cols-[auto_1fr] items-start gap-3">
                        <div className="flex h-full flex-col items-center">
                          <span className="h-3 w-3 rounded-full bg-accent" />
                          <span className="h-full w-px bg-slate-200" />
                          <span className="h-3 w-3 rounded-full bg-ink" />
                        </div>
                        <div className="space-y-1 text-sm text-slate-700">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-ink">{segment.departureAirport}</div>
                              <div className="text-xs text-slate-500">{formatDateTime(segment.departureTime)}</div>
                            </div>
                            <div className="text-xs uppercase tracking-[0.15em] text-slate-400">{formatDuration(segment.durationMinutes)}</div>
                            <div className="text-right">
                              <div className="font-semibold text-ink">{segment.arrivalAirport}</div>
                              <div className="text-xs text-slate-500">{formatDateTime(segment.arrivalTime)}</div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            {segment.marketingCarrier && <span className="rounded-full bg-white px-2 py-1">{segment.marketingCarrier}</span>}
                            {segment.operatingCarrier && segment.operatingCarrier !== segment.marketingCarrier && (
                              <span className="rounded-full bg-white px-2 py-1">Operated by {segment.operatingCarrier}</span>
                            )}
                            {segment.aircraft && <span className="rounded-full bg-white px-2 py-1">{segment.aircraft}</span>}
                          </div>
                        </div>
                      </div>
                      {segmentIndex < slice.segments.length - 1 && (
                        <div className="ml-6 text-xs text-slate-500">Layover</div>
                      )}
                    </Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="animate-pulse space-y-4 rounded-xl border border-slate-100 bg-white/60 p-5">
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 rounded bg-slate-200" />
        <div className="h-5 w-20 rounded bg-slate-200" />
      </div>
      <div className="h-4 w-full rounded bg-slate-200" />
      <div className="h-4 w-3/4 rounded bg-slate-200" />
    </div>
  );
}

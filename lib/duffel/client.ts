import {
  CabinClass,
  DuffelOfferResponse,
  FlightOffer,
  FlightSearchParams,
  FlightSegment,
  FlightSlice
} from '@/lib/types/duffel';

const DEFAULT_BASE_URL = process.env.DUFFEL_API_BASE_URL ?? 'https://api.duffel.com';
const DUFFEL_API_VERSION = process.env.DUFFEL_API_VERSION ?? 'v2';

type SearchPayload = {
  data: {
    slices: { origin: string; destination: string; departure_date: string }[];
    passengers: { type: 'adult' }[];
    cabin_class: CabinClass;
  };
};

const parseISODurationToMinutes = (duration?: string | null): number => {
  if (!duration) return 0;
  const match = duration.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, days, hours, minutes, seconds] = match.map((value) => Number(value) || 0);
  return days * 24 * 60 + hours * 60 + minutes + Math.round(seconds / 60);
};

const minutesBetween = (start: string, end: string): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.max(Math.round(diffMs / (1000 * 60)), 0);
};

const buildSearchPayload = (params: FlightSearchParams): SearchPayload => {
  const slices = [
    {
      origin: params.origin,
      destination: params.destination,
      departure_date: params.departureDate
    }
  ];

  if (params.returnDate) {
    slices.push({
      origin: params.destination,
      destination: params.origin,
      departure_date: params.returnDate
    });
  }

  const passengers = Array.from({ length: params.passengers }, () => ({
    type: 'adult' as const
  }));

  return {
    data: {
      slices,
      passengers,
      cabin_class: params.cabinClass
    }
  };
};

const normalizeSegment = (
  segment: DuffelOfferResponse['slices'][number]['segments'][number]
): FlightSegment => {
  const durationMinutes =
    parseISODurationToMinutes(segment.duration) || minutesBetween(segment.departing_at, segment.arriving_at);

  return {
    id: segment.id,
    departureAirport: segment.origin.iata_code,
    departureTime: segment.departing_at,
    arrivalAirport: segment.destination.iata_code,
    arrivalTime: segment.arriving_at,
    durationMinutes,
    marketingCarrier: segment.marketing_carrier?.name || segment.marketing_carrier?.iata_code,
    operatingCarrier: segment.operating_carrier?.name || segment.operating_carrier?.iata_code,
    aircraft: segment.aircraft?.name || segment.aircraft?.manufacturer || undefined
  };
};

const normalizeSlice = (slice: DuffelOfferResponse['slices'][number]): FlightSlice => {
  const segments = slice.segments?.map(normalizeSegment) ?? [];
  const durationFromIso = parseISODurationToMinutes(slice.duration);

  const durationMinutes = durationFromIso
    ? durationFromIso
    : segments.length > 0
    ? minutesBetween(segments[0].departureTime, segments[segments.length - 1].arrivalTime)
    : 0;

  return {
    durationMinutes,
    segments
  };
};

export class DuffelClient {
  private apiKey: string;
  private baseUrl: string;
  private apiVersion: string;

  constructor({
    apiKey = process.env.DUFFEL_API_KEY,
    baseUrl = DEFAULT_BASE_URL,
    apiVersion = DUFFEL_API_VERSION
  }: { apiKey?: string; baseUrl?: string; apiVersion?: string } = {}) {
    if (!apiKey) {
      throw new Error('DUFFEL_API_KEY is not set. Add it to your environment to enable searches.');
    }

    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.apiVersion = apiVersion;
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
    const payload = buildSearchPayload(params);

    const response = await fetch(`${this.baseUrl}/air/offer_requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        Authorization: `Bearer ${this.apiKey}`,
        'Duffel-Version': this.apiVersion
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      try {
        const parsed = JSON.parse(errorText);
        const unsupported = parsed?.errors?.find?.((err: { code?: string }) => err.code === 'unsupported_version');
        if (unsupported) {
          throw new Error(
            `Duffel API version "${this.apiVersion}" is unsupported. Set DUFFEL_API_VERSION=v2 (or a supported value) and retry.`
          );
        }
      } catch {
        // ignore parse issues and fall through
      }
      throw new Error(`Duffel API responded with ${response.status}: ${errorText}`);
    }

    const json = await response.json();
    const offers: DuffelOfferResponse[] = json?.data?.offers ?? json?.data ?? [];

    if (!Array.isArray(offers)) {
      throw new Error('Unexpected Duffel API response shape.');
    }

    return offers.map((offer) => {
      const slices = offer.slices?.map(normalizeSlice) ?? [];
      const totalDurationMinutes = slices.reduce((total, slice) => total + slice.durationMinutes, 0);
      const numberOfStops = slices.reduce(
        (total, slice) => total + Math.max(slice.segments.length - 1, 0),
        0
      );

      const normalizedOffer: FlightOffer = {
        id: offer.id,
        totalPrice: offer.total_amount,
        currency: offer.total_currency,
        slices,
        totalDurationMinutes,
        numberOfStops,
        cabinClass: params.cabinClass
      };

      return normalizedOffer;
    });
  }
}

export const searchFlights = async (params: FlightSearchParams) => {
  const client = new DuffelClient();
  return client.searchFlights(params);
};

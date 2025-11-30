import type { Airport, FlightLeg, FlightSearchRequest, Itinerary } from '@/lib/shared/types/flights';
import { findAirportsByCodes, resolveDestinationAirports, getAirportDataset } from '@/lib/server/airports/airportService';
import type { DuffelOfferResponse, DuffelSegmentResponse, DuffelSegmentPassenger } from '@/lib/types/duffel';

import type { FlightSearchProvider } from './flightSearchProvider';

const DEFAULT_BASE_URL = process.env.DUFFEL_API_BASE_URL ?? 'https://api.duffel.com';
const DEFAULT_API_VERSION = process.env.DUFFEL_API_VERSION ?? 'v2';

type OfferRequestPayload = {
  data: {
    slices: { origin: string; destination: string; departure_date: string }[];
    passengers: { type: 'adult' }[];
    cabin_class: 'economy';
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

export class DuffelFlightSearchProvider implements FlightSearchProvider {
  private apiKey: string;
  private baseUrl: string;
  private apiVersion: string;

  constructor({
    apiKey = process.env.DUFFEL_API_KEY,
    baseUrl = DEFAULT_BASE_URL,
    apiVersion = DEFAULT_API_VERSION
  }: { apiKey?: string; baseUrl?: string; apiVersion?: string } = {}) {
    // DUFFEL_API_KEY must be set in your environment (e.g. .env) for live Duffel searches.
    if (!apiKey) {
      throw new Error('DUFFEL_API_KEY is not set. Add it to your environment to enable Duffel searches.');
    }

    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.apiVersion = apiVersion;
  }

  async searchFlights(
    request: FlightSearchRequest & { departureAirportCodes: string[] }
  ): Promise<Itinerary[]> {
    const destinationAirports = resolveDestinationAirports(request.destination);
    const destinationAirport = destinationAirports[0];
    if (!destinationAirport) return [];

    const departures = findAirportsByCodes(request.departureAirportCodes);
    if (!departures.length) return [];

    const airportLookup = this.buildAirportLookup();

    const searches = departures.map((origin) =>
      this.searchFromOrigin(origin.iata, destinationAirport.iata, request)
    );

    const offerResults = await Promise.all(searches);
    const itineraries = offerResults
      .flat()
      .map((offer) => this.normalizeOffer(offer, airportLookup))
      .filter((itinerary): itinerary is Itinerary => Boolean(itinerary));

    return itineraries.filter((itinerary) => {
      if (request.nonStopOnly) return itinerary.numberOfStops === 0;
      if (request.maxStops !== undefined) return itinerary.numberOfStops <= request.maxStops;
      return true;
    });
  }

  private async searchFromOrigin(
    origin: string,
    destination: string,
    request: FlightSearchRequest
  ): Promise<DuffelOfferResponse[]> {
    const payload = this.buildOfferRequestPayload(origin, destination, request);

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
      // Highlight unsupported version errors so operators know to bump DUFFEL_API_VERSION.
      try {
        const parsed = JSON.parse(errorText);
        const unsupported = parsed?.errors?.find?.((err: { code?: string }) => err.code === 'unsupported_version');
        if (unsupported) {
          throw new Error(
            `Duffel API version "${this.apiVersion}" is unsupported. Set DUFFEL_API_VERSION=v2 (or a supported value) and retry.`
          );
        }
      } catch {
        // fall through to generic error
      }
      throw new Error(`Duffel API responded with ${response.status}: ${errorText}`);
    }

    const json = await response.json();
    const offers: DuffelOfferResponse[] = json?.data?.offers ?? json?.data ?? [];

    if (!Array.isArray(offers)) {
      throw new Error('Unexpected Duffel API response shape.');
    }

    return offers;
  }

  private buildOfferRequestPayload(
    origin: string,
    destination: string,
    request: FlightSearchRequest
  ): OfferRequestPayload {
    const slices: OfferRequestPayload['data']['slices'] = [
      {
        origin,
        destination,
        departure_date: request.departureDate
      }
    ];

    return {
      data: {
        slices,
        passengers: [{ type: 'adult' }],
        cabin_class: 'economy'
      }
    };
  }

  private buildAirportLookup(): Record<string, Airport> {
    return getAirportDataset().reduce<Record<string, Airport>>((acc, airport) => {
      acc[airport.iata.toUpperCase()] = airport;
      return acc;
    }, {});
  }

  private normalizeOffer(
    offer: DuffelOfferResponse,
    airportLookup: Record<string, Airport>
  ): Itinerary | null {
    const legs: FlightLeg[] = [];
    const availableSeats = offer.available_seats ?? undefined;

    offer.slices.forEach((slice) => {
      slice.segments.forEach((segment) => {
        const originAirport = this.lookupAirport(segment.origin, airportLookup);
        const destinationAirport = this.lookupAirport(segment.destination, airportLookup);
        if (!originAirport || !destinationAirport) return;

        const durationMinutes =
          parseISODurationToMinutes(segment.duration) ||
          minutesBetween(segment.departing_at, segment.arriving_at);

        const passengerDetails: DuffelSegmentPassenger | undefined = segment.passengers?.[0] ?? undefined;
        const baggageAllowance = passengerDetails?.baggage_allowances;

        legs.push({
          originAirport,
          destinationAirport,
          departureTimeLocal: segment.departing_at,
          arrivalTimeLocal: segment.arriving_at,
          airlineCode: segment.marketing_carrier?.iata_code || segment.marketing_carrier?.name || 'N/A',
          airlineName: segment.marketing_carrier?.name || undefined,
          operatingAirlineCode:
            segment.operating_carrier?.iata_code || segment.operating_carrier?.name || undefined,
          operatingAirlineName: segment.operating_carrier?.name || undefined,
          flightNumber: segment.id,
          durationMinutes,
          aircraftTypeCode: segment.aircraft?.iata_code || segment.aircraft?.icao_code || undefined,
          aircraftTypeName: segment.aircraft?.name || segment.aircraft?.manufacturer || undefined,
          cabinClass:
            segment.cabin_class || passengerDetails?.cabin_class || passengerDetails?.cabin_class_marketing_name || undefined,
          fareClass: segment.fare_basis_code || passengerDetails?.fare_basis_code || undefined,
          availableSeats: availableSeats ?? undefined,
          includedCheckedBags: baggageAllowance?.checked
            ? {
                quantity:
                  baggageAllowance.checked.quantity === null
                    ? undefined
                    : baggageAllowance.checked.quantity ?? undefined,
                weightKg: baggageAllowance.checked.weight_kg ?? undefined
              }
            : null,
          includedCabinBags: baggageAllowance?.cabin
            ? {
                quantity:
                  baggageAllowance.cabin.quantity === null ? undefined : baggageAllowance.cabin.quantity ?? undefined,
                weightKg: baggageAllowance.cabin.weight_kg ?? undefined
              }
            : null
        });
      });
    });

    if (!legs.length) return null;

    const totalDurationMinutes = offer.slices.reduce((total, slice) => {
      const sliceDuration =
        parseISODurationToMinutes(slice.duration) ||
        (slice.segments.length
          ? minutesBetween(slice.segments[0].departing_at, slice.segments[slice.segments.length - 1].arriving_at)
          : 0);
      return total + sliceDuration;
    }, 0);

    const numberOfStops = offer.slices.reduce(
      (total, slice) => total + Math.max(slice.segments.length - 1, 0),
      0
    );

    const totalPrice = Number(offer.total_amount);

    const mainMarketing = legs[0];
    const fareBrandName =
      offer.conditions?.fare_brand_name ??
      legs[0]?.cabinClass?.toString() ??
      legs[0]?.airlineCode ??
      undefined;

    const isChangeable = offer.conditions?.change_before_departure?.allowed ?? undefined;
    const isRefundable = offer.conditions?.refund_before_departure?.allowed ?? undefined;
    const changePenaltyAmount = offer.conditions?.change_before_departure?.penalty_amount
      ? Number(offer.conditions.change_before_departure.penalty_amount)
      : null;
    const refundPenaltyAmount = offer.conditions?.refund_before_departure?.penalty_amount
      ? Number(offer.conditions.refund_before_departure.penalty_amount)
      : null;

    const fareRestrictionsSummary = this.summarizeRestrictions({
      isChangeable,
      isRefundable,
      changePenaltyAmount,
      refundPenaltyAmount
    });

    return {
      id: `duffel-${offer.id}`,
      legs,
      totalDurationMinutes,
      totalPrice: Number.isFinite(totalPrice) ? totalPrice : 0,
      currency: offer.total_currency,
      numberOfStops,
      departureAirport: legs[0].originAirport,
      arrivalAirport: legs[legs.length - 1].destinationAirport,
      provider: 'duffel',
      fareBrandName,
      isRefundable,
      isChangeable,
      changePenaltyAmount,
      refundPenaltyAmount,
      fareRestrictionsSummary,
      mainMarketingAirlineCode: mainMarketing?.airlineCode,
      mainMarketingAirlineName: mainMarketing?.airlineName
    };
  }

  private summarizeRestrictions({
    isChangeable,
    isRefundable,
    changePenaltyAmount,
    refundPenaltyAmount
  }: {
    isChangeable?: boolean;
    isRefundable?: boolean;
    changePenaltyAmount?: number | null;
    refundPenaltyAmount?: number | null;
  }): string | undefined {
    const parts: string[] = [];
    if (isRefundable !== undefined) {
      if (isRefundable) {
        parts.push(
          refundPenaltyAmount && refundPenaltyAmount > 0
            ? `Refundable (fee ${refundPenaltyAmount})`
            : 'Refundable'
        );
      } else {
        parts.push('Non-refundable');
      }
    }

    if (isChangeable !== undefined) {
      if (isChangeable) {
        parts.push(
          changePenaltyAmount && changePenaltyAmount > 0
            ? `Changes allowed (fee ${changePenaltyAmount})`
            : 'Changes allowed'
        );
      } else {
        parts.push('No changes');
      }
    }

    if (!parts.length) return undefined;
    return parts.join(', ');
  }

  private lookupAirport(
    airport: DuffelSegmentResponse['origin'] | DuffelSegmentResponse['destination'],
    airportLookup: Record<string, Airport>
  ): Airport | null {
    const code = airport.iata_code?.toUpperCase();
    if (!code) return null;
    const fromDataset = airportLookup[code];
    if (fromDataset) return fromDataset;

    // Fallback for rare cases not covered by the static dataset.
    return {
      id: code,
      iata: code,
      name: airport.name ?? code,
      city: airport.name ?? code,
      country: 'Unknown',
      lat: 0,
      lon: 0
    };
  }
}

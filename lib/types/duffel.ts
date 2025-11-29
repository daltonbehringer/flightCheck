export type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first';

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: CabinClass;
}

export interface FlightSegment {
  id: string;
  departureAirport: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalTime: string;
  durationMinutes: number;
  marketingCarrier?: string;
  operatingCarrier?: string;
  aircraft?: string;
}

export interface FlightSlice {
  durationMinutes: number;
  segments: FlightSegment[];
}

export interface FlightOffer {
  id: string;
  totalPrice: string;
  currency: string;
  slices: FlightSlice[];
  totalDurationMinutes: number;
  numberOfStops: number;
  cabinClass: CabinClass;
}

export interface DuffelOfferResponse {
  id: string;
  total_amount: string;
  total_currency: string;
  slices: DuffelSliceResponse[];
}

export interface DuffelSliceResponse {
  duration?: string | null;
  segments: DuffelSegmentResponse[];
}

export interface DuffelSegmentResponse {
  id: string;
  origin: DuffelAirport;
  destination: DuffelAirport;
  marketing_carrier: DuffelCarrier;
  operating_carrier?: DuffelCarrier | null;
  departing_at: string;
  arriving_at: string;
  duration?: string | null;
  aircraft?: {
    name?: string | null;
    manufacturer?: string | null;
  } | null;
}

export interface DuffelAirport {
  iata_code: string;
  name?: string;
}

export interface DuffelCarrier {
  name?: string;
  iata_code?: string;
}

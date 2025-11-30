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
  fareBrandName?: string;
  isRefundable?: boolean;
  isChangeable?: boolean;
  changePenaltyAmount?: number | null;
  refundPenaltyAmount?: number | null;
}

export interface DuffelOfferResponse {
  id: string;
  total_amount: string;
  total_currency: string;
  available_seats?: number | null;
  conditions?: {
    change_before_departure?: {
      allowed?: boolean | null;
      penalty_amount?: string | null;
      penalty_currency?: string | null;
    } | null;
    refund_before_departure?: {
      allowed?: boolean | null;
      penalty_amount?: string | null;
      penalty_currency?: string | null;
    } | null;
    fare_brand_name?: string | null;
  } | null;
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
    iata_code?: string | null;
    icao_code?: string | null;
    name?: string | null;
    manufacturer?: string | null;
  } | null;
  cabin_class?: CabinClass | string | null;
  cabin_class_marketing_name?: string | null;
  fare_basis_code?: string | null;
  passengers?: DuffelSegmentPassenger[] | null;
}

export interface DuffelAirport {
  iata_code: string;
  name?: string;
}

export interface DuffelCarrier {
  name?: string;
  iata_code?: string;
}

export interface DuffelSegmentPassenger {
  cabin_class?: CabinClass | string | null;
  cabin_class_marketing_name?: string | null;
  fare_basis_code?: string | null;
  baggage_allowances?: {
    cabin?: {
      quantity?: number | null;
      weight_kg?: number | null;
    } | null;
    checked?: {
      quantity?: number | null;
      weight_kg?: number | null;
    } | null;
  } | null;
}

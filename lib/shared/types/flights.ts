export interface Airport {
  id: string;
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  distanceFromOriginKm?: number;
}

export interface FlightLeg {
  originAirport: Airport;
  destinationAirport: Airport;
  departureTimeLocal: string;
  arrivalTimeLocal: string;
  airlineCode: string;
  flightNumber: string;
  durationMinutes: number;
}

export interface Itinerary {
  id: string;
  legs: FlightLeg[];
  totalDurationMinutes: number;
  totalPrice: number;
  currency: string;
  numberOfStops: number;
  departureAirport: Airport;
  arrivalAirport: Airport;
  bookingUrl?: string;
  provider?: string;
}

export type TripType = 'oneway' | 'roundtrip';

export interface FlightSearchRequest {
  origin: { city?: string; airportCode?: string; lat?: number; lon?: number };
  destination: { city?: string; airportCode?: string };
  tripType: TripType;
  departureDate: string;
  returnDate?: string;
  maxDepartureAirportDistanceKm?: number;
  preferredDepartureAirports?: string[];
  nonStopOnly?: boolean;
  maxStops?: number;
}

export interface FlightSearchResponse {
  itineraries: Itinerary[];
  originAirportsConsidered: Airport[];
  destinationAirportsConsidered: Airport[];
  currency: string;
}

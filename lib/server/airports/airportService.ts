import airportsData from './data/airports.json';

import type { Airport, FlightSearchRequest } from '@/lib/shared/types/flights';

const DEFAULT_MAX_DISTANCE_KM = Number(process.env.DEFAULT_AIRPORT_RADIUS_KM ?? 150);
const EARTH_RADIUS_KM = 6371;

const airports: Airport[] = airportsData;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const haversineDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

export const getAirportDataset = () => airports;

export const findAirportsByCodes = (codes: string[]): Airport[] => {
  const normalized = codes.map((code) => code.trim().toUpperCase());
  return airports.filter((airport) => normalized.includes(airport.iata.toUpperCase()));
};

const findAirportsByCity = (city?: string) => {
  if (!city) return [];
  const normalized = city.trim().toLowerCase();
  return airports.filter((airport) => airport.city.toLowerCase() === normalized);
};

const findAirportByCode = (code?: string) => {
  if (!code) return undefined;
  const normalized = code.trim().toUpperCase();
  return airports.find((airport) => airport.iata.toUpperCase() === normalized);
};

const resolveReferencePoint = (origin: FlightSearchRequest['origin']): { lat: number; lon: number } | null => {
  if (origin.lat !== undefined && origin.lon !== undefined) {
    return { lat: origin.lat, lon: origin.lon };
  }

  const airport = findAirportByCode(origin.airportCode);
  if (airport) return { lat: airport.lat, lon: airport.lon };

  const cityAirports = findAirportsByCity(origin.city);
  if (cityAirports.length) {
    const avgLat = cityAirports.reduce((sum, airport) => sum + airport.lat, 0) / cityAirports.length;
    const avgLon = cityAirports.reduce((sum, airport) => sum + airport.lon, 0) / cityAirports.length;
    return { lat: avgLat, lon: avgLon };
  }

  return null;
};

export const resolveDestinationAirports = (
  destination: FlightSearchRequest['destination']
): Airport[] => {
  const byCode = destination.airportCode ? findAirportsByCodes([destination.airportCode]) : [];
  if (byCode.length) return byCode;

  const byCity = destination.city ? findAirportsByCity(destination.city) : [];
  return byCity;
};

export const resolveDepartureAirports = (
  request: FlightSearchRequest
): { candidates: Airport[]; usedRadiusKm: number } => {
  const preferred = request.preferredDepartureAirports?.length
    ? findAirportsByCodes(request.preferredDepartureAirports)
    : [];

  if (preferred.length) {
    return { candidates: preferred, usedRadiusKm: 0 };
  }

  const reference = resolveReferencePoint(request.origin);
  const maxDistance = request.maxDepartureAirportDistanceKm ?? DEFAULT_MAX_DISTANCE_KM;

  if (!reference) {
    const cityAirports = findAirportsByCity(request.origin.city);
    return { candidates: cityAirports, usedRadiusKm: 0 };
  }

  const candidates = airports
    .map((airport) => {
      const distanceFromOriginKm = haversineDistanceKm(
        reference.lat,
        reference.lon,
        airport.lat,
        airport.lon
      );
      return { ...airport, distanceFromOriginKm } as Airport;
    })
    .filter((airport) => airport.distanceFromOriginKm !== undefined && airport.distanceFromOriginKm <= maxDistance)
    .sort((a, b) => (a.distanceFromOriginKm ?? 0) - (b.distanceFromOriginKm ?? 0));

  return { candidates, usedRadiusKm: maxDistance };
};

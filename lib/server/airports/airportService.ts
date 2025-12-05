import airportsData from './data/airports.json';

import type { Airport, FlightSearchLocation, FlightSearchRequest } from '@/lib/shared/types/flights';

const DEFAULT_MAX_DISTANCE_KM = Number(process.env.DEFAULT_AIRPORT_RADIUS_KM ?? 150);
const EARTH_RADIUS_KM = 6371;

const airports: Airport[] = airportsData.map((airport, idx) => ({
  id: airport.iata ?? `airport-${idx}`,
  iata: airport.iata,
  name: airport.name,
  lat: airport.lat,
  lon: airport.lon,
  city: (airport as any).city ?? '',
  country: (airport as any).country ?? '',
}));

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

const normalizeCityQuery = (city: string) => city.trim().toLowerCase().split(',')[0]?.trim();

const findAirportsByCity = (city?: string) => {
  if (!city) return [];
  const normalized = normalizeCityQuery(city);
  return airports.filter((airport) => {
    const cityName = airport.city?.toLowerCase();
    const name = airport.name?.toLowerCase();
    const cityMatches =
      cityName === normalized || (cityName && cityName.includes(normalized));
    const nameMatches = name && name.includes(normalized);
    return Boolean(cityMatches || nameMatches);
  });
};

const findAirportByCode = (code?: string) => {
  if (!code) return undefined;
  const normalized = code.trim().toUpperCase();
  return airports.find((airport) => airport.iata.toUpperCase() === normalized);
};

const resolveReferencePoint = (location: FlightSearchLocation): { lat: number; lon: number } | null => {
  if (location.lat !== undefined && location.lon !== undefined) {
    return { lat: location.lat, lon: location.lon };
  }

  const airport = findAirportByCode(location.airportCode);
  if (airport) return { lat: airport.lat, lon: airport.lon };

  const cityAirports = findAirportsByCity(location.city);
  if (cityAirports.length) {
    const avgLat = cityAirports.reduce((sum, airport) => sum + airport.lat, 0) / cityAirports.length;
    const avgLon = cityAirports.reduce((sum, airport) => sum + airport.lon, 0) / cityAirports.length;
    return { lat: avgLat, lon: avgLon };
  }

  return null;
};

const resolveNearbyAirports = (
  location: FlightSearchLocation,
  preferredAirports?: string[],
  maxDistanceKm?: number
): { candidates: Airport[]; usedRadiusKm: number } => {
  const preferred = preferredAirports?.length ? findAirportsByCodes(preferredAirports) : [];

  if (preferred.length) {
    return { candidates: preferred, usedRadiusKm: 0 };
  }

  const reference = resolveReferencePoint(location);
  const maxDistance = maxDistanceKm ?? DEFAULT_MAX_DISTANCE_KM;

  if (!reference) {
    const cityAirports = findAirportsByCity(location.city);
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

const resolveExactAirports = (location: FlightSearchLocation): { candidates: Airport[]; usedRadiusKm: number } => {
  // If coordinates are present, choose the nearest airport to that point (covers "current location" flows)
  if (location.lat !== undefined && location.lon !== undefined) {
    const nearest = airports
      .map((airport) => ({
        ...airport,
        distanceFromOriginKm: haversineDistanceKm(location.lat!, location.lon!, airport.lat, airport.lon),
      }))
      .sort((a, b) => (a.distanceFromOriginKm ?? 0) - (b.distanceFromOriginKm ?? 0))[0];

    return { candidates: nearest ? [nearest] : [], usedRadiusKm: 0 };
  }

  const code = location.airportCode?.trim().toUpperCase();
  if (code) {
    const airport = findAirportByCode(code);
    return { candidates: airport ? [airport] : [], usedRadiusKm: 0 };
  }

  const cityAirports = findAirportsByCity(location.city);
  if (cityAirports.length) {
    // Choose the first when we can't differentiate; use sorted by IATA for deterministic output
    const nearest = [...cityAirports].sort((a, b) => a.iata.localeCompare(b.iata))[0];
    return { candidates: nearest ? [nearest] : [], usedRadiusKm: 0 };
  }

  return { candidates: [], usedRadiusKm: 0 };
};

export const resolveDepartureAirports = (
  request: FlightSearchRequest
): { candidates: Airport[]; usedRadiusKm: number } =>
  request.includeNearbyAirports === false
    ? resolveExactAirports(request.origin)
    : resolveNearbyAirports(
        request.origin,
        request.preferredDepartureAirports,
        request.maxDepartureAirportDistanceKm
      );

export const resolveDestinationAirports = (
  request: FlightSearchRequest
): { candidates: Airport[]; usedRadiusKm: number } =>
  request.includeNearbyAirports === false
    ? resolveExactAirports(request.destination)
    : resolveNearbyAirports(
        request.destination,
        request.preferredArrivalAirports,
        request.maxArrivalAirportDistanceKm
      );

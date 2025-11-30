import { randomUUID } from 'crypto';

import { FlightLeg, FlightSearchRequest, Itinerary } from '@/lib/shared/types/flights';
import {
  findAirportsByCodes,
  getAirportDataset,
  haversineDistanceKm
} from '@/lib/server/airports/airportService';

export interface FlightSearchProvider {
  searchFlights(request: FlightSearchRequest & { departureAirportCodes: string[] }): Promise<Itinerary[]>;
}

const minutesFromDistance = (distanceKm: number) => {
  const speedKmPerHour = 750; // average cruise speed
  const hours = distanceKm / speedKmPerHour;
  return Math.max(Math.round(hours * 60), 45);
};

const addMinutes = (isoDate: string, minutes: number) => {
  const date = new Date(isoDate);
  return new Date(date.getTime() + minutes * 60 * 1000).toISOString();
};

const basePriceForDistance = (distanceKm: number, multiplier = 1) => {
  const base = Math.max(80, Math.round(distanceKm * 0.12));
  return Math.round(base * multiplier);
};

const uniqueId = (parts: string[]) => parts.join('-');

const pickConnectionAirport = (departureCode: string, destinationCode: string) => {
  const airports = getAirportDataset().filter(
    (airport) => ![departureCode, destinationCode].includes(airport.iata)
  );
  return airports[0];
};

export class MockFlightSearchProvider implements FlightSearchProvider {
  async searchFlights(
    request: FlightSearchRequest & { departureAirportCodes: string[] }
  ): Promise<Itinerary[]> {
    const destinationAirportCandidates = request.destination.airportCode
      ? findAirportsByCodes([request.destination.airportCode])
      : getAirportDataset().filter(
          (airport) => airport.city.toLowerCase() === (request.destination.city ?? '').toLowerCase()
        );

    const destinationAirport = destinationAirportCandidates[0];
    if (!destinationAirport) return [];

    const departureAirports = findAirportsByCodes(request.departureAirportCodes);
    const results: Itinerary[] = [];

    for (let i = 0; i < departureAirports.length; i += 1) {
      const departureAirport = departureAirports[i];
      const distanceKm = haversineDistanceKm(
        departureAirport.lat,
        departureAirport.lon,
        destinationAirport.lat,
        destinationAirport.lon
      );

      const outboundStart = `${request.departureDate}T08:00:00.000Z`;
      const primaryAirline = ['UX', 'NX', 'PX'][i % 3];

      const nonstop = this.buildItinerary({
        departureAirport,
        destinationAirport,
        distanceKm,
        tripType: request.tripType,
        departureDate: outboundStart,
        returnDate: request.returnDate,
        airline: primaryAirline,
        stops: [],
        priceMultiplier: 1
      });

      results.push(nonstop);

      if (!request.nonStopOnly && (request.maxStops === undefined || request.maxStops >= 1)) {
        const via = pickConnectionAirport(departureAirport.iata, destinationAirport.iata);
        if (via) {
          const oneStop = this.buildItinerary({
            departureAirport,
            destinationAirport,
            distanceKm,
            tripType: request.tripType,
            departureDate: outboundStart,
            returnDate: request.returnDate,
            airline: primaryAirline,
            stops: [via.iata],
            priceMultiplier: 0.85
          });
          results.push(oneStop);
        }
      }
    }

    return results.filter((itinerary) => {
      if (request.nonStopOnly) return itinerary.numberOfStops === 0;
      if (request.maxStops !== undefined) return itinerary.numberOfStops <= request.maxStops;
      return true;
    });
  }

  private buildItinerary({
    departureAirport,
    destinationAirport,
    distanceKm,
    tripType,
    departureDate,
    returnDate,
    airline,
    stops,
    priceMultiplier
  }: {
    departureAirport: Itinerary['departureAirport'];
    destinationAirport: Itinerary['arrivalAirport'];
    distanceKm: number;
    tripType: FlightSearchRequest['tripType'];
    departureDate: string;
    returnDate?: string;
    airline: string;
    stops: string[];
    priceMultiplier: number;
  }): Itinerary {
    const legs: FlightLeg[] = [];
    const airportLookup = Object.fromEntries(
      getAirportDataset().map((airport) => [airport.iata.toUpperCase(), airport])
    );

    const outboundAirports = [departureAirport.iata, ...stops, destinationAirport.iata];
    let segmentDeparture = departureDate;

    outboundAirports.forEach((code, index) => {
      if (index === outboundAirports.length - 1) return;
      const origin = airportLookup[outboundAirports[index].toUpperCase()];
      const destination = airportLookup[outboundAirports[index + 1].toUpperCase()];
      if (!origin || !destination) return;

      const legDistance = haversineDistanceKm(origin.lat, origin.lon, destination.lat, destination.lon);
      const durationMinutes = minutesFromDistance(legDistance);

      const leg: FlightLeg = {
        originAirport: origin,
        destinationAirport: destination,
        departureTimeLocal: segmentDeparture,
        arrivalTimeLocal: addMinutes(segmentDeparture, durationMinutes),
        airlineCode: airline,
        airlineName: `Mock ${airline}`,
        operatingAirlineCode: airline,
        operatingAirlineName: `Mock ${airline}`,
        flightNumber: `${airline}${Math.floor(Math.random() * 900) + 100}`,
        durationMinutes,
        aircraftTypeCode: 'MCK1',
        aircraftTypeName: 'Mock Narrowbody',
        cabinClass: 'economy',
        fareClass: 'Y',
        availableSeats: 4,
        includedCheckedBags: { quantity: 1, weightKg: 23 },
        includedCabinBags: { quantity: 1, weightKg: 8 }
      };

      legs.push(leg);
      segmentDeparture = addMinutes(leg.arrivalTimeLocal, 60); // 1 hour layover padding
    });

    const firstDeparture = legs[0]?.departureTimeLocal;
    const lastArrival = legs[legs.length - 1]?.arrivalTimeLocal;
    const totalDurationMinutes =
      firstDeparture && lastArrival
        ? Math.max(
            Math.round(
              (new Date(lastArrival).getTime() - new Date(firstDeparture).getTime()) / (1000 * 60)
            ),
            0
          )
        : 0;

    const outboundStops = Math.max(outboundAirports.length - 2, 0);
    const totalStops = outboundStops;

    const totalPrice = basePriceForDistance(distanceKm, priceMultiplier);

    const bookingUrl = `https://example.com/book/${departureAirport.iata}-${destinationAirport.iata}`;

    return {
      id: uniqueId([
        'mock',
        departureAirport.iata,
        destinationAirport.iata,
        String(stops.length),
        tripType,
        randomUUID()
      ]),
      legs,
      totalDurationMinutes,
      totalPrice: Math.round(totalPrice),
      currency: 'USD',
      numberOfStops: totalStops,
      departureAirport,
      arrivalAirport: destinationAirport,
      bookingUrl,
      provider: 'mock',
      fareBrandName: 'Mock Saver',
      isRefundable: false,
      isChangeable: true,
      changePenaltyAmount: 50,
      refundPenaltyAmount: null,
      fareRestrictionsSummary: 'Changes allowed with fee, non-refundable',
      mainMarketingAirlineCode: airline,
      mainMarketingAirlineName: `Mock ${airline}`
    };
  }
}

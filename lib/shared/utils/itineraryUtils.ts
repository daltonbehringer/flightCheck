import type { Airport, FlightLeg } from '@/lib/shared/types/flights';

export function computeLayovers(legs: FlightLeg[]): {
  connectingAirport: Airport;
  layoverMinutes: number;
  index: number;
}[] {
  const layovers: {
    connectingAirport: Airport;
    layoverMinutes: number;
    index: number;
  }[] = [];

  for (let i = 0; i < legs.length - 1; i += 1) {
    const current = legs[i];
    const next = legs[i + 1];
    const arrival = new Date(current.arrivalTimeLocal);
    const departure = new Date(next.departureTimeLocal);
    const diffMinutes = Math.max(Math.round((departure.getTime() - arrival.getTime()) / (1000 * 60)), 0);

    layovers.push({
      connectingAirport: current.destinationAirport,
      layoverMinutes: diffMinutes,
      index: i + 1
    });
  }

  return layovers;
}

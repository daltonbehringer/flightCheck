import type { FlightSearchProvider } from './flightSearchProvider';
import { MockFlightSearchProvider } from './flightSearchProvider';
import { DuffelFlightSearchProvider } from './duffelFlightSearchProvider';

const providerName = (process.env.FLIGHT_SEARCH_PROVIDER ?? 'mock').toLowerCase();

export const getFlightSearchProvider = (): FlightSearchProvider => {
  if (providerName === 'duffel') {
    return new DuffelFlightSearchProvider();
  }

  if (providerName !== 'mock') {
    console.warn(
      `Unknown FLIGHT_SEARCH_PROVIDER "${providerName}", falling back to MockFlightSearchProvider.`
    );
  }

  return new MockFlightSearchProvider();
};

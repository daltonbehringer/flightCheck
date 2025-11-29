import type { Itinerary } from '@/lib/shared/types/flights';

export const rankItineraries = (itineraries: Itinerary[]): Itinerary[] => {
  return [...itineraries].sort((a, b) => {
    if (a.totalPrice !== b.totalPrice) {
      return a.totalPrice - b.totalPrice;
    }
    return a.totalDurationMinutes - b.totalDurationMinutes;
  });
};

import airportsData from '@/lib/server/airports/data/airports.json';

type RawAirport = {
  iata: string;
  name: string;
  lat: number;
  lon: number;
  city?: string;
  country?: string;
};

export interface AirportSuggestion {
  iata: string;
  name: string;
  city?: string;
  lat: number;
  lon: number;
  badge?: string;
  label: string;
  description?: string;
}

const METRO_ALIASES: Record<string, string[]> = {
  'new york': ['JFK', 'LGA', 'EWR'],
  'new york city': ['JFK', 'LGA', 'EWR'],
  nyc: ['JFK', 'LGA', 'EWR'],
  'bay area': ['SFO', 'OAK', 'SJC'],
  'san francisco bay': ['SFO', 'OAK', 'SJC'],
  'los angeles': ['LAX', 'SNA', 'BUR', 'LGB'],
  la: ['LAX', 'SNA', 'BUR', 'LGB'],
  chicago: ['ORD', 'MDW'],
  dallas: ['DFW', 'DAL'],
  'dallas fort worth': ['DFW', 'DAL'],
  seattle: ['SEA', 'PAE'],
  washington: ['DCA', 'IAD', 'BWI'],
  dc: ['DCA', 'IAD', 'BWI'],
};

const normalize = (value: string) => value.trim().toLowerCase();

const stripAirportSuffixes = (name: string) =>
  name
    .replace(/international airport/i, '')
    .replace(/regional airport/i, '')
    .replace(/municipal airport/i, '')
    .replace(/airport/i, '')
    .replace(/field/i, '')
    .replace(/terminal/i, '')
    .trim();

const airportIndex = (airportsData as RawAirport[]).map((airport) => {
  const cityGuess = stripAirportSuffixes(airport.city || airport.name);
  const keywords = [
    airport.iata,
    airport.name,
    airport.city,
    cityGuess,
    cityGuess.replace(/international/i, '').trim()
  ]
    .filter(Boolean)
    .map((value) => normalize(value as string));

  return {
    ...airport,
    city: airport.city || cityGuess || undefined,
    keywords
  };
});

const dedupeByIata = (suggestions: AirportSuggestion[]) => {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    if (seen.has(suggestion.iata)) return false;
    seen.add(suggestion.iata);
    return true;
  });
};

const scoreMatch = (keyword: string, query: string) => {
  if (keyword === query) return 6;
  if (keyword.startsWith(query)) return 5;
  if (keyword.includes(query)) return 3;
  return 0;
};

export const searchAirportSuggestions = (query: string, limit = 6): AirportSuggestion[] => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery || normalizedQuery.length < 2) return [];

  const aliasHits = Object.entries(METRO_ALIASES)
    .filter(([alias]) => alias.startsWith(normalizedQuery) || normalizedQuery.startsWith(alias))
    .flatMap(([, codes]) =>
      codes
        .map((code) => airportIndex.find((airport) => airport.iata === code))
        .filter(Boolean)
        .map((airport) => ({
          iata: airport!.iata,
          name: airport!.name,
          city: airport!.city,
          lat: airport!.lat,
          lon: airport!.lon,
          badge: 'Metro area match',
          label: `${airport!.city ?? airport!.name} (${airport!.iata})`,
          description: airport!.name
        }))
    );

  const matches = airportIndex
    .map((airport) => {
      const scores = airport.keywords.map((keyword) => scoreMatch(keyword, normalizedQuery));
      const bestScore = Math.max(0, ...scores);
      return { airport, score: bestScore };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.airport.iata.localeCompare(b.airport.iata))
    .map(({ airport }) => ({
      iata: airport.iata,
      name: airport.name,
      city: airport.city,
      lat: airport.lat,
      lon: airport.lon,
      label: `${airport.city ?? airport.name} (${airport.iata})`,
      description: airport.name
    }));

  return dedupeByIata([...aliasHits, ...matches]).slice(0, limit);
};

// Helpers for "where to watch". Pure, no I/O.
import type { TvListing } from "./sportsdb.ts";

/** Groups channels by country, sorted by country, de-duplicated. */
export function byCountry(listings: TvListing[]): { country: string; channels: TvListing[] }[] {
  const map = new Map<string, Map<string, TvListing>>();
  for (const l of listings) {
    const c = normalizeCountry(l.country);
    if (!map.has(c)) map.set(c, new Map());
    map.get(c)!.set(l.channel.trim().toLowerCase(), l);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([country, chans]) => ({ country, channels: [...chans.values()].sort((a, b) => a.channel.localeCompare(b.channel)) }));
}

/** Country name for the phone's region (e.g. "en-GB" -> "United Kingdom"), or null. */
export function countryFromLocale(locale: string | undefined): string | null {
  const region = locale?.split(/[-_]/)[1];
  if (!region || region.length !== 2) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(region.toUpperCase()) ?? null;
  } catch {
    return null;
  }
}

/** TheSportsDB country names don't always match standard names; map the common ones. */
const ALIASES: Record<string, string[]> = {
  "United Kingdom": ["United Kingdom", "UK", "England", "Scotland", "Wales", "Northern Ireland", "Great Britain"],
  "United States": ["United States", "USA", "US", "United States of America"],
  "South Korea": ["South Korea", "Korea", "Korea, Republic of"],
};

/** Standard name for a TheSportsDB country ("USA" -> "United States"). */
export function normalizeCountry(name: string): string {
  const n = name.trim().toLowerCase();
  for (const [std, names] of Object.entries(ALIASES)) if (names.some((x) => x.toLowerCase() === n)) return std;
  return name.trim();
}

export function matchesCountry(listingCountry: string, country: string): boolean {
  const names = ALIASES[country] ?? [country];
  return names.some((n) => n.toLowerCase() === listingCountry.trim().toLowerCase());
}

/** A web search for listings, for when the data has none. */
export function watchSearchUrl(home: string, away: string, country: string | null): string {
  const q = `${home} vs ${away} where to watch${country ? ` ${country}` : ""}`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

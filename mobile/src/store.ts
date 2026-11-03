// Everything the app remembers lives on the phone (WebView localStorage). Nothing is sent anywhere.

export type Favourite = {
  teamId: string;
  name: string;
  sport: string;
  league: string | null;
  badge: string | null;
  /** League id for standings; missing on teams saved by older versions (looked up when needed). */
  leagueId?: string | null;
  /** Score alerts. Always false until the user turns them on for this team. */
  notify: boolean;
};

const FAV_KEY = "myteams.favourites.v1";
const SEEN_KEY = "myteams.seenEvents.v1";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable */
  }
}

const sortFavs = (f: Favourite[]) =>
  [...f].sort((a, b) => a.sport.localeCompare(b.sport) || a.name.localeCompare(b.name));

export function loadFavourites(): Favourite[] {
  return sortFavs(read<Favourite[]>(FAV_KEY, []));
}

export function saveFavourites(f: Favourite[]): Favourite[] {
  const sorted = sortFavs(f);
  write(FAV_KEY, sorted);
  return sorted;
}

/** Adds a team with alerts OFF. Re-adding keeps the existing alert choice. */
export function addFavourite(list: Favourite[], team: Omit<Favourite, "notify">): Favourite[] {
  const existing = list.find((f) => f.teamId === team.teamId);
  const others = list.filter((f) => f.teamId !== team.teamId);
  return saveFavourites([...others, { ...team, notify: existing?.notify ?? false }]);
}

export function removeFavourite(list: Favourite[], teamId: string): Favourite[] {
  return saveFavourites(list.filter((f) => f.teamId !== teamId));
}

export function setNotify(list: Favourite[], teamId: string, notify: boolean): Favourite[] {
  return saveFavourites(list.map((f) => (f.teamId === teamId ? { ...f, notify } : f)));
}

/** Returns the ids not seen before and remembers them all. */
export function markEventsSeen(ids: string[]): string[] {
  const seen = new Set(read<string[]>(SEEN_KEY, []));
  const fresh = ids.filter((id) => !seen.has(id));
  fresh.forEach((id) => seen.add(id));
  write(SEEN_KEY, [...seen].slice(-2000));
  return fresh;
}

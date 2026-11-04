// Thin client for TheSportsDB (https://www.thesportsdb.com/free_sports_api).
// Covers football, basketball, American football, baseball, ice hockey, rugby, cricket and more.
import type { GameEvent } from "./stats.ts";

// "123" is TheSportsDB's current free key; the old free key "3" no longer works, so it is mapped over.
const RAW_KEY = process.env.SPORTSDB_API_KEY?.trim();
const KEY = !RAW_KEY || RAW_KEY === "3" ? "123" : RAW_KEY;
const BASE = process.env.SPORTSDB_BASE_URL || `https://www.thesportsdb.com/api/v1/json/${KEY}`;

export type Team = {
  id: string;
  name: string;
  sport: string;
  league: string | null;
  leagueId: string | null;
  country: string | null;
  badge: string | null;
  stadium: string | null;
  formed: string | null;
  website: string | null;
  description: string | null;
};

export type TableRow = {
  rank: number;
  teamId: string;
  team: string;
  badge: string | null;
  played: number;
  win: number;
  draw: number;
  loss: number;
  points: number;
  goalDifference: number;
};

type Raw = Record<string, string | null | undefined>;

// --- Request pacing and caching -------------------------------------------------------------
// TheSportsDB allows about 30 requests a minute per user and answers 429 above that. Screens like
// Stats and Standings fire many requests at once, so requests are paced, retried on 429, and (in
// the phone app, where localStorage exists) cached so repeat visits don't hit the API at all.
const MAX_PER_MINUTE = 25;
const sent: number[] = [];
let queue: Promise<void> = Promise.resolve();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function slot(): Promise<void> {
  const next = queue.then(async () => {
    for (;;) {
      const now = Date.now();
      while (sent.length && now - sent[0] > 60_000) sent.shift();
      if (sent.length < MAX_PER_MINUTE) { sent.push(now); return; }
      await sleep(60_000 - (now - sent[0]) + 50);
    }
  });
  queue = next.catch(() => {});
  return next;
}

const CACHE_PREFIX = "tsdb:";
type Cached = { at: number; body: string };
function store(): Storage | null {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
}
function readCache(path: string): Cached | null {
  try { const raw = store()?.getItem(CACHE_PREFIX + path); return raw ? (JSON.parse(raw) as Cached) : null; } catch { return null; }
}
function writeCache(path: string, body: string) {
  const s = store(); if (!s) return;
  try { s.setItem(CACHE_PREFIX + path, JSON.stringify({ at: Date.now(), body })); }
  catch {
    // Storage full: drop the oldest cached responses and try once more.
    try {
      const keys = Object.keys(s).filter((k) => k.startsWith(CACHE_PREFIX));
      keys.sort((a, b) => (JSON.parse(s.getItem(a)!).at as number) - (JSON.parse(s.getItem(b)!).at as number));
      keys.slice(0, Math.ceil(keys.length / 2)).forEach((k) => s.removeItem(k));
      s.setItem(CACHE_PREFIX + path, JSON.stringify({ at: Date.now(), body }));
    } catch { /* give up quietly */ }
  }
}

function parse<T>(path: string, text: string): T {
  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    console.error(`TheSportsDB ${path} returned non-JSON: ${text.slice(0, 200)}`);
    throw new Error(`TheSportsDB ${path} returned an unexpected response`);
  }
}

async function get<T = Raw>(path: string, revalidate = 300): Promise<T> {
  const cached = readCache(path);
  if (cached && Date.now() - cached.at < revalidate * 1000) return parse<T>(path, cached.body);

  for (let attempt = 0; ; attempt++) {
    await slot();
    let res: Response;
    try {
      res = await fetch(`${BASE}/${path}`, { next: { revalidate } } as RequestInit);
    } catch (e) {
      if (cached) return parse<T>(path, cached.body); // offline: use what we have
      throw e;
    }
    const text = await res.text();
    if (res.status === 429 && attempt < 3) {
      const wait = Number(res.headers.get("retry-after")) * 1000 || [5_000, 15_000, 30_000][attempt];
      await sleep(wait);
      continue;
    }
    if (!res.ok) {
      console.error(`TheSportsDB ${path} -> HTTP ${res.status}: ${text.slice(0, 200)}`);
      if (cached) return parse<T>(path, cached.body);
      throw new Error(`TheSportsDB ${path} failed: ${res.status}`);
    }
    const body = parse<T>(path, text);
    writeCache(path, text);
    return body;
  }
}

const num = (v: string | null | undefined) => (v == null || v === "" ? null : Number(v));

export function toTeam(r: Raw): Team {
  return {
    id: r.idTeam!,
    name: r.strTeam!,
    sport: r.strSport ?? "Unknown",
    league: r.strLeague ?? null,
    leagueId: r.idLeague ?? null,
    country: r.strCountry ?? null,
    badge: r.strBadge ?? r.strTeamBadge ?? null,
    stadium: r.strStadium ?? null,
    formed: r.intFormedYear ?? null,
    website: r.strWebsite ?? null,
    description: r.strDescriptionEN ?? null,
  };
}

export function toEvent(r: Raw): GameEvent {
  return {
    id: r.idEvent!,
    name: r.strEvent ?? "",
    date: r.dateEvent ?? null,
    time: r.strTime ?? null,
    league: r.strLeague ?? null,
    homeId: r.idHomeTeam ?? null,
    awayId: r.idAwayTeam ?? null,
    homeTeam: r.strHomeTeam ?? "",
    awayTeam: r.strAwayTeam ?? "",
    homeScore: num(r.intHomeScore),
    awayScore: num(r.intAwayScore),
    status: r.strStatus ?? null,
    video: r.strVideo || null,
    thumb: r.strThumb || null,
  };
}

export async function searchTeams(query: string): Promise<Team[]> {
  const data = await get<{ teams: Raw[] | null }>(`searchteams.php?t=${encodeURIComponent(query)}`, 3600);
  return (data.teams ?? []).map(toTeam);
}

export async function getTeam(id: string): Promise<Team | null> {
  const data = await get<{ teams: Raw[] | null }>(`lookupteam.php?id=${encodeURIComponent(id)}`, 3600);
  return data.teams?.[0] ? toTeam(data.teams[0]) : null;
}

export async function lastEvents(teamId: string): Promise<GameEvent[]> {
  const data = await get<{ results: Raw[] | null }>(`eventslast.php?id=${encodeURIComponent(teamId)}`, 120);
  return (data.results ?? []).map(toEvent);
}

export async function nextEvents(teamId: string): Promise<GameEvent[]> {
  const data = await get<{ events: Raw[] | null }>(`eventsnext.php?id=${encodeURIComponent(teamId)}`, 600);
  return (data.events ?? []).map(toEvent);
}

export async function leagueTable(leagueId: string): Promise<TableRow[]> {
  const league = await get<{ leagues: Raw[] | null }>(`lookupleague.php?id=${encodeURIComponent(leagueId)}`, 86400).catch(() => ({ leagues: null }));
  const season = league.leagues?.[0]?.strCurrentSeason ?? "";
  let data = await get<{ table: Raw[] | null }>(
    `lookuptable.php?l=${encodeURIComponent(leagueId)}&s=${encodeURIComponent(season)}`,
    600,
  );
  // Some leagues only answer without the season parameter.
  if (!data.table?.length) data = await get<{ table: Raw[] | null }>(`lookuptable.php?l=${encodeURIComponent(leagueId)}`, 600);
  return (data.table ?? []).map((r) => ({
    rank: Number(r.intRank ?? 0),
    teamId: r.idTeam ?? "",
    team: r.strTeam ?? "",
    badge: r.strBadge ?? r.strTeamBadge ?? null,
    played: Number(r.intPlayed ?? 0),
    win: Number(r.intWin ?? 0),
    draw: Number(r.intDraw ?? 0),
    loss: Number(r.intLoss ?? 0),
    points: Number(r.intPoints ?? 0),
    goalDifference: Number(r.intGoalDifference ?? 0),
  }));
}

export type Player = {
  id: string;
  name: string;
  position: string | null;
  number: string | null;
  nationality: string | null;
  born: string | null;
  height: string | null;
  photo: string | null;
  description: string | null;
};

export function toPlayer(r: Raw): Player {
  return {
    id: r.idPlayer!,
    name: r.strPlayer ?? "",
    position: r.strPosition || null,
    number: r.strNumber || null,
    nationality: r.strNationality || null,
    born: r.dateBorn || null,
    height: r.strHeight || null,
    photo: r.strCutout || r.strThumb || r.strRender || null,
    description: r.strDescriptionEN || null,
  };
}

/** The squad. Tries the full squad endpoint, then falls back to a search by team name (free key). */
export async function teamPlayers(teamId: string, teamName: string): Promise<Player[]> {
  try {
    const data = await get<{ player: Raw[] | null }>(`lookup_all_players.php?id=${encodeURIComponent(teamId)}`, 86400);
    if (data.player?.length) return data.player.map(toPlayer);
  } catch {
    /* fall through */
  }
  const data = await get<{ player: Raw[] | null }>(`searchplayers.php?t=${encodeURIComponent(teamName)}`, 86400);
  return (data.player ?? []).map(toPlayer);
}

export type TvListing = { channel: string; country: string; logo: string | null };

/** TV channels showing a game, by country, where TheSportsDB has them. */
export async function tvListings(eventId: string): Promise<TvListing[]> {
  const data = await get<{ tvevent: Raw[] | null }>(`lookuptv.php?id=${encodeURIComponent(eventId)}`, 3600);
  return (data.tvevent ?? [])
    .filter((r) => r.strChannel && r.strCountry)
    .map((r) => ({ channel: r.strChannel!, country: r.strCountry!, logo: r.strLogo || null }));
}

export type StatLine = { label: string; values: { name: string; value: string }[] };

const STAT_SKIP = /^(id|str(Player|Team|Thumb|Cutout|Badge|Logo|Locked)|date|idTeam|idPlayer|idLeague)/i;
const prettify = (k: string) =>
  k.replace(/^(int|str|dbl)/, "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").trim();

/**
 * Season stats for a player. TheSportsDB doesn't document this response, so it is read defensively:
 * every row of the first list in the reply becomes a line, labelled by season/competition, showing
 * its non-empty values.
 */
export async function playerStats(playerId: string): Promise<StatLine[]> {
  const data = await get<Record<string, unknown>>(`lookupplayerstats.php?id=${encodeURIComponent(playerId)}`, 86400);
  const rows = Object.values(data).find((v) => Array.isArray(v)) as Raw[] | undefined;
  return (rows ?? []).map((r) => {
    const label = [r.strSeason, r.strLeague ?? r.strCompetition, r.strTeam].filter(Boolean).join(" · ") || "Stats";
    const values = Object.entries(r)
      .filter(([k, v]) => v != null && v !== "" && v !== "0" && !STAT_SKIP.test(k) && !/^(strSeason|strLeague|strCompetition)$/.test(k))
      .map(([k, v]) => ({ name: prettify(k), value: String(v) }));
    return { label, values };
  }).filter((l) => l.values.length);
}

// Thin client for TheSportsDB (https://www.thesportsdb.com/free_sports_api).
// Covers football, basketball, American football, baseball, ice hockey, rugby, cricket and more.
import type { GameEvent } from "./stats.ts";

const KEY = process.env.SPORTSDB_API_KEY || "3";
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

async function get<T = Raw>(path: string, revalidate = 300): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, { next: { revalidate } } as RequestInit);
  if (!res.ok) throw new Error(`TheSportsDB ${path} failed: ${res.status}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
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
  const league = await get<{ leagues: Raw[] | null }>(`lookupleague.php?id=${encodeURIComponent(leagueId)}`, 86400);
  const season = league.leagues?.[0]?.strCurrentSeason;
  if (!season) return [];
  const data = await get<{ table: Raw[] | null }>(
    `lookuptable.php?l=${encodeURIComponent(leagueId)}&s=${encodeURIComponent(season)}`,
    600,
  );
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

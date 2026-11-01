// Pure helpers, no I/O, so they're easy to test.

export type GameEvent = {
  id: string;
  name: string;
  date: string | null;
  time: string | null;
  league: string | null;
  homeId: string | null;
  awayId: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string | null;
  /** Highlights video URL (usually YouTube), when TheSportsDB has one. */
  video: string | null;
  thumb: string | null;
};

export type Outcome = "W" | "D" | "L";

export type Summary = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  scored: number;
  conceded: number;
  form: Outcome[]; // most recent first
};

export function outcomeFor(teamId: string, e: GameEvent): Outcome | null {
  if (e.homeScore == null || e.awayScore == null) return null;
  const isHome = e.homeId === teamId;
  const isAway = e.awayId === teamId;
  if (!isHome && !isAway) return null;
  const mine = isHome ? e.homeScore : e.awayScore;
  const theirs = isHome ? e.awayScore : e.homeScore;
  return mine > theirs ? "W" : mine < theirs ? "L" : "D";
}

export function summarise(teamId: string, events: GameEvent[]): Summary {
  const s: Summary = { played: 0, wins: 0, draws: 0, losses: 0, scored: 0, conceded: 0, form: [] };
  const sorted = [...events].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  for (const e of sorted) {
    const o = outcomeFor(teamId, e);
    if (!o) continue;
    const isHome = e.homeId === teamId;
    s.played++;
    s.scored += (isHome ? e.homeScore : e.awayScore)!;
    s.conceded += (isHome ? e.awayScore : e.homeScore)!;
    if (o === "W") s.wins++;
    else if (o === "D") s.draws++;
    else s.losses++;
    s.form.push(o);
  }
  return s;
}

export function scoreLine(e: GameEvent): string {
  if (e.homeScore == null || e.awayScore == null) return `${e.homeTeam} vs ${e.awayTeam}`;
  return `${e.homeTeam} ${e.homeScore} - ${e.awayScore} ${e.awayTeam}`;
}

/** YouTube video id from a watch/share/embed URL, or null. */
export function youTubeId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

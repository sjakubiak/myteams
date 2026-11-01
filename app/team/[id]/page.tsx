import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth.ts";
import { getFavourite } from "@/lib/db.ts";
import { getTeam, lastEvents, leagueTable, nextEvents, type TableRow } from "@/lib/sportsdb.ts";
import { outcomeFor, summarise, type GameEvent } from "@/lib/stats.ts";
import { teamNews, type NewsItem } from "@/lib/news.ts";
import NewsList from "@/components/NewsList.tsx";
import Highlights from "@/components/Highlights.tsx";

const TABS = ["stats", "news", "highlights"] as const;
type Tab = (typeof TABS)[number];

export const dynamic = "force-dynamic";

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p; } catch { return fallback; }
}

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/");
  const { id } = await params;
  const requested = (await searchParams).tab;
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : "stats";

  const team = await safe(getTeam(id), null);
  if (!team) notFound();

  const none = <T,>(v: T) => Promise.resolve(v);
  const [recent, upcoming, table, news] = await Promise.all([
    tab === "news" ? none([] as GameEvent[]) : safe(lastEvents(id), [] as GameEvent[]),
    tab === "stats" ? safe(nextEvents(id), [] as GameEvent[]) : none([] as GameEvent[]),
    tab === "stats" && team.leagueId ? safe(leagueTable(team.leagueId), [] as TableRow[]) : none([] as TableRow[]),
    tab === "news" ? safe(teamNews(team.name, team.sport), null) : none([] as NewsItem[]),
  ]);
  const s = summarise(id, recent);
  const fav = getFavourite(userId, id);
  const myRow = table.find((r) => r.teamId === id);

  return (
    <article>
      <Link href="/" className="muted">&larr; My teams</Link>
      <header className="team-head">
        {team.badge && <img src={`${team.badge}/small`} alt="" width={72} height={72} />}
        <div>
          <h1>{team.name}</h1>
          <p className="muted">
            {team.sport}{team.league ? ` · ${team.league}` : ""}{team.country ? ` · ${team.country}` : ""}
          </p>
          {fav && <p className="muted small">Score alerts are {fav.notify ? "on" : "off"} for this team.</p>}
        </div>
      </header>

      <nav className="tabs" aria-label="Team sections">
        {TABS.map((t) => (
          <Link key={t} href={`/team/${id}?tab=${t}`} className={t === tab ? "active" : ""} replace>
            {t[0].toUpperCase() + t.slice(1)}
          </Link>
        ))}
      </nav>

      {tab === "news" && (
        <section className="card">
          {news === null ? <p className="muted">News is unavailable right now. Try again shortly.</p> : <NewsList items={news} />}
        </section>
      )}

      {tab === "highlights" && <Highlights teamName={team.name} sport={team.sport} events={recent} />}

      {tab === "stats" && (<>
      <section className="stats">
        {myRow && <Stat label="League position" value={`#${myRow.rank}`} />}
        {myRow && <Stat label="Points" value={myRow.points} />}
        <Stat label="Recent record" value={s.played ? `${s.wins}-${s.draws}-${s.losses}` : "–"} hint="W-D-L" />
        <Stat label="Scored / conceded" value={s.played ? `${s.scored} / ${s.conceded}` : "–"} hint={`last ${s.played}`} />
        {team.formed && <Stat label="Founded" value={team.formed} />}
        {team.stadium && <Stat label="Home ground" value={team.stadium} />}
      </section>

      {s.form.length > 0 && (
        <section className="card">
          <h2>Form</h2>
          <div className="form">{s.form.map((o, i) => <span key={i} className={`pill ${o}`}>{o}</span>)}</div>
        </section>
      )}

      <section className="card">
        <h2>Recent results</h2>
        {recent.length ? <Games teamId={id} events={recent} /> : <p className="muted">No recent results available.</p>}
      </section>

      <section className="card">
        <h2>Upcoming</h2>
        {upcoming.length ? <Games teamId={id} events={upcoming} /> : <p className="muted">No upcoming games listed.</p>}
      </section>

      {table.length > 0 && (
        <section className="card">
          <h2>{team.league} table</h2>
          <div className="scroll">
            <table>
              <thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
              <tbody>
                {table.map((r) => (
                  <tr key={r.teamId} className={r.teamId === id ? "me" : ""}>
                    <td>{r.rank}</td><td>{r.team}</td><td>{r.played}</td><td>{r.win}</td><td>{r.draw}</td>
                    <td>{r.loss}</td><td>{r.goalDifference}</td><td><strong>{r.points}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {team.description && (
        <section className="card">
          <h2>About</h2>
          <p className="about">{team.description.split("\n")[0]}</p>
        </section>
      )}
      </>)}
    </article>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="stat">
      <span className="muted small">{label}</span>
      <strong>{value}</strong>
      {hint && <span className="muted small">{hint}</span>}
    </div>
  );
}

function Games({ teamId, events }: { teamId: string; events: GameEvent[] }) {
  return (
    <ul className="games">
      {events.map((e) => {
        const o = outcomeFor(teamId, e);
        return (
          <li key={e.id}>
            <span className="muted small date">{e.date ?? ""}</span>
            <span className="grow">
              {e.homeTeam} {e.homeScore != null ? <strong>{e.homeScore} - {e.awayScore}</strong> : "vs"} {e.awayTeam}
            </span>
            {o && <span className={`pill ${o}`}>{o}</span>}
          </li>
        );
      })}
    </ul>
  );
}

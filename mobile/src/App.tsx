import { useCallback, useEffect, useState } from "react";
import { App as CapApp } from "@capacitor/app";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import { getTeam, lastEvents, leagueTable, nextEvents, searchTeams, teamPlayers, tvListings, type Player, type TableRow, type Team } from "../../lib/sportsdb.ts";
import { byCountry, countryFromLocale, matchesCountry, normalizeCountry, watchSearchUrl } from "../../lib/watch.ts";
import { outcomeFor, summarise, youTubeId, type GameEvent } from "../../lib/stats.ts";
import { teamNews, timeAgo, type NewsItem } from "../../lib/news.ts";
import { addFavourite, loadFavourites, removeFavourite, setNotify, type Favourite } from "./store.ts";
import { askPermission, checkScores, primeTeam } from "./alerts.ts";

type TeamTab = "stats" | "table" | "players" | "watch" | "news" | "highlights";
const TEAM_TABS: { id: TeamTab; label: string }[] = [
  { id: "stats", label: "Stats" }, { id: "table", label: "Standings" }, { id: "players", label: "Players" },
  { id: "watch", label: "Watch" }, { id: "news", label: "News" }, { id: "highlights", label: "Highlights" },
];

type Route =
  | { view: "teams" }
  | { view: "team"; id: string; tab: TeamTab }
  | { view: "feed"; tab: "news" | "highlights" };

const POLL_MS = 5 * 60 * 1000;

export default function App() {
  const [stack, setStack] = useState<Route[]>([{ view: "teams" }]);
  const route = stack[stack.length - 1];
  const [favourites, setFavourites] = useState<Favourite[]>(loadFavourites);
  const [banner, setBanner] = useState<string[]>([]);

  const go = (r: Route) => setStack((s) => [...s, r]);
  const replace = (r: Route) => setStack((s) => [...s.slice(0, -1), r]);
  const home = (r: Route) => setStack([r]);
  const back = useCallback(() => {
    let popped = false;
    setStack((s) => {
      if (s.length > 1) { popped = true; return s.slice(0, -1); }
      return s;
    });
    return popped;
  }, []);

  // Android back button: go back a screen, or leave the app from the first screen.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const h = CapApp.addListener("backButton", () => {
      setStack((s) => {
        if (s.length > 1) return s.slice(0, -1);
        CapApp.minimizeApp();
        return s;
      });
    });
    const n = LocalNotifications.addListener("localNotificationActionPerformed", (a) => {
      const teamId = a.notification.extra?.teamId;
      if (teamId) setStack([{ view: "teams" }, { view: "team", id: String(teamId), tab: "stats" }]);
    });
    return () => { h.then((x) => x.remove()); n.then((x) => x.remove()); };
  }, []);

  // Score alerts: only runs when at least one team has alerts switched on.
  const anyAlerts = favourites.some((f) => f.notify);
  useEffect(() => {
    if (!anyAlerts) return;
    let stop = false;
    const run = async () => {
      const shown = await checkScores(loadFavourites());
      if (!stop && shown.length && !Capacitor.isNativePlatform()) setBanner((b) => [...shown, ...b].slice(0, 5));
    };
    run();
    const id = setInterval(run, POLL_MS);
    const resume = Capacitor.isNativePlatform()
      ? CapApp.addListener("resume", run)
      : null;
    return () => { stop = true; clearInterval(id); resume?.then((x) => x.remove()); };
  }, [anyAlerts]);

  async function toggleNotify(f: Favourite) {
    if (!f.notify) {
      if (!(await askPermission())) {
        alert("Notifications are blocked for My Teams. You can allow them in Android Settings > Apps > My Teams.");
        return;
      }
      await primeTeam(f.teamId);
    }
    setFavourites((list) => setNotify(list, f.teamId, !f.notify));
  }

  return (
    <>
      <header className="top">
        {stack.length > 1 ? (
          <button className="linklike muted" onClick={back}>&larr; Back</button>
        ) : (
          <span className="brand">My Teams</span>
        )}
      </header>
      <main className="with-nav">
        {banner.length > 0 && (
          <div className="banner" role="status">
            {banner.map((t, i) => <div key={i}>{t}</div>)}
            <button className="btn ghost small" onClick={() => setBanner([])}>Dismiss</button>
          </div>
        )}
        {route.view === "teams" && (
          <Teams
            favourites={favourites}
            onAdd={(t) => setFavourites((l) => addFavourite(l, { teamId: t.id, name: t.name, sport: t.sport, league: t.league, badge: t.badge }))}
            onRemove={(id) => setFavourites((l) => removeFavourite(l, id))}
            onToggle={toggleNotify}
            onOpen={(id) => go({ view: "team", id, tab: "stats" })}
          />
        )}
        {route.view === "team" && (
          <TeamView
            key={route.id}
            id={route.id}
            tab={route.tab}
            fav={favourites.find((f) => f.teamId === route.id)}
            onTab={(tab) => replace({ ...route, tab })}
          />
        )}
        {route.view === "feed" && (
          <Feed favourites={favourites} tab={route.tab} onTab={(tab) => replace({ view: "feed", tab })} />
        )}
        <p className="muted disclaimer">Unofficial fan app. Not affiliated with any team or league. Data: TheSportsDB, Google News.</p>
      </main>
      <nav className="bottom-nav" aria-label="Main">
        <button className={route.view !== "feed" ? "active" : ""} onClick={() => home({ view: "teams" })}>
          <span aria-hidden>★</span>My teams
        </button>
        <button className={route.view === "feed" ? "active" : ""} onClick={() => home({ view: "feed", tab: "news" })}>
          <span aria-hidden>▤</span>News & highlights
        </button>
      </nav>
    </>
  );
}

function Teams({ favourites, onAdd, onRemove, onToggle, onOpen }: {
  favourites: Favourite[];
  onAdd: (t: Team) => void;
  onRemove: (id: string) => void;
  onToggle: (f: Favourite) => void;
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Team[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setError(null); return; }
    const t = setTimeout(async () => {
      setSearching(true); setError(null);
      try {
        setResults(await searchTeams(q));
      } catch {
        setError("Couldn't reach the sports data. Check your connection and try again.");
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const followed = new Set(favourites.map((f) => f.teamId));
  const bySport = favourites.reduce<Record<string, Favourite[]>>((acc, f) => { (acc[f.sport] ??= []).push(f); return acc; }, {});

  return (
    <>
      <section className="card">
        <h2>Add a team</h2>
        <input className="search" placeholder="Full team name, e.g. Arsenal or Los Angeles Lakers"
          value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search teams" />
        {searching && <p className="muted">Searching...</p>}
        {error && <p className="error">{error}</p>}
        {!searching && !error && query.trim().length >= 2 && results.length === 0 && (
          <p className="muted">No teams found. Try the full name.</p>
        )}
        {results.length > 0 && (
          <ul className="results">
            {results.map((t) => (
              <li key={t.id}>
                {t.badge && <img src={`${t.badge}/tiny`} alt="" width={28} height={28} />}
                <span className="grow">
                  <strong>{t.name}</strong>
                  <span className="muted"> {t.sport}{t.league ? ` · ${t.league}` : ""}</span>
                </span>
                {followed.has(t.id) ? <span className="muted">Added</span> : (
                  <button className="btn small" onClick={() => { onAdd(t); setQuery(""); }}>Add</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {favourites.length === 0 ? (
        <p className="muted center">No teams yet. Search above to add your first one.</p>
      ) : Object.entries(bySport).map(([sport, teams]) => (
        <section key={sport}>
          <h2 className="sport">{sport}</h2>
          <ul className="teams">
            {teams.map((f) => (
              <li key={f.teamId} className="card team">
                <button className="linklike team-link" onClick={() => onOpen(f.teamId)}>
                  {f.badge && <img src={`${f.badge}/tiny`} alt="" width={40} height={40} />}
                  <span><strong>{f.name}</strong>{f.league && <span className="muted block">{f.league}</span>}</span>
                </button>
                <div className="team-actions">
                  <label className="switch">
                    <input type="checkbox" checked={f.notify} onChange={() => onToggle(f)} />
                    <span>Score alerts {f.notify ? "on" : "off"}</span>
                  </label>
                  <button className="btn ghost small" onClick={() => onRemove(f.teamId)} aria-label={`Remove ${f.name}`}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function useLoad<T>(fn: () => Promise<T>, deps: unknown[]): { data: T | undefined; failed: boolean } {
  const [state, setState] = useState<{ data: T | undefined; failed: boolean }>({ data: undefined, failed: false });
  useEffect(() => {
    let live = true;
    setState({ data: undefined, failed: false });
    fn().then((data) => live && setState({ data, failed: false }), () => live && setState({ data: undefined, failed: true }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

const soft = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);

function TeamView({ id, tab, fav, onTab }: {
  id: string; tab: TeamTab; fav?: Favourite; onTab: (t: TeamTab) => void;
}) {
  const team = useLoad(() => getTeam(id), [id]);
  const recent = useLoad(() => soft(lastEvents(id), [] as GameEvent[]), [id]);
  const upcoming = useLoad(() => soft(nextEvents(id), [] as GameEvent[]), [id]);
  const t = team.data;
  const table = useLoad(() => (t?.leagueId ? soft(leagueTable(t.leagueId), [] as TableRow[]) : Promise.resolve([] as TableRow[])), [t?.leagueId]);
  const news = useLoad(() => (tab === "news" && t ? teamNews(t.name, t.sport) : Promise.resolve([] as NewsItem[])), [t?.name, tab]);

  if (team.failed) return <p className="muted center">Couldn't load this team. Check your connection.</p>;
  if (!t) return <p className="muted center">Loading...</p>;
  const s = summarise(id, recent.data ?? []);
  const myRow = table.data?.find((r) => r.teamId === id);

  return (
    <article>
      <header className="team-head">
        {t.badge && <img src={`${t.badge}/small`} alt="" width={72} height={72} />}
        <div>
          <h1>{t.name}</h1>
          <p className="muted">{t.sport}{t.league ? ` · ${t.league}` : ""}{t.country ? ` · ${t.country}` : ""}</p>
          {fav && <p className="muted small">Score alerts are {fav.notify ? "on" : "off"} for this team.</p>}
        </div>
      </header>
      <nav className="tabs scroll-tabs">
        {TEAM_TABS.map((x) => (
          <button key={x.id} className={x.id === tab ? "active" : ""} onClick={() => onTab(x.id)}>{x.label}</button>
        ))}
      </nav>

      {tab === "table" && (table.data === undefined
        ? <p className="muted center">Loading...</p>
        : <Standings league={t.league} rows={table.data} teamId={id} />)}

      {tab === "players" && <Players teamId={id} teamName={t.name} />}

      {tab === "watch" && (upcoming.data === undefined
        ? <p className="muted center">Loading...</p>
        : <Watch events={upcoming.data} />)}

      {tab === "news" && (
        <section className="card">
          {news.failed ? <p className="muted">News is unavailable right now.</p> : news.data ? <NewsList items={news.data} /> : <p className="muted">Loading...</p>}
        </section>
      )}

      {tab === "highlights" && <Highlights teamName={t.name} sport={t.sport} events={recent.data ?? []} />}

      {tab === "stats" && (
        <>
          <section className="stats">
            {myRow && <Stat label="League position" value={`#${myRow.rank}`} />}
            {myRow && <Stat label="Points" value={myRow.points} />}
            <Stat label="Recent record" value={s.played ? `${s.wins}-${s.draws}-${s.losses}` : "–"} hint="W-D-L" />
            <Stat label="Scored / conceded" value={s.played ? `${s.scored} / ${s.conceded}` : "–"} hint={`last ${s.played}`} />
            {t.formed && <Stat label="Founded" value={t.formed} />}
            {t.stadium && <Stat label="Home ground" value={t.stadium} />}
          </section>
          {s.form.length > 0 && (
            <section className="card"><h2>Form</h2><div className="form">{s.form.map((o, i) => <span key={i} className={`pill ${o}`}>{o}</span>)}</div></section>
          )}
          <section className="card"><h2>Recent results</h2>{recent.data?.length ? <Games teamId={id} events={recent.data} /> : <p className="muted">No recent results available.</p>}</section>
          <section className="card"><h2>Upcoming</h2>{upcoming.data?.length ? <Games teamId={id} events={upcoming.data} /> : <p className="muted">No upcoming games listed.</p>}</section>
          {t.description && <section className="card"><h2>About</h2><p className="about">{t.description.split("\n")[0]}</p></section>}
        </>
      )}
    </article>
  );
}

function Standings({ league, rows, teamId }: { league: string | null; rows: TableRow[]; teamId: string }) {
  if (!rows.length) return <p className="muted card">No standings available for this league.</p>;
  return (
    <section className="card">
      <h2>{league ?? "League"} standings</h2>
      <div className="scroll">
        <table>
          <thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.teamId} className={r.teamId === teamId ? "me" : ""}>
              <td>{r.rank}</td><td>{r.team}</td><td>{r.played}</td><td>{r.win}</td><td>{r.draw}</td><td>{r.loss}</td><td>{r.goalDifference}</td><td><strong>{r.points}</strong></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}

const POSITION_ORDER = ["goalkeeper", "defender", "midfielder", "forward", "attacker", "winger", "striker"];
const positionRank = (p: string | null) => {
  const i = POSITION_ORDER.findIndex((x) => (p ?? "").toLowerCase().includes(x));
  return i === -1 ? 99 : i;
};

function Players({ teamId, teamName }: { teamId: string; teamName: string }) {
  const players = useLoad(() => teamPlayers(teamId, teamName), [teamId]);
  const [open, setOpen] = useState<string | null>(null);
  if (players.failed) return <p className="muted card">Player data is unavailable right now.</p>;
  if (!players.data) return <p className="muted center">Loading...</p>;
  if (!players.data.length) return <p className="muted card">No squad listed for this team yet.</p>;
  const sorted = [...players.data].sort((a, b) => positionRank(a.position) - positionRank(b.position) || a.name.localeCompare(b.name));
  return (
    <section className="card">
      <h2>Squad</h2>
      <ul className="players">
        {sorted.map((p: Player) => {
          const age = p.born ? Math.floor((Date.now() - Date.parse(p.born)) / 31557600000) : null;
          return (
            <li key={p.id}>
              <button className="linklike player" onClick={() => setOpen(open === p.id ? null : p.id)} aria-expanded={open === p.id}>
                {p.photo ? <img src={`${p.photo}/tiny`} alt="" width={44} height={44} className="player-photo" /> : <span className="player-photo blank" />}
                <span className="grow">
                  <strong>{p.number ? `${p.number}. ` : ""}{p.name}</strong>
                  <span className="muted small block">{[p.position, p.nationality, age && !isNaN(age) ? `Age ${age}` : null].filter(Boolean).join(" · ")}</span>
                </span>
              </button>
              {open === p.id && (
                <div className="player-more muted small">
                  {p.height && <p>Height: {p.height}</p>}
                  {p.born && <p>Born: {p.born}</p>}
                  {p.description ? <p className="about">{p.description.split("\n")[0]}</p> : <p>No profile available.</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="muted small">Season stats per player (goals, assists and so on) aren't in the free data yet.</p>
    </section>
  );
}

const COUNTRY_KEY = "myteams.watchCountry.v1";

function Watch({ events }: { events: GameEvent[] }) {
  const deviceCountry = countryFromLocale(navigator.language);
  const [country, setCountry] = useState<string>(() => {
    try { return localStorage.getItem(COUNTRY_KEY) || deviceCountry || "All countries"; } catch { return deviceCountry || "All countries"; }
  });
  const ids = events.map((e) => e.id).join(",");
  const listings = useLoad(async () => {
    const all = await Promise.all(events.slice(0, 5).map(async (e) => ({ event: e, tv: await soft(tvListings(e.id), []) })));
    return all;
  }, [ids]);

  function choose(c: string) {
    setCountry(c);
    try { localStorage.setItem(COUNTRY_KEY, c); } catch { /* ignore */ }
  }

  if (!events.length) return <p className="muted card">No upcoming games listed.</p>;
  if (!listings.data) return <p className="muted center">Loading...</p>;
  const countries = [...new Set([...(deviceCountry ? [deviceCountry] : []), ...listings.data.flatMap((x) => x.tv.map((l) => normalizeCountry(l.country)))])].sort();
  const searchCountry = country === "All countries" ? null : country;

  return (
    <>
      <section className="card">
        <label className="muted small" htmlFor="country">Show channels for</label>
        <select id="country" className="search" value={country} onChange={(e) => choose(e.target.value)}>
          <option>All countries</option>
          {countries.map((c) => <option key={c}>{c}</option>)}
        </select>
      </section>
      {listings.data.map(({ event: e, tv }) => {
        const shown = searchCountry ? tv.filter((l) => matchesCountry(l.country, searchCountry)) : tv;
        const groups = byCountry(shown);
        return (
          <section key={e.id} className="card">
            <h2>{e.homeTeam} vs {e.awayTeam}</h2>
            <p className="muted small">{[e.date, e.time?.slice(0, 5), e.league].filter(Boolean).join(" · ")}</p>
            {groups.length ? (
              <ul className="watch">
                {groups.map((g) => (
                  <li key={g.country}><strong>{g.country}</strong><span className="muted"> {g.channels.map((c) => c.channel).join(", ")}</span></li>
                ))}
              </ul>
            ) : (
              <p className="muted small">No TV listings{searchCountry ? ` for ${searchCountry}` : ""} yet.</p>
            )}
            <a className="btn small" href={watchSearchUrl(e.homeTeam, e.awayTeam, searchCountry)} target="_blank" rel="noopener noreferrer">
              Search where to watch{searchCountry ? ` in ${searchCountry}` : ""}
            </a>
          </section>
        );
      })}
    </>
  );
}

function Feed({ favourites, tab, onTab }: { favourites: Favourite[]; tab: "news" | "highlights"; onTab: (t: "news" | "highlights") => void }) {
  const ids = favourites.map((f) => f.teamId).join(",");
  const data = useLoad(async () => {
    const per = await Promise.all(favourites.map(async (f) => tab === "news"
      ? { news: (await soft(teamNews(f.name, f.sport, 6), [])).map((n) => ({ ...n, team: f.name })), events: [] }
      : { news: [], events: (await soft(lastEvents(f.teamId), [])).map((e) => ({ ...e, team: f.name })) }));
    const seen = new Set<string>();
    return {
      news: per.flatMap((p) => p.news).filter((n) => !seen.has(n.link) && seen.add(n.link)).sort((a, b) => (b.published ?? "").localeCompare(a.published ?? "")),
      events: per.flatMap((p) => p.events).filter((e) => !seen.has(e.id) && seen.add(e.id)).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
    };
  }, [ids, tab]);

  if (!favourites.length) return <p className="muted center">Add some teams first and their news and highlights will show up here.</p>;
  return (
    <>
      <nav className="tabs">
        <button className={tab === "news" ? "active" : ""} onClick={() => onTab("news")}>News</button>
        <button className={tab === "highlights" ? "active" : ""} onClick={() => onTab("highlights")}>Highlights</button>
      </nav>
      {!data.data ? <p className="muted center">Loading...</p> : tab === "news"
        ? <section className="card"><NewsList items={data.data.news} showTeam /></section>
        : <Highlights events={data.data.events} showTeam />}
    </>
  );
}

function NewsList({ items, showTeam }: { items: (NewsItem & { team?: string })[]; showTeam?: boolean }) {
  if (!items.length) return <p className="muted">No news in the last week.</p>;
  return (
    <ul className="news">
      {items.map((n) => (
        <li key={n.link}>
          <a href={n.link} target="_blank" rel="noopener noreferrer">
            <span className="news-title">{n.title}</span>
            <span className="muted small">{[showTeam && n.team, n.source, timeAgo(n.published)].filter(Boolean).join(" · ")}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function Highlights({ teamName, sport, events, showTeam }: { teamName?: string; sport?: string; events: (GameEvent & { team?: string })[]; showTeam?: boolean }) {
  const clips = events.filter((e) => e.video && /^https?:\/\//.test(e.video));
  const search = teamName ? `https://www.youtube.com/results?search_query=${encodeURIComponent(`${teamName} ${sport ?? ""} highlights`.trim())}` : null;
  return (
    <section>
      {clips.length === 0 && <p className="muted card">No highlight clips are listed for recent games yet.</p>}
      <ul className="clips">
        {clips.map((e) => {
          const yt = youTubeId(e.video);
          const thumb = yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : e.thumb;
          return (
            <li key={e.id} className="card clip">
              <a href={e.video!} target="_blank" rel="noopener noreferrer">
                <div className="thumb">{thumb ? <img src={thumb} alt="" loading="lazy" /> : <div />}<span className="play" aria-hidden>▶</span></div>
                <strong>{e.homeTeam} {e.homeScore ?? ""}{e.homeScore != null ? " - " : " vs "}{e.awayScore ?? ""} {e.awayTeam}</strong>
                <span className="muted small block">{[showTeam && e.team, e.league, e.date].filter(Boolean).join(" · ")}</span>
              </a>
            </li>
          );
        })}
      </ul>
      {search && <a className="btn block-btn" href={search} target="_blank" rel="noopener noreferrer">More {teamName} highlights on YouTube</a>}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return <div className="stat"><span className="muted small">{label}</span><strong>{value}</strong>{hint && <span className="muted small">{hint}</span>}</div>;
}

function Games({ teamId, events }: { teamId: string; events: GameEvent[] }) {
  return (
    <ul className="games">
      {events.map((e) => {
        const o = outcomeFor(teamId, e);
        return (
          <li key={e.id}>
            <span className="muted small date">{e.date ?? ""}</span>
            <span className="grow">{e.homeTeam} {e.homeScore != null ? <strong>{e.homeScore} - {e.awayScore}</strong> : "vs"} {e.awayTeam}</span>
            {o && <span className={`pill ${o}`}>{o}</span>}
          </li>
        );
      })}
    </ul>
  );
}

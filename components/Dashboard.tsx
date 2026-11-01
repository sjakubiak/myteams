"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Favourite } from "@/lib/db.ts";
import type { Team } from "@/lib/sportsdb.ts";
import ScoreWatcher from "./ScoreWatcher.tsx";

export default function Dashboard({ initial }: { initial: Favourite[] }) {
  const [favourites, setFavourites] = useState(initial);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Team[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResults(data.teams);
      } catch (e) {
        setError((e as Error).message || "Search failed");
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  async function add(team: Team) {
    const res = await fetch("/api/favourites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ teamId: team.id, name: team.name, sport: team.sport, league: team.league, badge: team.badge }),
    });
    if (res.ok) {
      setFavourites((await res.json()).favourites);
      setQuery("");
    }
  }

  async function remove(teamId: string) {
    await fetch(`/api/favourites/${teamId}`, { method: "DELETE" });
    setFavourites((f) => f.filter((x) => x.teamId !== teamId));
  }

  async function toggleNotify(fav: Favourite) {
    const notify = !fav.notify;
    if (notify && "Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    const res = await fetch(`/api/favourites/${fav.teamId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notify }),
    });
    if (res.ok) setFavourites((f) => f.map((x) => (x.teamId === fav.teamId ? { ...x, notify } : x)));
  }

  const followed = new Set(favourites.map((f) => f.teamId));
  const bySport = favourites.reduce<Record<string, Favourite[]>>((acc, f) => {
    (acc[f.sport] ??= []).push(f);
    return acc;
  }, {});
  const anyNotify = favourites.some((f) => f.notify);

  return (
    <>
      {anyNotify && <ScoreWatcher />}

      <section className="card">
        <h2>Add a team</h2>
        <input
          className="search"
          placeholder="Search any team: Arsenal, Lakers, Yankees, Chiefs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search teams"
        />
        {searching && <p className="muted">Searching...</p>}
        {error && <p className="error">{error}</p>}
        {results.length > 0 && (
          <ul className="results">
            {results.map((t) => (
              <li key={t.id}>
                {t.badge && <img src={`${t.badge}/tiny`} alt="" width={28} height={28} />}
                <span className="grow">
                  <strong>{t.name}</strong>
                  <span className="muted"> {t.sport}{t.league ? ` · ${t.league}` : ""}</span>
                </span>
                {followed.has(t.id) ? (
                  <span className="muted">Added</span>
                ) : (
                  <button className="btn small" onClick={() => add(t)}>Add</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {favourites.length === 0 ? (
        <p className="muted center">No teams yet. Search above to add your first one.</p>
      ) : (
        Object.entries(bySport).map(([sport, teams]) => (
          <section key={sport}>
            <h2 className="sport">{sport}</h2>
            <ul className="teams">
              {teams.map((f) => (
                <li key={f.teamId} className="card team">
                  <Link href={`/team/${f.teamId}`} className="team-link">
                    {f.badge && <img src={`${f.badge}/tiny`} alt="" width={40} height={40} />}
                    <span>
                      <strong>{f.name}</strong>
                      {f.league && <span className="muted block">{f.league}</span>}
                    </span>
                  </Link>
                  <div className="team-actions">
                    <label className="switch" title="Notify me of final scores for this team">
                      <input type="checkbox" checked={f.notify} onChange={() => toggleNotify(f)} />
                      <span>Score alerts {f.notify ? "on" : "off"}</span>
                    </label>
                    <button className="btn ghost small" onClick={() => remove(f.teamId)} aria-label={`Remove ${f.name}`}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}

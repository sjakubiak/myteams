import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { playerStats, leagueTable } from "../lib/sportsdb.ts";

function fakeFetch(routes: Record<string, unknown>) {
  return mock.method(globalThis, "fetch", async (url: string) => {
    const key = Object.keys(routes).find((k) => String(url).includes(k));
    return new Response(JSON.stringify(key ? routes[key] : {}), { status: 200 });
  });
}

test("player stats are read defensively", async () => {
  const m = fakeFetch({ "lookupplayerstats.php": { playerstats: [
    { idPlayer: "1", strPlayer: "X", strSeason: "2025-2026", strLeague: "Premier League", intGoals: "12", intAssists: "5", intYellowCards: "0", strThumb: "x" },
  ] } });
  assert.deepEqual(await playerStats("1"), [
    { label: "2025-2026 · Premier League", values: [{ name: "Goals", value: "12" }, { name: "Assists", value: "5" }] },
  ]);
  m.mock.restore();
});

test("standings retry without season", async () => {
  const m = mock.method(globalThis, "fetch", async (url: string) => {
    const u = String(url);
    if (u.includes("lookupleague")) return new Response(JSON.stringify({ leagues: [{ strCurrentSeason: "2026-2027" }] }));
    if (u.includes("lookuptable") && u.includes("&s=")) return new Response(JSON.stringify({ table: null }));
    return new Response(JSON.stringify({ table: [{ intRank: "1", idTeam: "9", strTeam: "A", intPoints: "3" }] }));
  });
  const rows = await leagueTable("4328");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].team, "A");
  m.mock.restore();
});

test("retries after a 429", async () => {
  let n = 0;
  const m = mock.method(globalThis, "fetch", async () => {
    n++;
    return n === 1
      ? new Response("slow down", { status: 429, headers: { "retry-after": "0.01" } })
      : new Response(JSON.stringify({ teams: [{ idTeam: "1", strTeam: "A", strSport: "Soccer" }] }));
  });
  const { searchTeams } = await import("../lib/sportsdb.ts");
  const teams = await searchTeams("A");
  assert.equal(teams[0].name, "A");
  assert.equal(n, 2);
  m.mock.restore();
});

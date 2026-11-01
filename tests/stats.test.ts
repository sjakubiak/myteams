import { test } from "node:test";
import assert from "node:assert/strict";
import { summarise, outcomeFor, scoreLine, youTubeId, type GameEvent } from "../lib/stats.ts";

const ev = (id: string, date: string, homeId: string, awayId: string, h: number | null, a: number | null): GameEvent => ({
  id, name: "", date, time: null, league: null, homeId, awayId, homeTeam: `T${homeId}`, awayTeam: `T${awayId}`,
  homeScore: h, awayScore: a, status: null, video: null, thumb: null,
});

test("outcome from home and away perspective", () => {
  assert.equal(outcomeFor("1", ev("a", "2026-10-01", "1", "2", 3, 1)), "W");
  assert.equal(outcomeFor("2", ev("a", "2026-10-01", "1", "2", 3, 1)), "L");
  assert.equal(outcomeFor("1", ev("a", "2026-10-01", "1", "2", 0, 0)), "D");
  assert.equal(outcomeFor("1", ev("a", "2026-10-01", "1", "2", null, null)), null);
});

test("summary counts and newest-first form", () => {
  const s = summarise("1", [
    ev("a", "2026-10-01", "1", "2", 2, 0),
    ev("b", "2026-10-08", "3", "1", 1, 1),
    ev("c", "2026-10-15", "1", "4", 0, 2),
    ev("d", "2026-10-22", "1", "5", null, null),
  ]);
  assert.deepEqual(s, { played: 3, wins: 1, draws: 1, losses: 1, scored: 3, conceded: 3, form: ["L", "D", "W"] });
});

test("score line", () => {
  assert.equal(scoreLine(ev("a", "", "1", "2", 2, 1)), "T1 2 - 1 T2");
  assert.equal(scoreLine(ev("a", "", "1", "2", null, null)), "T1 vs T2");
});

test("youtube ids", () => {
  assert.equal(youTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(youTubeId("https://youtu.be/dQw4w9WgXcQ?t=3"), "dQw4w9WgXcQ");
  assert.equal(youTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(youTubeId("https://example.com/video"), null);
  assert.equal(youTubeId(null), null);
});

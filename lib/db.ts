import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type Favourite = {
  userId: string;
  teamId: string;
  name: string;
  sport: string;
  league: string | null;
  badge: string | null;
  /** Score notifications. Always false unless the user turns them on for this team. */
  notify: boolean;
  createdAt: string;
};

let db: DatabaseSync | null = null;

export function getDb(path = process.env.DATABASE_PATH ?? "./data/app.db"): DatabaseSync {
  if (db) return db;
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS favourites (
      user_id    TEXT NOT NULL,
      team_id    TEXT NOT NULL,
      name       TEXT NOT NULL,
      sport      TEXT NOT NULL,
      league     TEXT,
      badge      TEXT,
      notify     INTEGER NOT NULL DEFAULT 0 CHECK (notify IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, team_id)
    );
    CREATE TABLE IF NOT EXISTS seen_events (
      user_id  TEXT NOT NULL,
      event_id TEXT NOT NULL,
      PRIMARY KEY (user_id, event_id)
    );
  `);
  return db;
}

/** For tests only. */
export function resetDb() {
  db?.close();
  db = null;
}

type Row = {
  user_id: string; team_id: string; name: string; sport: string;
  league: string | null; badge: string | null; notify: number; created_at: string;
};

const toFavourite = (r: Row): Favourite => ({
  userId: r.user_id, teamId: r.team_id, name: r.name, sport: r.sport,
  league: r.league, badge: r.badge, notify: r.notify === 1, createdAt: r.created_at,
});

export function listFavourites(userId: string): Favourite[] {
  const rows = getDb()
    .prepare("SELECT * FROM favourites WHERE user_id = ? ORDER BY sport, name")
    .all(userId) as Row[];
  return rows.map(toFavourite);
}

export function getFavourite(userId: string, teamId: string): Favourite | null {
  const row = getDb()
    .prepare("SELECT * FROM favourites WHERE user_id = ? AND team_id = ?")
    .get(userId, teamId) as Row | undefined;
  return row ? toFavourite(row) : null;
}

/** Adds a team. Notifications start OFF; re-adding never changes an existing notify setting. */
export function addFavourite(
  userId: string,
  team: { teamId: string; name: string; sport: string; league?: string | null; badge?: string | null },
) {
  getDb()
    .prepare(
      `INSERT INTO favourites (user_id, team_id, name, sport, league, badge, notify)
       VALUES (?, ?, ?, ?, ?, ?, 0)
       ON CONFLICT (user_id, team_id) DO UPDATE SET
         name = excluded.name, sport = excluded.sport, league = excluded.league, badge = excluded.badge`,
    )
    .run(userId, team.teamId, team.name, team.sport, team.league ?? null, team.badge ?? null);
}

export function removeFavourite(userId: string, teamId: string) {
  getDb().prepare("DELETE FROM favourites WHERE user_id = ? AND team_id = ?").run(userId, teamId);
}

export function setNotify(userId: string, teamId: string, notify: boolean): boolean {
  const res = getDb()
    .prepare("UPDATE favourites SET notify = ? WHERE user_id = ? AND team_id = ?")
    .run(notify ? 1 : 0, userId, teamId);
  return Number(res.changes) > 0;
}

/** Returns the ids that were not seen before, and marks them all as seen. */
export function markEventsSeen(userId: string, eventIds: string[]): string[] {
  const d = getDb();
  const insert = d.prepare("INSERT OR IGNORE INTO seen_events (user_id, event_id) VALUES (?, ?)");
  return eventIds.filter((id) => Number(insert.run(userId, id).changes) > 0);
}

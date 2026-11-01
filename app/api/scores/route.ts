import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth.ts";
import { listFavourites, markEventsSeen } from "@/lib/db.ts";
import { lastEvents } from "@/lib/sportsdb.ts";
import { scoreLine } from "@/lib/stats.ts";

/**
 * New final scores, ONLY for teams the user has opted in to.
 * Teams with notifications off are never queried here.
 */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const optedIn = listFavourites(userId).filter((f) => f.notify);
  const alerts: { teamId: string; team: string; eventId: string; text: string }[] = [];

  for (const fav of optedIn) {
    let events;
    try {
      events = (await lastEvents(fav.teamId)).filter((e) => e.homeScore != null && e.awayScore != null);
    } catch {
      continue;
    }
    const fresh = new Set(markEventsSeen(userId, events.map((e) => e.id)));
    for (const e of events) {
      if (fresh.has(e.id)) alerts.push({ teamId: fav.teamId, team: fav.name, eventId: e.id, text: scoreLine(e) });
    }
  }
  return NextResponse.json({ alerts });
}

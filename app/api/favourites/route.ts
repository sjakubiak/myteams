import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth.ts";
import { addFavourite, listFavourites } from "@/lib/db.ts";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  return NextResponse.json({ favourites: listFavourites(userId) });
}

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.teamId || !body?.name || !body?.sport) {
    return NextResponse.json({ error: "teamId, name and sport are required" }, { status: 400 });
  }
  // Any "notify" field in the body is deliberately ignored: new teams always start with notifications off.
  addFavourite(userId, {
    teamId: String(body.teamId),
    name: String(body.name),
    sport: String(body.sport),
    league: body.league ?? null,
    badge: body.badge ?? null,
  });
  return NextResponse.json({ favourites: listFavourites(userId) }, { status: 201 });
}

import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth.ts";
import { markEventsSeen, removeFavourite, setNotify } from "@/lib/db.ts";
import { lastEvents } from "@/lib/sportsdb.ts";

type Ctx = { params: Promise<{ teamId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  removeFavourite(userId, (await params).teamId);
  return new NextResponse(null, { status: 204 });
}

/** Turn score notifications on or off for one team. Body: { notify: true | false } */
export async function PATCH(req: Request, { params }: Ctx) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { teamId } = await params;
  const body = await req.json().catch(() => null);
  if (typeof body?.notify !== "boolean") {
    return NextResponse.json({ error: "notify must be true or false" }, { status: 400 });
  }
  if (!setNotify(userId, teamId, body.notify)) {
    return NextResponse.json({ error: "Not one of your teams" }, { status: 404 });
  }
  if (body.notify) {
    // Don't fire alerts for games that finished before notifications were turned on.
    try {
      markEventsSeen(userId, (await lastEvents(teamId)).map((e) => e.id));
    } catch {
      /* the next poll will catch up */
    }
  }
  return NextResponse.json({ teamId, notify: body.notify });
}

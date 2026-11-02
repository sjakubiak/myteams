import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth.ts";
import { searchTeams } from "@/lib/sportsdb.ts";

export async function GET(req: Request) {
  if (!(await currentUserId())) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ teams: [] });
  try {
    return NextResponse.json({ teams: await searchTeams(q) });
  } catch (e) {
    console.error("Team search failed:", e);
    return NextResponse.json({ error: "Team search is unavailable right now" }, { status: 502 });
  }
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth.ts";
import { listFavourites } from "@/lib/db.ts";
import { teamNews } from "@/lib/news.ts";
import { lastEvents } from "@/lib/sportsdb.ts";
import NewsList from "@/components/NewsList.tsx";
import Highlights from "@/components/Highlights.tsx";

export const dynamic = "force-dynamic";

/** News and highlights across all of your teams. */
export default async function Feed({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const userId = await currentUserId();
  if (!userId) redirect("/");
  const tab = (await searchParams).tab === "highlights" ? "highlights" : "news";
  const favs = listFavourites(userId);

  if (!favs.length) {
    return <p className="muted center">Add some teams first and their news and highlights will show up here.</p>;
  }

  const perTeam = await Promise.all(
    favs.map(async (f) => {
      try {
        return tab === "news"
          ? { news: (await teamNews(f.name, f.sport, 6)).map((n) => ({ ...n, team: f.name })), events: [] }
          : { news: [], events: (await lastEvents(f.teamId)).map((e) => ({ ...e, team: f.name })) };
      } catch {
        return { news: [], events: [] };
      }
    }),
  );

  const seen = new Set<string>();
  const news = perTeam
    .flatMap((t) => t.news)
    .filter((n) => !seen.has(n.link) && seen.add(n.link))
    .sort((a, b) => (b.published ?? "").localeCompare(a.published ?? ""));
  const events = perTeam
    .flatMap((t) => t.events)
    .filter((e) => !seen.has(e.id) && seen.add(e.id))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return (
    <>
      <nav className="tabs" aria-label="Feed sections">
        <Link href="/feed?tab=news" className={tab === "news" ? "active" : ""} replace>News</Link>
        <Link href="/feed?tab=highlights" className={tab === "highlights" ? "active" : ""} replace>Highlights</Link>
      </nav>
      {tab === "news" ? (
        <section className="card"><NewsList items={news} showTeam /></section>
      ) : (
        <Highlights events={events} showTeam />
      )}
    </>
  );
}

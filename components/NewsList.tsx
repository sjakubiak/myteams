import { timeAgo, type NewsItem } from "@/lib/news.ts";

export default function NewsList({ items, showTeam }: { items: (NewsItem & { team?: string })[]; showTeam?: boolean }) {
  if (!items.length) return <p className="muted">No news in the last week.</p>;
  return (
    <ul className="news">
      {items.map((n) => (
        <li key={n.link}>
          <a href={n.link} target="_blank" rel="noopener noreferrer">
            <span className="news-title">{n.title}</span>
            <span className="muted small">
              {[showTeam && n.team, n.source, timeAgo(n.published)].filter(Boolean).join(" · ")}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

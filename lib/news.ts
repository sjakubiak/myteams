// Team news from Google News RSS (free, no key). Parsed without extra dependencies.

export type NewsItem = {
  title: string;
  link: string;
  source: string | null;
  published: string | null; // ISO date
};

const NEWS_BASE = process.env.NEWS_RSS_BASE_URL || "https://news.google.com/rss/search";

function decode(s: string): string {
  return s
    .replace(/^<!\[CDATA\[|\]\]>$/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .trim();
}

function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : null;
}

export function parseRss(xml: string, limit = 15): NewsItem[] {
  const items: NewsItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const body = m[1];
    const link = tag(body, "link");
    let title = tag(body, "title");
    if (!link || !title || !/^https?:\/\//.test(link)) continue;
    const source = tag(body, "source");
    // Google News appends " - Source" to titles; drop it since we show the source separately.
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    const date = tag(body, "pubDate");
    const parsed = date ? new Date(date) : null;
    items.push({ title, link, source, published: parsed && !isNaN(+parsed) ? parsed.toISOString() : null });
    if (items.length >= limit) break;
  }
  return items;
}

/** Latest headlines about a team. `sport` helps disambiguate names like "Giants" or "Kings". */
export async function teamNews(teamName: string, sport?: string, limit = 15): Promise<NewsItem[]> {
  const q = sport && sport !== "Soccer" ? `"${teamName}" ${sport}` : `"${teamName}"`;
  const url = `${NEWS_BASE}?q=${encodeURIComponent(q + " when:7d")}&hl=en-GB&gl=GB&ceid=GB:en`;
  const res = await fetch(url, { next: { revalidate: 900 } } as RequestInit);
  if (!res.ok) throw new Error(`News feed failed: ${res.status}`);
  return parseRss(await res.text(), limit);
}

export function timeAgo(iso: string | null, now = Date.now()): string {
  if (!iso) return "";
  const mins = Math.round((now - Date.parse(iso)) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

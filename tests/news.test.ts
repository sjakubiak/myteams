import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRss, timeAgo } from "../lib/news.ts";

const xml = `<?xml version="1.0"?><rss><channel><title>feed</title>
<item><title>Arsenal win derby &amp; go top - BBC Sport</title><link>https://news.example/1</link>
<pubDate>Sat, 31 Oct 2026 18:00:00 GMT</pubDate><source url="https://bbc.co.uk">BBC Sport</source></item>
<item><title><![CDATA[Saka's injury update]]></title><link>https://news.example/2</link></item>
<item><title>Bad link</title><link>javascript:alert(1)</link></item>
</channel></rss>`;

test("parses items, strips source suffix, decodes entities, drops unsafe links", () => {
  assert.deepEqual(parseRss(xml), [
    { title: "Arsenal win derby & go top", link: "https://news.example/1", source: "BBC Sport", published: "2026-10-31T18:00:00.000Z" },
    { title: "Saka's injury update", link: "https://news.example/2", source: null, published: null },
  ]);
});

test("time ago", () => {
  const now = Date.parse("2026-11-01T12:00:00Z");
  assert.equal(timeAgo("2026-11-01T11:30:00Z", now), "30m ago");
  assert.equal(timeAgo("2026-11-01T06:00:00Z", now), "6h ago");
  assert.equal(timeAgo("2026-10-29T12:00:00Z", now), "3d ago");
});

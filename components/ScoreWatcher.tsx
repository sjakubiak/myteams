"use client";
import { useEffect, useState } from "react";

const POLL_MS = 5 * 60 * 1000;

/**
 * Only mounted when at least one team has score alerts switched on.
 * Asks the server for new final scores of opted-in teams and shows them
 * as a browser notification (or an in-page banner if notifications are blocked).
 */
export default function ScoreWatcher() {
  const [banner, setBanner] = useState<string[]>([]);

  useEffect(() => {
    let stopped = false;
    async function poll() {
      try {
        const res = await fetch("/api/scores");
        if (!res.ok || stopped) return;
        const { alerts } = (await res.json()) as { alerts: { eventId: string; teamId: string; team: string; text: string }[] };
        if (!alerts.length) return;
        const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
        if (reg && "Notification" in window && Notification.permission === "granted") {
          // Android Chrome only allows notifications through the service worker.
          for (const a of alerts) {
            await reg.showNotification(`${a.team}: final score`, {
              body: a.text, tag: a.eventId, icon: "/icon-192.png", data: { url: `/team/${a.teamId}` },
            });
          }
        } else {
          setBanner((b) => [...alerts.map((a) => a.text), ...b].slice(0, 5));
        }
      } catch {
        /* try again next time */
      }
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);

  if (!banner.length) return null;
  return (
    <div className="banner" role="status">
      {banner.map((t, i) => (
        <div key={i}>{t}</div>
      ))}
      <button className="btn ghost small" onClick={() => setBanner([])}>Dismiss</button>
    </div>
  );
}

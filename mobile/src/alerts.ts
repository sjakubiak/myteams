import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { lastEvents } from "../../lib/sportsdb.ts";
import { scoreLine } from "../../lib/stats.ts";
import { markEventsSeen, type Favourite } from "./store.ts";

const native = Capacitor.isNativePlatform();

/** Asks Android for notification permission. Only called when the user switches alerts on for a team. */
export async function askPermission(): Promise<boolean> {
  if (!native) return "Notification" in window && (await Notification.requestPermission()) === "granted";
  const current = await LocalNotifications.checkPermissions();
  if (current.display === "granted") return true;
  return (await LocalNotifications.requestPermissions()).display === "granted";
}

/** Remembers a team's finished games so turning alerts on doesn't fire for old results. */
export async function primeTeam(teamId: string) {
  try {
    markEventsSeen((await lastEvents(teamId)).map((e) => e.id));
  } catch {
    /* next check catches up */
  }
}

let nextId = Math.floor(Date.now() / 1000) % 100000;

/** Checks new final scores for opted-in teams ONLY, and shows a notification for each. */
export async function checkScores(favourites: Favourite[]): Promise<string[]> {
  const shown: string[] = [];
  for (const fav of favourites.filter((f) => f.notify)) {
    let events;
    try {
      events = (await lastEvents(fav.teamId)).filter((e) => e.homeScore != null && e.awayScore != null);
    } catch {
      continue;
    }
    const fresh = new Set(markEventsSeen(events.map((e) => e.id)));
    for (const e of events.filter((x) => fresh.has(x.id))) {
      const text = scoreLine(e);
      shown.push(text);
      if (native) {
        await LocalNotifications.schedule({
          notifications: [{ id: nextId++, title: `${fav.name}: final score`, body: text, extra: { teamId: fav.teamId } }],
        });
      } else if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`${fav.name}: final score`, { body: text });
      }
    }
  }
  return shown;
}

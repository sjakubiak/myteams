# My Teams

Save your favourite teams from any sport and see their stats, news and highlights in one place. Installs on Android as an app.

- **Google sign-in** (NextAuth.js)
- **Any sport** via [TheSportsDB](https://www.thesportsdb.com/free_sports_api): football, basketball, NFL, MLB, NHL, rugby, cricket and more
- **Team stats**: league position and points, recent W-D-L record, scored/conceded, form, recent results, upcoming fixtures, full league table
- **News**: the last week of headlines for each team (Google News), plus a combined feed for all your teams
- **Highlights**: match highlight videos for recent games (open in the YouTube app), plus a link to more on YouTube
- **Android app**: installable from Chrome to your home screen, full screen with its own icon, bottom navigation, offline screen
- **Score alerts are OFF by default.** Every team starts with alerts off. They only turn on when you tick "Score alerts" on that specific team, and only for that team. Teams without alerts are never checked for scores. When you switch alerts on, games that already finished are skipped, so you only hear about new results.

## Run it

Needs Node 22.13 or newer.

1. Create a Google OAuth client at https://console.cloud.google.com/apis/credentials (type "Web application"), with the redirect URI `http://localhost:3000/api/auth/callback/google`.
2. `cp .env.example .env.local` and fill in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `NEXTAUTH_SECRET` (`openssl rand -base64 32`).
3. `npm install`
4. `npm run dev` and open http://localhost:3000

`npm test` runs the unit tests.

## Install on Android

The app must be running on an HTTPS address (see "Hosting" below; `localhost` works for testing on a computer).

1. Open the app's address in Chrome on your phone and sign in.
2. Tap the ⋮ menu, then **Install app** (or **Add to Home screen**).
3. My Teams now opens from your home screen like any other app.

To get score alerts on your phone, turn on "Score alerts" for a team and allow notifications when Android asks.

### Or install the APK

`android/` is a small Android app (a Trusted Web Activity) that opens the hosted app full screen, with its own icon and notifications. GitHub Actions builds it (`.github/workflows/android.yml`) and publishes `MyTeams.apk` under **Releases**. See DEPLOY.md, step 5, for setup. The same signed app can go on the Play Store later.

`public/.well-known/assetlinks.json` proves to Android that the APK and the website belong together, which hides the browser address bar. It must match the signing key's SHA-256 fingerprint.

## Hosting

Any Node host with a persistent disk works for the SQLite file, for example Railway or Fly.io with a volume, or a small VPS. Set the same environment variables as `.env.example`, set `NEXTAUTH_URL` to the public address, and add `https://<your-address>/api/auth/callback/google` as a redirect URI on the Google OAuth client.

## How it fits together

| Part | Where |
| --- | --- |
| Google sign-in | `lib/auth.ts`, `app/api/auth/[...nextauth]` |
| Favourites + alert settings (SQLite, built into Node) | `lib/db.ts` |
| Sports data client | `lib/sportsdb.ts` |
| Stats calculations | `lib/stats.ts` |
| Dashboard (search, add, remove, alert toggle) | `components/Dashboard.tsx` |
| Team stats page | `app/team/[id]/page.tsx` |
| Score alerts | `app/api/scores` + `components/ScoreWatcher.tsx` |
| Team news (Google News RSS) | `lib/news.ts`, `components/NewsList.tsx` |
| Highlights | `components/Highlights.tsx` |
| Combined news & highlights feed | `app/feed/page.tsx` |
| Android install (manifest, service worker, icons) | `app/manifest.ts`, `public/sw.js`, `public/icon-*.png` |

## Notes and limits

- Score alerts are checked every 5 minutes while the app is open. Push notifications when the app is closed would need Web Push and a background job; that's a natural next step.
- The free TheSportsDB key (`123`) has limited data (for example, fewer past results and some leagues without tables). A Patreon key from TheSportsDB unlocks the full data; set it as `SPORTSDB_API_KEY`.
- SQLite is fine for one person or a small group. For hosting on a serverless platform such as Vercel, swap `lib/db.ts` for a hosted database (Postgres, Turso).
- Highlight clips come from TheSportsDB, which only lists them for some games (mostly major football leagues). The YouTube link always works.

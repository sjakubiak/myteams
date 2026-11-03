# Publishing My Teams on Google Play

Everything you need to paste into Play Console. Images are in this folder.

## 1. Create the app

Play Console → **Create app**

| Field | Answer |
| --- | --- |
| App name | My Teams: Fan Tracker |
| Default language | English (United Kingdom) |
| App or game | App |
| Free or paid | Free |
| Declarations | Tick both (Developer Program Policies, US export laws) |

## 2. Store listing (Grow → Store presence → Main store listing)

**Short description** (80 characters max):

> Follow all your teams in one place: stats, results, news and highlights.

**Full description:**

> My Teams brings every team you follow, across every sport, into one simple app.
>
> • Football, basketball, American football, baseball, ice hockey, rugby, cricket and more
> • League position, points, recent form, results and upcoming fixtures
> • Full league tables
> • The latest news for each team, plus a combined feed for all your teams
> • Match highlights
> • Optional score alerts, off by default and switched on team by team, so you only hear about the teams you choose
>
> No account and no sign-in. Your teams are saved on your phone and never leave it. No ads and no tracking.
>
> My Teams is an unofficial fan app. It is not affiliated with, endorsed by or connected to any team, league or governing body. Team names and logos belong to their owners. Data from TheSportsDB and Google News.

**Graphics:**
- App icon: `icon-512.png`
- Feature graphic: `feature-graphic.png`
- Phone screenshots: `screenshot-1-teams.png`, `screenshot-2-stats.png`, `screenshot-3-news.png` (screenshots from your own phone with your real teams look even better)

**Category:** Sports. **Contact email:** your email. **Privacy policy:** https://github.com/sjakubiak/myteams/blob/main/PRIVACY.md (this link works once the change is merged to `main`).

## 3. App content (Policy → App content)

| Section | Answer |
| --- | --- |
| Privacy policy | URL above |
| Ads | No, my app does not contain ads |
| App access | All functionality is available without special access |
| Content rating | Category: "All other app types". Answer **No** to every question (violence, sexual content, language, controlled substances, gambling, user interaction, sharing location, digital purchases). Expected rating: Everyone / PEGI 3 |
| Target audience | 18 and over (simplest; avoids the extra Families rules) |
| News app | No (it's a sports stats app; news is a secondary feature) |
| Data safety | See below |
| Government app | No |
| Financial features | My app doesn't provide any financial features |
| Health | My app does not have any health features |

**Data safety answers:**
- Does your app collect or share any of the required user data types? **No**
- Is all of the user data collected by your app encrypted in transit? **Yes**
- Do you provide a way for users to request that their data is deleted? **No** (nothing is collected; uninstalling removes everything)

## 4. Upload and test

1. **Test and release → Testing → Closed testing → Create track** (or use "Alpha").
2. **Testers:** create an email list with at least **12 people** with Android phones (friends and family are fine). Copy the opt-in link and send it to them.
3. **Create new release.** When asked about app signing, choose **Use Google-generated key** (Play App Signing). Upload `MyTeams-release-signed.aab`.
4. Release name: `1.0`. Release notes: `First release.` Save, review, and **Start rollout to Closed testing**.

New personal developer accounts must keep the closed test running with at least 12 opted-in testers for **14 days in a row** before they can apply for production. After 14 days: **Dashboard → Apply for production**, answer the short questions about the test, and Google reviews it (usually a few days).

## 5. Updates

Each new build on GitHub gets a higher version number. Upload the new signed `.aab` as a new release on the same track. It must be signed with the same upload key (`myteams-release.jks`, kept in your private project files). If that key is ever lost, Play support can reset the upload key.

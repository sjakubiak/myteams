# Put My Teams online and install it on Android

About 15 minutes. You'll end up with an address like `https://myteams-production.up.railway.app` that you open on your phone.

## 1. Deploy on Railway

1. Go to https://railway.com and sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → pick **sjakubiak/myteams**. Railway finds the Dockerfile and starts building.
3. Open the service → **Settings** → **Networking** → **Generate Domain**. Copy the address it gives you (this is your app's address).
4. Right-click the service → **Attach volume**, mount path `/data`. This keeps your saved teams between deploys.

## 2. Create the Google sign-in key

1. Go to https://console.cloud.google.com/apis/credentials (create a project if asked, any name).
2. If asked, set up the **OAuth consent screen**: External, app name "My Teams", your email. Under **Test users**, add your own Gmail address.
3. **Create credentials** → **OAuth client ID** → type **Web application**.
4. Under **Authorised redirect URIs**, add: `https://YOUR-ADDRESS/api/auth/callback/google` (use the address from step 1.3).
5. Copy the **Client ID** and **Client secret**.

## 3. Add the settings on Railway

Service → **Variables** → add:

| Name | Value |
| --- | --- |
| `GOOGLE_CLIENT_ID` | from step 2.5 |
| `GOOGLE_CLIENT_SECRET` | from step 2.5 |
| `NEXTAUTH_URL` | `https://YOUR-ADDRESS` |
| `NEXTAUTH_SECRET` | any long random string (e.g. from https://generate-secret.vercel.app/32) |
| `SPORTSDB_API_KEY` | `3` |

Railway redeploys automatically when you save.

## 4. Install on your phone

1. Open `https://YOUR-ADDRESS` in **Chrome** on your Android phone and sign in with Google.
2. Tap **⋮** → **Install app**.
3. Open **My Teams** from your home screen and add your teams.

Score alerts stay off until you tick "Score alerts" on a team. When you do, allow notifications when Android asks.

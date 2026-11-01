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

## 5. (Optional) Build the Android APK

The APK is a real Android app that opens My Teams full screen. You only set this up once; after that GitHub builds a new APK automatically.

On GitHub, open **myteams → Settings → Secrets and variables → Actions**:

1. **Variables** tab → **New repository variable**: name `APP_URL`, value `https://YOUR-ADDRESS` (no slash at the end).
2. **Secrets** tab → **New repository secret**: name `ANDROID_KEYSTORE_BASE64`, value = the whole contents of `keystore-base64.txt` (in the project files Claude gave you).
3. **Secrets** tab → **New repository secret**: name `ANDROID_KEYSTORE_PASSWORD`, value = the contents of `password.txt`.
4. **Actions** tab → **Android APK** → **Run workflow**.

After about 3 minutes, a new entry appears under **Releases** on the repo's main page. On your phone, open it, tap **MyTeams.apk**, and allow installing from your browser when Android asks.

Keep `myteams-release.jks` and its password safe: every future update must be signed with the same key, or Android won't install it over the old version.

import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// On Render, use the address it assigns when NEXTAUTH_URL isn't set.
if (!process.env.NEXTAUTH_URL && process.env.RENDER_EXTERNAL_URL) {
  process.env.NEXTAUTH_URL = process.env.RENDER_EXTERNAL_URL;
}

export const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

/**
 * "Try the demo" sign-in, for testing before Google is set up. On when DEMO_MODE=1, or automatically
 * when Google sign-in isn't configured (the app couldn't be used otherwise). Off once Google is set up.
 */
export const demoMode = process.env.DEMO_MODE === "1" || !googleConfigured;

export const authOptions: NextAuthOptions = {
  providers: [
    ...(googleConfigured || !demoMode
      ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID ?? "", clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "" })]
      : []),
    ...(demoMode
      ? [CredentialsProvider({
          id: "demo",
          name: "Demo",
          credentials: {},
          authorize: async () => ({ id: "demo-user", name: "Demo user" }),
        })]
      : []),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    // Expose the stable Google account id so favourites are keyed per user.
    session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = token.sub;
      return session;
    },
  },
};

/** The signed-in user's id, or null. */
export async function currentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

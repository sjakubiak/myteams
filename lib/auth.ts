import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

/** DEMO_MODE=1 adds a "Try the demo" sign-in for testing without Google set up. Never turn it on for real use. */
export const demoMode = process.env.DEMO_MODE === "1";
export const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

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

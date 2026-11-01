import { currentUserId, demoMode, googleConfigured } from "@/lib/auth.ts";
import { listFavourites } from "@/lib/db.ts";
import Dashboard from "@/components/Dashboard.tsx";
import { SignInButton } from "@/components/AuthButtons.tsx";

export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await currentUserId();
  if (!userId) {
    return (
      <section className="hero">
        <h1>All your teams. Every stat.</h1>
        <p className="muted">Follow teams across football, basketball, baseball, hockey, rugby and more. Score alerts stay off unless you switch them on for a team.</p>
        <SignInButton google={googleConfigured || !demoMode} demo={demoMode} />
      </section>
    );
  }
  return <Dashboard initial={listFavourites(userId)} />;
}

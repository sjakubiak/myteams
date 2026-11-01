import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.ts";
import { SignOutButton } from "@/components/AuthButtons.tsx";
import BottomNav from "@/components/BottomNav.tsx";
import RegisterSW from "@/components/RegisterSW.tsx";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Teams",
  description: "Your favourite teams: stats, news and highlights.",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  appleWebApp: { capable: true, title: "My Teams" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1a73e8", viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body>
        <header className="top">
          <Link href="/" className="brand">My Teams</Link>
          {session?.user && (
            <div className="who">
              {session.user.image && <img src={session.user.image} alt="" width={28} height={28} className="avatar" />}
              <SignOutButton />
            </div>
          )}
        </header>
        <main className={session?.user ? "with-nav" : ""}>{children}</main>
        {session?.user && <BottomNav />}
        <RegisterSW />
      </body>
    </html>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const path = usePathname();
  const feed = path.startsWith("/feed");
  return (
    <nav className="bottom-nav" aria-label="Main">
      <Link href="/" className={!feed ? "active" : ""}><span aria-hidden>★</span>My teams</Link>
      <Link href="/feed" className={feed ? "active" : ""}><span aria-hidden>▤</span>News & highlights</Link>
    </nav>
  );
}

"use client";
import { signIn, signOut } from "next-auth/react";

export function SignInButton({ google = true, demo = false }: { google?: boolean; demo?: boolean }) {
  return (
    <div className="signin">
      {google && (
        <button className="btn primary" onClick={() => signIn("google", { callbackUrl: "/" })}>
          Sign in with Google
        </button>
      )}
      {demo && (
        <button className="btn" onClick={() => signIn("demo", { callbackUrl: "/" })}>
          Try the demo
        </button>
      )}
    </div>
  );
}

export function SignOutButton() {
  return (
    <button className="btn ghost" onClick={() => signOut({ callbackUrl: "/" })}>
      Sign out
    </button>
  );
}

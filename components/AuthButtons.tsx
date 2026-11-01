"use client";
import { signIn, signOut } from "next-auth/react";

export function SignInButton() {
  return (
    <button className="btn primary" onClick={() => signIn("google", { callbackUrl: "/" })}>
      Sign in with Google
    </button>
  );
}

export function SignOutButton() {
  return (
    <button className="btn ghost" onClick={() => signOut({ callbackUrl: "/" })}>
      Sign out
    </button>
  );
}

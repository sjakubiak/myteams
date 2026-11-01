"use client";
import { useEffect } from "react";

/** Registers the service worker that makes the app installable and shows alerts on Android. */
export default function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

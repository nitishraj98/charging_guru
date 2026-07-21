"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This page used to render a fully fabricated "journey reserved" success
// screen (random journey ID, fake QR code, no real booking behind it).
// Route planning now books a real slot via the normal booking flow and
// redirects straight to /pay/[id], so nothing should ever link here anymore —
// this redirect only catches stale bookmarks/history entries.
export default function JourneyNewPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/plan"); }, [router]);
  return null;
}

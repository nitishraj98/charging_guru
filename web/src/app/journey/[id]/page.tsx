"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This page called routes.get(id) -> GET /api/v1/routes/{id}, a backend
// endpoint that never existed, so it always rendered "Journey not found."
// Route planning now books through the real /bookings + /pay flow, so a
// booking's status lives on /trips instead. This redirect only catches
// stale bookmarks/history entries.
export default function JourneyDetailPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/trips"); }, [router]);
  return null;
}

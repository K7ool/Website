import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const STALE_THRESHOLD_MS = 120_000;

export async function GET() {
  try {
    const snap = await adminDb.collection("activeSessions").get();
    const now = Date.now();
    const sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const active = sessions.filter((s: any) => {
      if (!s.lastHeartbeat) return false;
      return now - new Date(s.lastHeartbeat).getTime() < STALE_THRESHOLD_MS;
    });

    const stale = sessions.filter((s: any) => {
      if (!s.lastHeartbeat) return true;
      return now - new Date(s.lastHeartbeat).getTime() >= STALE_THRESHOLD_MS;
    });

    return NextResponse.json({ success: true, active, stale, totalPlayers: active.reduce((sum: number, s: any) => sum + (s.playerCount || 0), 0) });
  } catch (err: any) {
    console.error("[LICENSE_ACTIVE_SESSIONS] Error:", err);
    return NextResponse.json({ success: false, reason: "SERVER_ERROR", error: err.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const snap = await adminDb.collection("onlineServers").get();

    // Filter out servers that haven't sent a heartbeat in the last 2 minutes
    const staleCutoff = new Date(Date.now() - 120_000).toISOString();
    
    const active = snap.docs
      .filter(doc => {
        const hb = doc.data().lastHeartbeat;
        return hb && hb >= staleCutoff;
      })
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    return NextResponse.json({ success: true, active });
  } catch (err: any) {
    console.error("[SERVERS_ACTIVE] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

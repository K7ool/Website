import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    let body: {
      universeId: number;
      placeId: number;
      serverId: string;
      playerCount: number;
      maxPlayers: number;
      gameName: string;
      players: { userId: number; name: string; displayName: string }[];
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, reason: "INVALID_BODY" }, { status: 400 });
    }

    const { universeId, placeId, serverId, playerCount, maxPlayers, gameName, players } = body;

    if (!serverId) {
      return NextResponse.json({ success: false, reason: "MISSING_SERVER_ID" }, { status: 400 });
    }

    const docRef = adminDb.collection("onlineServers").doc(serverId);

    await docRef.set({
      universeId: universeId || null,
      placeId: placeId || null,
      serverId,
      playerCount: playerCount ?? 0,
      maxPlayers: maxPlayers ?? 0,
      gameName: gameName || null,
      players: players || [],
      lastHeartbeat: new Date().toISOString(),
    }, { merge: true });

    // Note: We use merge: true so we don't overwrite a potential 'startedAt' if we were tracking it,
    // though setting it directly on heartbeat is easiest for a stateless tracker.

    return NextResponse.json({ success: true, serverId });
  } catch (err: any) {
    console.error("[SERVERS_HEARTBEAT] Error:", err);
    return NextResponse.json({ success: false, reason: "SERVER_ERROR", error: err.message }, { status: 500 });
  }
}

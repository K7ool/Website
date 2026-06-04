import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    let body: { licenseId?: string; licenseKey?: string; universeId?: number; placeId?: number; serverId?: string; playerCount?: number; maxPlayers?: number; sessionId?: string; gameName?: string };
    try { body = await req.json(); } catch { return NextResponse.json({ success: false, reason: "INVALID_BODY" }, { status: 400 }); }

    const { licenseId, licenseKey, universeId, placeId, serverId, playerCount, maxPlayers, sessionId, gameName } = body;

    if (sessionId) {
      const updates: Record<string, any> = {
        playerCount: playerCount ?? 0,
        maxPlayers: maxPlayers ?? 0,
        lastHeartbeat: new Date().toISOString(),
      };
      if (gameName) updates.gameName = gameName;
      await adminDb.collection("activeSessions").doc(sessionId).update(updates);
      return NextResponse.json({ success: true, sessionId });
    }

    if (!licenseId) return NextResponse.json({ success: false, reason: "MISSING_LICENSE_ID" }, { status: 400 });

    const snap = await adminDb.collection("activeSessions")
      .where("licenseId", "==", licenseId)
      .where("serverId", "==", serverId || "")
      .limit(1)
      .get();

    if (snap.empty) {
      const licSnap = await adminDb.collection("licenses").doc(licenseId).get();
      if (licSnap.exists) {
        const lic = licSnap.data();
        const maxConcurrent = lic?.maxConcurrentServers || 0;
        if (maxConcurrent > 0) {
          const activeSnap = await adminDb.collection("activeSessions")
            .where("licenseId", "==", licenseId)
            .get();
          const staleCutoff = new Date(Date.now() - 120_000).toISOString();
          const activeCount = activeSnap.docs.filter((d) => {
            const hb = d.data().lastHeartbeat;
            return hb && hb >= staleCutoff;
          }).length;
          if (activeCount >= maxConcurrent) {
            console.warn(`[LICENSE_HEARTBEAT] License ${licenseId} at max concurrent servers (${maxConcurrent})`);
            return NextResponse.json({ success: false, reason: "MAX_CONCURRENT_SERVERS", maxConcurrentServers: maxConcurrent }, { status: 429 });
          }
        }
      }

      const ref = await adminDb.collection("activeSessions").add({
        licenseId,
        licenseKey: licenseKey || null,
        universeId: universeId || null,
        placeId: placeId || null,
        serverId: serverId || null,
        playerCount: playerCount ?? 0,
        maxPlayers: maxPlayers ?? 0,
        gameName: gameName || null,
        startedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, sessionId: ref.id, created: true });
    }

    const doc = snap.docs[0];
    const updates: Record<string, any> = {
      playerCount: playerCount ?? 0,
      maxPlayers: maxPlayers ?? 0,
      lastHeartbeat: new Date().toISOString(),
    };
    if (gameName) updates.gameName = gameName;
    await doc.ref.update(updates);
    return NextResponse.json({ success: true, sessionId: doc.id, created: false });
  } catch (err: any) {
    console.error("[LICENSE_HEARTBEAT] Error:", err);
    return NextResponse.json({ success: false, reason: "SERVER_ERROR", error: err.message }, { status: 500 });
  }
}

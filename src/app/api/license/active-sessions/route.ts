import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const STALE_THRESHOLD_MS = 120_000;
const ROBLOX_HEADERS = { "User-Agent": "FlippStudios/1.0", Accept: "application/json" };

async function fetchJson(url: string) {
  try {
    const res = await fetch(url, { headers: ROBLOX_HEADERS, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function getGameInfo(universeIds: string[]): Promise<Record<string, { name: string; thumbnail: string }>> {
  if (!universeIds.length) return {};
  const gameRes = await fetchJson(`https://games.roblox.com/v1/games?universeIds=${universeIds.join(",")}`);
  const games: Record<string, { name: string; thumbnail: string }> = {};
  if (gameRes?.data) {
    for (const g of gameRes.data) {
      games[String(g.id)] = { name: g.name, thumbnail: "" };
    }
  }
  const thumbRes = await fetchJson(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIds.join(",")}&size=512x512&format=Png`);
  if (thumbRes?.data) {
    for (const t of thumbRes.data) {
      const id = String(t.targetId);
      if (games[id]) games[id].thumbnail = t.imageUrl || "";
    }
  }
  return games;
}

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

    const universeIds = [...new Set(active.map((s: any) => s.universeId).filter(Boolean))] as string[];
    const gameInfo = await getGameInfo(universeIds);

    const enrich = (s: any) => ({
      ...s,
      gameName: s.universeId ? gameInfo[s.universeId]?.name || null : null,
      gameThumbnail: s.universeId ? gameInfo[s.universeId]?.thumbnail || null : null,
    });

    return NextResponse.json({
      success: true,
      active: active.map(enrich),
      stale: stale.map(enrich),
      totalPlayers: active.reduce((sum: number, s: any) => sum + (s.playerCount || 0), 0),
    });
  } catch (err: any) {
    console.error("[LICENSE_ACTIVE_SESSIONS] Error:", err);
    return NextResponse.json({ success: false, reason: "SERVER_ERROR", error: err.message }, { status: 500 });
  }
}

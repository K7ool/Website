import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const ROBLOX_HEADERS = { "User-Agent": "FlippStudios/1.0", Accept: "application/json" };

async function fetchJson(url: string) {
  try {
    const res = await fetch(url, { headers: ROBLOX_HEADERS, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!checkRateLimit(ip, { max: 20, windowMs: 60_000, store: "roblox-game" })) {
      return NextResponse.json({ success: false, error: "RATE_LIMIT_EXCEEDED" }, { status: 429 });
    }

    const universeId = req.nextUrl.searchParams.get("universeId");
    const placeId = req.nextUrl.searchParams.get("placeId");

    let resolvedUniverseId = universeId ? Number(universeId) : null;

    // If only placeId provided, resolve universe
    if (!resolvedUniverseId && placeId) {
      const universeRes = await fetchJson(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
      resolvedUniverseId = universeRes?.universeId || null;
    }

    if (!resolvedUniverseId) {
      return NextResponse.json({ success: false, error: "Valid universeId or placeId is required" }, { status: 400 });
    }

    const [gameData, thumbs, socialLinks, places] = await Promise.all([
      fetchJson(`https://games.roblox.com/v1/games?universeIds=${resolvedUniverseId}`),
      fetchJson(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${resolvedUniverseId}&size=512x512&format=Png`),
      fetchJson(`https://games.roblox.com/v1/games/${resolvedUniverseId}/social-links/list`),
      fetchJson(`https://games.roblox.com/v1/games/${resolvedUniverseId}/places?limit=100`),
    ]);

    const game = gameData?.data?.[0];
    if (!game) {
      return NextResponse.json({ success: false, error: "Game not found" }, { status: 404 });
    }

    const iconUrl = thumbs?.data?.[0]?.imageUrl || "";

    // Fetch game thumbs (multiple sizes)
    const [thumbSm, thumbMd, thumbLg] = await Promise.all([
      fetchJson(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${resolvedUniverseId}&size=256x256&format=Png`),
      fetchJson(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${resolvedUniverseId}&size=512x512&format=Png`),
      fetchJson(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${resolvedUniverseId}&size=1024x1024&format=Png`),
    ]);

    // Fetch game passes
    const gamePasses = await fetchJson(`https://games.roblox.com/v1/games/${resolvedUniverseId}/game-passes?limit=50`);

    // Fetch social links
    const socials = (socialLinks?.data || []).map((s: any) => ({
      type: s.type,
      url: s.url,
      title: s.title,
    }));

    // Fetch places info
    const placeList = (places?.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      maxPlayers: p.maxPlayerCount || 0,
      order: p.order || 0,
      isStart: p.isStart || false,
      rank: p.rank || 0,
    }));

    // Creator info
    let creator = null;
    if (game.creator) {
      creator = {
        type: game.creator.type || "",
        id: game.creator.id || 0,
        name: game.creator.name || "",
        isRGroup: game.creator.isRGroup || false,
        hasVerifiedBadge: game.creator.hasVerifiedBadge || false,
      };
    }

    // Genre info
    const data = {
      id: resolvedUniverseId,
      name: game.name,
      description: game.description || "",
      creator,
      iconUrl,
      thumbSm: thumbSm?.data?.[0]?.imageUrl || iconUrl,
      thumbMd: thumbMd?.data?.[0]?.imageUrl || iconUrl,
      thumbLg: thumbLg?.data?.[0]?.imageUrl || iconUrl,
      playing: game.playing || 0,
      visits: game.visits || 0,
      maxPlayers: game.maxPlayers || 0,
      genres: game.genres || [],
      genreList: game.genreList || [],
      creatorType: game.creatorType || "",
      creatorTargetId: game.creatorTargetId || 0,
      totalUpVotes: game.totalUpVotes || 0,
      totalDownVotes: game.totalDownVotes || 0,
      commentCount: game.commentCount || 0,
      favoritedCount: game.favoritedCount || 0,
      likedCount: game.likedCount || 0,
      universeId: resolvedUniverseId,
      rootPlaceId: game.rootPlaceId || 0,
      created: game.created || "",
      updated: game.updated || "",
      studioURL: game.studioURL || "",
      websiteURL: game.websiteURL || `https://www.roblox.com/games/${game.rootPlaceId || resolvedUniverseId}`,
      socialLinks: socials,
      places: placeList,
      gamePasses: (gamePasses?.data || []).map((gp: any) => ({
        id: gp.id,
        name: gp.name,
        displayName: gp.displayName || gp.name,
        description: gp.description || "",
        price: gp.price || 0,
        isForSale: gp.isForSale || false,
        isIconFinal: gp.isIconFinal || false,
        thumbnailUrl: gp.thumbnailUrl || "",
      })),
    };

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return NextResponse.json({ success: false, error: "Roblox API timeout" }, { status: 504 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

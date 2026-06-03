import { NextRequest, NextResponse } from "next/server";

const ROBLOX_HEADERS = {
  "User-Agent": "FlippStudios/1.0",
  Accept: "application/json",
};

async function fetchJson(url: string, opts?: RequestInit) {
  const res = await fetch(url, { ...opts, headers: { ...ROBLOX_HEADERS, ...opts?.headers }, signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  return res.json();
}

async function getUniverseInfo(placeId: number) {
  const universeRes = await fetchJson(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
  const universeId = universeRes?.universeId;
  if (!universeId) return null;
  const gameRes = await fetchJson(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
  const game = gameRes?.data?.[0];
  if (!game) return null;
  const thumbRes = await fetchJson(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=Png`);
  return {
    universeId,
    name: game.name,
    description: game.description || "",
    thumbnail: thumbRes?.data?.[0]?.imageUrl || "",
    placeId,
    rootPlaceId: game.rootPlaceId || placeId,
  };
}

async function resolveUser(query: string): Promise<{ id: number; name: string } | null> {
  if (/^\d+$/.test(query)) {
    const profile = await fetchJson(`https://users.roblox.com/v1/users/${query}`);
    if (profile?.id) return { id: profile.id, name: profile.name };
    return null;
  }
  const data = await fetchJson("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    body: JSON.stringify({ usernames: [query], excludeBannedUsers: true }),
  });
  if (data?.data?.length) return { id: data.data[0].id, name: data.data[0].name };
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query?.trim()) {
      return NextResponse.json({ success: false, error: "Query is required" }, { status: 400 });
    }

    const resolved = await resolveUser(query.trim());
    if (!resolved) {
      return NextResponse.json({ success: false, error: "Roblox user not found" }, { status: 404 });
    }

    const { id: userId, name: username } = resolved;

    const [
      profile, thumbHeadshotSm, thumbHeadshotLg, thumbFull, thumb3d,
      games, favGames, groups, friendsCount, followersCount, followingCount,
      badges, collectibles, presence, currency, status,
    ] = await Promise.all([
      fetchJson(`https://users.roblox.com/v1/users/${userId}`),
      fetchJson(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png`),
      fetchJson(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=720x720&format=Png`),
      fetchJson(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png`),
      fetchJson(`https://thumbnails.roblox.com/v1/users/avatar-3d?userIds=${userId}`),
      fetchJson(`https://games.roblox.com/v2/users/${userId}/games?accessFilter=2&limit=50`),
      fetchJson(`https://games.roblox.com/v2/users/${userId}/favourite/games?limit=50`),
      fetchJson(`https://groups.roblox.com/v1/users/${userId}/groups/roles`),
      fetchJson(`https://friends.roblox.com/v1/users/${userId}/friends/count`),
      fetchJson(`https://friends.roblox.com/v1/users/${userId}/followers/count`),
      fetchJson(`https://friends.roblox.com/v1/users/${userId}/followings/count`),
      fetchJson(`https://badges.roblox.com/v1/users/${userId}/badges?limit=100`),
      fetchJson(`https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?limit=100`),
      fetchJson(`https://presence.roblox.com/v1/presence/users`, {
        method: "POST",
        body: JSON.stringify({ userIds: [userId] }),
      }),
      fetchJson(`https://economy.roblox.com/v1/users/${userId}/currency`),
      fetchJson(`https://users.roblox.com/v1/users/${userId}/status`),
    ]);

    const presenceData = presence?.userPresences?.[0];
    const currentGame = presenceData?.userPresenceType === 2
      ? await getUniverseInfo(presenceData.placeId)
      : null;
    const accountAge = profile?.created
      ? Math.floor((Date.now() - new Date(profile.created).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const data = {
      userId,
      username,
      displayName: profile?.displayName || username,
      description: profile?.description || "",
      created: profile?.created,
      accountAgeDays: accountAge,
      profileUrl: `https://www.roblox.com/users/${userId}/profile`,
      avatarHeadshot: thumbHeadshotSm?.data?.[0]?.imageUrl || "",
      avatarHeadshotHd: thumbHeadshotLg?.data?.[0]?.imageUrl || "",
      avatarFull: thumbFull?.data?.[0]?.imageUrl || "",
      avatar3d: thumb3d?.data?.[0]?.imageUrl || "",
      isBanned: profile?.isBanned || false,
      hasVerifiedBadge: profile?.hasVerifiedBadge || false,
      friendsCount: friendsCount?.count ?? 0,
      followersCount: followersCount?.count ?? 0,
      followingCount: followingCount?.count ?? 0,
      online: presenceData?.userPresenceType ?? 0,
      lastOnline: presenceData?.lastOnline || "",
      lastLocation: presenceData?.lastLocation || "",
      placeId: presenceData?.placeId ?? null,
      rootPlaceId: presenceData?.rootPlaceId ?? null,
      gameId: presenceData?.gameId || null,
      currentGame,
      robux: currency?.robux ?? 0,
      userStatus: status?.status || "",
      games: (games?.data || []).slice(0, 50).map((g: any) => ({
        id: g.id,
        name: g.name,
        visits: g.visits,
        playing: g.playing,
        image: g.thumbnailUrl?.[0]?.imageUrl || "",
        url: `https://www.roblox.com/games/${g.id || g.universeId}`,
      })),
      favoriteGames: (favGames?.data || []).slice(0, 50).map((g: any) => ({
        id: g.id,
        name: g.name,
        visits: g.visits,
        image: g.thumbnailUrl?.[0]?.imageUrl || "",
        url: `https://www.roblox.com/games/${g.id || g.universeId}`,
      })),
      groups: (groups?.data || []).map((g: any) => ({
        id: g.group?.id,
        name: g.group?.name,
        emblemUrl: g.group?.emblemUrl,
        role: g.role?.name,
        rank: g.role?.rank,
      })),
      badges: (badges?.data || []).slice(0, 100).map((b: any) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        imageUrl: b.iconImageUrl || "",
      })),
      collectibles: (collectibles?.data || []).slice(0, 100).map((c: any) => ({
        assetId: c.assetId,
        name: c.name,
        thumbnailUrl: c.thumbnailUrl || "",
        recentAveragePrice: c.recentAveragePrice,
      })),
    };

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

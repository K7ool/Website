import { NextRequest, NextResponse } from "next/server";

const ROBLOX_HEADERS = { "User-Agent": "FlippStudios/1.0", Accept: "application/json" };

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId || !/^\d+$/.test(userId)) {
      return new NextResponse("Invalid userId", { status: 400 });
    }

    const isCircular = req.nextUrl.searchParams.get("circle") === "1";
    const size = req.nextUrl.searchParams.get("size") || "150x150";

    // Fetch thumbnail URL from Roblox API server-side
    const thumbUrl = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=${size}&format=Png${isCircular ? "&isCircular=true" : ""}`;
    const thumbRes = await fetch(thumbUrl, {
      headers: ROBLOX_HEADERS,
      signal: AbortSignal.timeout(8000),
    });

    if (!thumbRes.ok) {
      return new NextResponse("Thumbnail API error", { status: 502 });
    }

    const thumbData = await thumbRes.json();
    const imageUrl = thumbData?.data?.[0]?.imageUrl;

    if (!imageUrl) {
      return new NextResponse("No image found", { status: 404 });
    }

    // Fetch the actual image from Roblox CDN
    const imageRes = await fetch(imageUrl, {
      headers: ROBLOX_HEADERS,
      signal: AbortSignal.timeout(8000),
    });

    if (!imageRes.ok) {
      return new NextResponse("CDN fetch failed", { status: 502 });
    }

    // Return the image with proper cache headers
    const imageBuffer = await imageRes.arrayBuffer();
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return new NextResponse("Proxy error", { status: 500 });
  }
}

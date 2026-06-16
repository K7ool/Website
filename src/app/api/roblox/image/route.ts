import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = [
  "t0.rbxcdn.com",
  "t1.rbxcdn.com",
  "t2.rbxcdn.com",
  "t3.rbxcdn.com",
  "tr.rbxcdn.com",
  "thumbs.roblox.com",
  "games.roblox.com",
  "www.roblox.com",
];

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      return new NextResponse("Missing url param", { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return new NextResponse("Invalid URL", { status: 400 });
    }

    // Only allow Roblox CDN hosts
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return new NextResponse("Host not allowed", { status: 403 });
    }

    const imageRes = await fetch(url, {
      headers: { "User-Agent": "FlippStudios/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (!imageRes.ok) {
      return new NextResponse("Image fetch failed", { status: 502 });
    }

    const contentType = imageRes.headers.get("content-type") || "image/png";
    const buffer = await imageRes.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return new NextResponse("Proxy error", { status: 500 });
  }
}

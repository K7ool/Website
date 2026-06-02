import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Discord OAuth not configured" }, { status: 500 });
  }

  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const host = process.env.VERCEL_URL || "localhost:3000";
  const redirectUri = `${protocol}://${host}/api/auth/discord/callback`;

  const url = new URL("https://discord.com/api/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "identify email");

  return NextResponse.redirect(url.toString());
}

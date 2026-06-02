import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  if (error || !code) {
    return NextResponse.redirect(new URL("/auth/login?error=discord_denied", req.url));
  }

  const clientId = process.env.DISCORD_CLIENT_ID!;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET!;

  const redirectUri = `${req.nextUrl.origin}/api/auth/discord/callback`;

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error("[DISCORD] Token exchange failed:", tokenRes.status, text);
    return NextResponse.redirect(new URL("/auth/login?error=token_exchange", req.url));
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userRes.ok) {
    return NextResponse.redirect(new URL("/auth/login?error=user_fetch", req.url));
  }

  const discordUser = await userRes.json();
  const discordId = discordUser.id;
  const discordAvatar = discordUser.avatar
    ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png`
    : "";

  const profilesSnap = await adminDb.collection("profiles").where("discordId", "==", discordId).limit(1).get();

  let uid: string;
  if (profilesSnap.empty) {
    const userRecord = await adminAuth.createUser({
      email: discordUser.email || `${discordId}@discord.local`,
      displayName: discordUser.global_name || discordUser.username,
      photoURL: discordAvatar || undefined,
    });
    uid = userRecord.uid;

    await adminDb.collection("profiles").doc(uid).set({
      id: uid,
      discordId,
      username: discordUser.username,
      email: discordUser.email || "",
      avatar: discordAvatar,
      role: "customer",
      discordVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } else {
    uid = profilesSnap.docs[0].id;
    await adminDb.collection("profiles").doc(uid).update({
      discordId,
      username: discordUser.username,
      avatar: discordAvatar,
      discordVerified: true,
      updatedAt: new Date().toISOString(),
    });
  }

  const customToken = await adminAuth.createCustomToken(uid);

  return NextResponse.redirect(new URL(`/auth/discord-callback?token=${customToken}`, req.url));
}

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serverId, type, targetUserId, targetName, payload } = body;

    if (!serverId || !type) {
      return NextResponse.json({ success: false, reason: "MISSING_FIELDS" }, { status: 400 });
    }

    const validTypes = ["kick", "ban", "dm", "chat", "info"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ success: false, reason: "INVALID_TYPE" }, { status: 400 });
    }

    const docRef = await adminDb.collection("serverCommands").add({
      serverId,
      type,
      targetUserId: targetUserId || null,
      targetName: targetName || null,
      payload: payload || {},
      status: "pending",
      createdAt: new Date().toISOString(),
      completedAt: null,
      result: null,
    });

    return NextResponse.json({ success: true, commandId: docRef.id });
  } catch (err: any) {
    console.error("[SERVERS_COMMANDS] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

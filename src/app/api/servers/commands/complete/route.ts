import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { commandId, result } = body;

    if (!commandId) {
      return NextResponse.json({ success: false, reason: "MISSING_COMMAND_ID" }, { status: 400 });
    }

    const docRef = adminDb.collection("serverCommands").doc(commandId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ success: false, reason: "COMMAND_NOT_FOUND" }, { status: 404 });
    }

    await docRef.update({
      status: "completed",
      completedAt: new Date().toISOString(),
      result: result || null,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[SERVERS_COMMANDS_COMPLETE] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

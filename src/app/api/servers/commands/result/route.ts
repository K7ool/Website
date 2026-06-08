import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const commandId = req.nextUrl.searchParams.get("commandId");
    if (!commandId) {
      return NextResponse.json({ success: false, reason: "MISSING_COMMAND_ID" }, { status: 400 });
    }

    const doc = await adminDb.collection("serverCommands").doc(commandId).get();
    if (!doc.exists) {
      return NextResponse.json({ success: false, reason: "NOT_FOUND" }, { status: 404 });
    }

    const data = doc.data()!;
    return NextResponse.json({
      success: true,
      status: data.status,
      result: data.result || null,
    });
  } catch (err: any) {
    console.error("[SERVERS_COMMANDS_RESULT] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

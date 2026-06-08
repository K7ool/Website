import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const serverId = req.nextUrl.searchParams.get("serverId");
    if (!serverId) {
      return NextResponse.json({ success: false, reason: "MISSING_SERVER_ID" }, { status: 400 });
    }

    const snap = await adminDb
      .collection("serverCommands")
      .where("serverId", "==", serverId)
      .where("status", "==", "pending")
      .orderBy("createdAt", "asc")
      .limit(20)
      .get();

    const commands = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Mark them as "sent" so they don't get picked up again
    const batch = adminDb.batch();
    for (const doc of snap.docs) {
      batch.update(doc.ref, { status: "sent" });
    }
    if (snap.docs.length > 0) {
      await batch.commit();
    }

    return NextResponse.json({ success: true, commands });
  } catch (err: any) {
    console.error("[SERVERS_COMMANDS_PENDING] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

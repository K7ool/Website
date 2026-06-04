import "server-only";
import { Resend } from "resend";

const FROM = "Flipp Studios <onboarding@resend.dev>";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) return null;
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendEmail(to: string, subject: string, html: string) {
  const resend = getResend();
  if (!resend) {
    console.warn("[EMAIL] RESEND_API_KEY not set, skipping email to", to);
    return;
  }
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) console.error("[EMAIL] Resend error:", error);
    else console.log("[EMAIL] Sent to", to);
  } catch (err) {
    console.error("[EMAIL] Failed to send:", err);
  }
}

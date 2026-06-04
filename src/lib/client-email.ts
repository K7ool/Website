export async function sendEmail(to: string, subject: string, html: string) {
  try {
    await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html }),
    });
  } catch (err) {
    console.error("[CLIENT_EMAIL] Failed to send:", err);
  }
}

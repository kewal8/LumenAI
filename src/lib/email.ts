type Email = { to: string; subject: string; text: string };

/**
 * Sends through Resend when RESEND_API_KEY and EMAIL_FROM are set. Until then
 * the message is written to the server log so links can still be passed on by hand.
 */
export async function sendEmail({ to, subject, text }: Email) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!key || !from) {
    console.log(`[email not configured] To: ${to}\nSubject: ${subject}\n\n${text}\n`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!response.ok) {
    console.error(`Email to ${to} failed (${response.status}): ${await response.text()}`);
  }
}

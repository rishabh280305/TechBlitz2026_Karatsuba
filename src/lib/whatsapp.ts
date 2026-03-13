import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM?.trim();

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

function normalizePhone(phone?: string) {
  const raw = phone?.trim();
  if (!raw) {
    return null;
  }

  if (raw.startsWith("whatsapp:")) {
    return raw;
  }

  if (raw.startsWith("+")) {
    return `whatsapp:${raw}`;
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `whatsapp:+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `whatsapp:+${digits}`;
  }
  if (digits.length >= 11) {
    return `whatsapp:+${digits}`;
  }

  return null;
}

export async function sendWhatsAppMessage(params: {
  to?: string;
  body: string;
}) {
  const to = normalizePhone(params.to);
  if (!to || !client || !whatsappFrom) {
    return { skipped: true, reason: "missing-config-or-recipient" };
  }

  try {
    await client.messages.create({
      from: whatsappFrom,
      to,
      body: params.body,
    });
  } catch (error) {
    console.error("WhatsApp send failed", error);
    return { skipped: true, reason: "provider-error" };
  }

  return { skipped: false, reason: null };
}

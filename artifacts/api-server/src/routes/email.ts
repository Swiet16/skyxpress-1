import { Router } from "express";
import { createXrayEmailHtml } from "../lib/emailTemplate";
import { logger } from "../lib/logger";

const router = Router();

// ── Lightweight Supabase REST helpers (no SDK — avoids WebSocket crash on Node < 22) ──

function supabaseCfg() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
  return { url, key };
}

function authHeaders(token: string): Record<string, string> {
  const { key } = supabaseCfg();
  return { Authorization: `Bearer ${token}`, apikey: key, "Content-Type": "application/json" };
}

async function getUser(token: string): Promise<{ id: string } | null> {
  const { url } = supabaseCfg();
  try {
    const res = await fetch(`${url}/auth/v1/user`, { headers: authHeaders(token) });
    if (!res.ok) return null;
    return res.json() as Promise<{ id: string }>;
  } catch { return null; }
}

async function getUserRole(token: string): Promise<string | null> {
  const { url } = supabaseCfg();
  try {
    const res = await fetch(`${url}/rest/v1/rpc/get_user_role`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    return res.json() as Promise<string>;
  } catch { return null; }
}

const PARCEL_COLS = [
  "id", "tracking_id", "reference_id", "sender_name", "sender_email",
  "sender_phone", "sender_address", "sender_city", "sender_country",
  "receiver_name", "receiver_email", "receiver_address", "receiver_city", "receiver_state",
  "receiver_country", "receiver_postal_code", "receiver_phone",
  "from_country", "to_country", "weight", "chargeable_weight",
  "length", "width", "height", "parcel_type", "service_type",
  "declared_value", "total_price", "currency", "special_instructions",
  "pieces", "items", "xray_email_sent_at",
].join(",");

async function fetchParcel(token: string, parcelId: string): Promise<any | null> {
  const { url } = supabaseCfg();
  try {
    const res = await fetch(
      `${url}/rest/v1/parcels?id=eq.${encodeURIComponent(parcelId)}&select=${PARCEL_COLS}&limit=1`,
      { headers: { ...authHeaders(token), Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const rows = await res.json() as any[];
    return rows[0] ?? null;
  } catch { return null; }
}

// ── POST /api/send-parcel-email ───────────────────────────────────────────────

router.post("/send-parcel-email", async (req, res) => {
  const { url: sbUrl, key: sbKey } = supabaseCfg();
  if (!sbUrl || !sbKey) {
    res.status(503).json({ error: "Server misconfiguration: Supabase credentials missing" });
    return;
  }

  // 1. Auth
  const raw = req.headers.authorization;
  const tokenMatch = raw?.match(/^Bearer\s+(.+)$/i);
  const token = tokenMatch?.[1];
  if (!token) {
    res.status(401).json({ error: "Missing authorization token" });
    return;
  }

  const user = await getUser(token);
  if (!user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const role = await getUserRole(token);
  if (!role || !["admin", "staff", "developer"].includes(role)) {
    res.status(403).json({ error: "Insufficient permissions — admin/staff access required" });
    return;
  }

  // 2. Validate parcelId
  const { parcelId } = req.body ?? {};
  if (!parcelId || typeof parcelId !== "string") {
    res.status(400).json({ error: "Missing or invalid parcelId" });
    return;
  }

  // 3. Fetch parcel server-side (RLS enforces access)
  const parcel = await fetchParcel(token, parcelId);
  if (!parcel) {
    res.status(404).json({ error: "Parcel not found or access denied" });
    return;
  }

  const recipientEmail = typeof parcel.receiver_email === "string" ? parcel.receiver_email.trim() : "";
  if (!recipientEmail) {
    res.status(400).json({ error: "Parcel has no receiver_email — cannot send notification" });
    return;
  }

  // 4. Rate-limit: 5-minute cooldown per parcel
  if (parcel.xray_email_sent_at) {
    const lastSent = new Date(parcel.xray_email_sent_at).getTime();
    const cooldownMs = 5 * 60 * 1000;
    if (Date.now() - lastSent < cooldownMs) {
      res.status(429).json({
        error: "Email was already sent recently. Please wait before resending.",
        retryAfter: Math.ceil((cooldownMs - (Date.now() - lastSent)) / 1000),
      });
      return;
    }
  }

  // 5. Check Brevo key
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Email service is not configured (BREVO_API_KEY missing)" });
    return;
  }

  // 6. Build & send email
  const html = createXrayEmailHtml(parcel);
  const ref = parcel.reference_id || parcel.tracking_id || "your parcel";

  const payload = {
    sender: { name: "SkyXpress International", email: "noreplay.skyxpress@gmail.com" },
    to: [{ email: recipientEmail, name: parcel.sender_name || recipientEmail }],
    subject: `✈ X-Ray Cleared — Ref: ${ref} | SkyXpress`,
    htmlContent: html,
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseData: any = {};
    try { responseData = JSON.parse(responseText); } catch { responseData = { raw: responseText }; }

    if (!response.ok) {
      const isIpBlock =
        typeof responseData?.message === "string" &&
        responseData.message.toLowerCase().includes("unrecognised ip");
      logger.error({ status: response.status, body: responseData }, "Brevo API error");
      res.status(502).json({
        error: isIpBlock ? "ip_not_authorized" : "Failed to send email via Brevo",
        ...(isIpBlock && {
          ipAddress: (responseData.message as string).match(/\d+\.\d+\.\d+\.\d+/)?.[0],
          brevoUrl: "https://app.brevo.com/security/authorised_ips",
        }),
        details: responseData,
      });
      return;
    }

    logger.info({ messageId: responseData.messageId, to: recipientEmail }, "X-ray email sent");
    res.json({ success: true, messageId: responseData.messageId, sentTo: recipientEmail });
  } catch (err: any) {
    logger.error({ err }, "Email send error");
    res.status(500).json({ error: "Internal error sending email", message: err.message });
  }
});

export default router;

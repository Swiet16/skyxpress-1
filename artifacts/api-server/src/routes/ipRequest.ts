import { Router } from "express";
import { logger } from "../lib/logger";

// GET /api/server-ip — returns outbound IP only, no email
const router2 = Router();
router2.get("/server-ip", async (_req, res) => {
  const services = [
    { url: "https://api.ipify.org?format=json", parse: (d: any) => d.ip },
    { url: "https://api4.my-ip.io/ip.json",      parse: (d: any) => d.ip },
    { url: "https://ipinfo.io/json",              parse: (d: any) => d.ip },
  ];
  for (const svc of services) {
    try {
      const r = await fetch(svc.url, {
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SkyXpressServer/1.0)", Accept: "application/json" },
      });
      if (!r.ok) {
        logger.warn({ url: svc.url, status: r.status }, "server-ip: service returned non-OK status");
        continue;
      }
      const d = await r.json();
      const ip = svc.parse(d);
      if (ip && ip !== "unknown") { res.json({ ip }); return; }
      logger.warn({ url: svc.url, body: d }, "server-ip: service returned no usable ip field");
    } catch (err: any) {
      logger.warn({ url: svc.url, err: err?.message || err }, "server-ip: request to service failed");
    }
  }
  // Last resort: plain-text IP-echo endpoints (no JSON parsing needed)
  const textServices = [
    "https://checkip.amazonaws.com",
    "https://icanhazip.com",
    "https://ifconfig.me/ip",
  ];
  for (const url of textServices) {
    try {
      const r = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SkyXpressServer/1.0)" },
      });
      if (!r.ok) {
        logger.warn({ url, status: r.status }, "server-ip: text service returned non-OK status");
        continue;
      }
      const text = (await r.text()).trim();
      if (text) { res.json({ ip: text }); return; }
    } catch (err: any) {
      logger.warn({ url, err: err?.message || err }, "server-ip: text service request failed");
    }
  }
  logger.error("server-ip: all IP-detection services failed — outbound network may be blocked for this deployment");
  res.json({ ip: "unavailable" });
});
export { router2 as serverIpRouter };

const router = Router();

const IP_AUTHORIZATION_EMAIL_HTML = (ip: string, ts: string) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Brevo IP Authorization Required</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1d2e;border-radius:16px;overflow:hidden;border:1px solid #2a2d3e;">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#1e3a8a 0%,#1e40af 50%,#c2410c 100%);padding:32px 40px;text-align:center;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.6);">SkyXpress International</p>
          <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">✈ IP Authorization Required</h1>
          <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">Action needed to restore email delivery</p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:36px 40px;">

          <!-- IP Box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;border:1px solid #2a2d3e;border-radius:12px;margin-bottom:28px;">
            <tr>
              <td style="padding:20px 24px;">
                <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#64748b;">Server IP Address</p>
                <p style="margin:0;font-size:28px;font-weight:700;color:#60a5fa;letter-spacing:2px;font-family:'Courier New',monospace;">${ip}</p>
                <p style="margin:6px 0 0;font-size:11px;color:#475569;">Detected at ${ts} UTC</p>
              </td>
            </tr>
          </table>

          <!-- Steps -->
          <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#e2e8f0;">How to authorize this IP in Brevo:</p>

          <table width="100%" cellpadding="0" cellspacing="0">
            ${[
              ["1", "Log in to your Brevo account", "Go to <strong style='color:#60a5fa'>app.brevo.com</strong> and sign in"],
              ["2", "Open Security Settings", "Navigate to <strong style='color:#60a5fa'>Settings → Security → Authorised IPs</strong>"],
              ["3", "Add the IP address", "Click <strong style='color:#60a5fa'>Add an IP address</strong> and enter the IP shown above"],
              ["4", "Save & test", "Click Save — your next email send will go through immediately"],
            ].map(([num, title, desc]) => `
            <tr>
              <td style="padding:0 0 14px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e2235;border-radius:10px;border-left:3px solid #3b82f6;">
                  <tr>
                    <td style="padding:14px 16px;">
                      <table cellpadding="0" cellspacing="0"><tr>
                        <td style="width:28px;height:28px;background:#3b82f6;border-radius:50%;text-align:center;vertical-align:middle;">
                          <span style="font-size:13px;font-weight:700;color:#fff;">${num}</span>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#e2e8f0;">${title}</p>
                          <p style="margin:0;font-size:12px;color:#94a3b8;">${desc}</p>
                        </td>
                      </tr></table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`).join("")}
          </table>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
            <tr>
              <td align="center">
                <a href="https://app.brevo.com/security/authorised_ips"
                   style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.3px;">
                  Open Brevo Authorised IPs →
                </a>
              </td>
            </tr>
          </table>

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#0f1117;padding:20px 40px;border-top:1px solid #2a2d3e;text-align:center;">
          <p style="margin:0;font-size:11px;color:#475569;">SkyXpress International Courier &amp; Cargo · Automated system notification</p>
          <p style="margin:4px 0 0;font-size:11px;color:#334155;">Do not reply to this email</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

// Shared multi-service IP lookup used by both /server-ip and the email route,
// so neither depends on a single service (e.g. ipify) being reachable.
async function detectServerIp(): Promise<string> {
  const services = [
    { url: "https://api.ipify.org?format=json", parse: (d: any) => d.ip },
    { url: "https://api4.my-ip.io/ip.json",      parse: (d: any) => d.ip },
    { url: "https://ipinfo.io/json",              parse: (d: any) => d.ip },
  ];
  for (const svc of services) {
    try {
      const r = await fetch(svc.url, {
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SkyXpressServer/1.0)", Accept: "application/json" },
      });
      if (!r.ok) continue;
      const d = await r.json();
      const ip = svc.parse(d);
      if (ip && ip !== "unknown") return ip;
    } catch (err: any) {
      logger.warn({ url: svc.url, err: err?.message || err }, "detectServerIp: service failed");
    }
  }
  const textServices = ["https://checkip.amazonaws.com", "https://icanhazip.com", "https://ifconfig.me/ip"];
  for (const url of textServices) {
    try {
      const r = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SkyXpressServer/1.0)" },
      });
      if (!r.ok) continue;
      const text = (await r.text()).trim();
      if (text) return text;
    } catch (err: any) {
      logger.warn({ url, err: err?.message || err }, "detectServerIp: text service failed");
    }
  }
  return "unavailable";
}

router.post("/request-ip-authorization", async (req, res) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Email service not configured (BREVO_API_KEY missing)" });
    return;
  }

  // Detect server outbound IP
  const ip = await detectServerIp();

  const ts = new Date().toUTCString();
  const html = IP_AUTHORIZATION_EMAIL_HTML(ip, ts);

  const payload = {
    sender: { name: "SkyXpress System", email: "noreplay.skyxpress@gmail.com" },
    to: [{ email: "myne7x@gmail.com", name: "SkyXpress Admin" }],
    subject: `🔐 Brevo IP Authorization Needed — ${ip}`,
    htmlContent: html,
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!response.ok) {
      logger.error({ status: response.status, body: data }, "Brevo error sending IP auth email");
      res.status(502).json({ error: "Failed to send authorization email", details: data });
      return;
    }

    logger.info({ ip, messageId: data.messageId }, "IP authorization email sent");
    res.json({ success: true, ip, messageId: data.messageId });
  } catch (err: any) {
    logger.error({ err }, "IP auth email send error");
    res.status(500).json({ error: "Internal error", message: err.message });
  }
});

export default router;

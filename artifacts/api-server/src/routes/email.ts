import { Router } from "express";
import { createXrayEmailHtml, type ParcelEmailData } from "../lib/emailTemplate";
import { logger } from "../lib/logger";

const router = Router();

router.post("/send-parcel-email", async (req, res) => {
  const parcel: ParcelEmailData = req.body?.parcel;

  if (!parcel) {
    res.status(400).json({ error: "Missing parcel data in request body" });
    return;
  }

  const recipientEmail = parcel.sender_email;
  if (!recipientEmail) {
    res.status(400).json({ error: "Parcel has no sender_email — cannot send notification" });
    return;
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Email service is not configured (BREVO_API_KEY missing)" });
    return;
  }

  const html = createXrayEmailHtml(parcel);
  const ref = parcel.reference_id || parcel.tracking_id || "your parcel";

  const payload = {
    sender: {
      name: "SkyXpress International",
      email: "noreplay.skyxpress@gmail.com",
    },
    to: [
      {
        email: recipientEmail,
        name: parcel.sender_name || recipientEmail,
      },
    ],
    subject: `✈ X-Ray Cleared — Ref: ${ref} | SkyXpress`,
    htmlContent: html,
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseData: any = {};
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      logger.error({ status: response.status, body: responseData }, "Brevo API error");
      res.status(502).json({
        error: "Failed to send email via Brevo",
        details: responseData,
      });
      return;
    }

    logger.info({ messageId: responseData.messageId, to: recipientEmail }, "X-ray email sent");

    res.json({
      success: true,
      messageId: responseData.messageId,
      sentTo: recipientEmail,
    });
  } catch (err: any) {
    logger.error({ err }, "Email send error");
    res.status(500).json({ error: "Internal error sending email", message: err.message });
  }
});

export default router;

const nodemailer = require("nodemailer");

async function sendVerificationCode(channel, destination, code) {
  const message = `Your SourceBD verification code is ${code}. It expires in 10 minutes. Do not share this code.`;

  if (channel === "email") {
    // Prefer Gmail SMTP when configured so OTPs can be sent to any user.
    if (process.env.SMTP_USER && process.env.SMTP_APP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT || 465),
        secure: process.env.SMTP_SECURE !== "false",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_APP_PASSWORD,
        },
      });

      try {
        await transporter.sendMail({
          from: `SourceBD <${process.env.SMTP_USER}>`,
          to: destination,
          subject: "Your SourceBD verification code",
          text: message,
        });
      } catch (cause) {
        const error = new Error("Gmail could not send the verification email. Check the Gmail address and App Password.");
        error.status = 502;
        error.cause = cause;
        throw error;
      }
      return;
    }

    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      const error = new Error("Email verification is not configured. Set SMTP_USER and SMTP_APP_PASSWORD (Gmail), or configure Resend, in Backend/.env.");
      error.status = 503;
      throw error;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [destination],
        subject: "Your SourceBD verification code",
        text: message,
      }),
    });

    if (!response.ok) {
      const providerResponse = await response.json().catch(() => null);
      const providerMessage = providerResponse?.message || providerResponse?.error?.message;
      const error = new Error(providerMessage
        ? `Resend rejected the email (${response.status}): ${providerMessage}`
        : `Resend rejected the email (${response.status}). Check the API key and sender settings.`);
      error.status = 502;
      throw error;
    }
    return;
  }

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, TWILIO_MESSAGING_SERVICE_SID } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || (!TWILIO_FROM_NUMBER && !TWILIO_MESSAGING_SERVICE_SID)) {
    const error = new Error("SMS verification is not configured. Set Twilio credentials in Backend/.env.");
    error.status = 503;
    throw error;
  }

  const params = new URLSearchParams({ To: destination, Body: message });
  if (TWILIO_MESSAGING_SERVICE_SID) params.set("MessagingServiceSid", TWILIO_MESSAGING_SERVICE_SID);
  else params.set("From", TWILIO_FROM_NUMBER);

  const authorization = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    const error = new Error("Could not send the verification SMS. Check the SMS provider settings.");
    error.status = 502;
    throw error;
  }
}

module.exports = sendVerificationCode;

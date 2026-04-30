const BREVO_API_URL = "https://api.brevo.com/v3/contacts";
const DEFAULT_BREVO_LIST_ID = 4;
const BREVO_LIST_ID = process.env.BREVO_LIST_ID ? Number(process.env.BREVO_LIST_ID) : DEFAULT_BREVO_LIST_ID;

function sendJson(response, status, payload) {
  response.status(status).setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  response.json(payload);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { error: "Method not allowed." });
  }

  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    return sendJson(response, 500, { error: "Brevo API key is not configured." });
  }

  if (!BREVO_LIST_ID) {
    return sendJson(response, 500, {
      error: "Brevo list ID is not configured. Set BREVO_LIST_ID in your Vercel environment."
    });
  }

  const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";

  if (!email || !isValidEmail(email)) {
    return sendJson(response, 400, { error: "Please provide a valid email address." });
  }

  try {
    const brevoResponse = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify({
        email,
        listIds: [BREVO_LIST_ID],
        updateEnabled: true
      })
    });

    const brevoPayload = await brevoResponse.json().catch(() => ({}));

    if (!brevoResponse.ok) {
      const duplicateOrKnownContact =
        brevoResponse.status === 400 &&
        typeof brevoPayload?.code === "string" &&
        brevoPayload.code.toLowerCase().includes("duplicate");

      if (duplicateOrKnownContact) {
        return sendJson(response, 200, {
          message: "You're already subscribed. We'll keep you posted."
        });
      }

      return sendJson(response, brevoResponse.status >= 500 ? 502 : 400, {
        error: "Signup could not be completed right now. Please try again shortly."
      });
    }

    return sendJson(response, 200, {
      message: "Thanks for subscribing. You're on the newsletter list."
    });
  } catch (error) {
    return sendJson(response, 500, {
      error: "The signup service is currently unavailable. Please try again later."
    });
  }
};

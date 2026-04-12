const LEMON_VALIDATE_URL = "https://api.lemonsqueezy.com/v1/licenses/validate";

function sendJson(response, status, payload) {
  response.status(status).setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  response.json(payload);
}

function extractLicenseKey(body) {
  if (!body || typeof body !== "object") {
    return "";
  }

  return typeof body.licenseKey === "string" ? body.licenseKey.trim() : "";
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, {
      valid: false,
      error: "Method not allowed."
    });
  }

  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;

  if (!apiKey) {
    return sendJson(response, 500, {
      valid: false,
      error: "License validation is not configured."
    });
  }

  const licenseKey = extractLicenseKey(request.body);

  if (!licenseKey) {
    return sendJson(response, 400, {
      valid: false,
      error: "A license key is required."
    });
  }

  try {
    // Server-side request to Lemon Squeezy. The API key stays private in Vercel env vars.
    const lemonResponse = await fetch(LEMON_VALIDATE_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        license_key: licenseKey
      })
    });

    const lemonPayload = await lemonResponse.json().catch(() => null);

    if (!lemonResponse.ok) {
      const isClientValidationFailure =
        lemonResponse.status === 400 ||
        lemonResponse.status === 404 ||
        lemonResponse.status === 422;

      if (isClientValidationFailure) {
        return sendJson(response, 200, { valid: false });
      }

      return sendJson(response, 502, {
        valid: false,
        error: "License validation service is currently unavailable."
      });
    }

    const isValid = Boolean(lemonPayload?.valid);

    return sendJson(response, 200, {
      valid: isValid
    });
  } catch (error) {
    return sendJson(response, 500, {
      valid: false,
      error: "Unable to validate the license at the moment."
    });
  }
};

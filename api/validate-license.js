const LEMON_VALIDATE_URL = "https://api.lemonsqueezy.com/v1/licenses/validate";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

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

  // Kept as a required server-side Vercel env var for this integration setup.
  // It is never exposed to the client.
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
    // Lemon Squeezy license validation expects a form-encoded body with `license_key`.
    const requestBody = new URLSearchParams({
      license_key: licenseKey
    });

    const lemonResponse = await fetch(LEMON_VALIDATE_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: requestBody.toString()
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

      const errorPayload = {
        valid: false,
        error: "License validation service is currently unavailable."
      };

      if (!IS_PRODUCTION) {
        errorPayload.upstreamStatus = lemonResponse.status;
      }

      return sendJson(response, 502, errorPayload);
    }

    if (!lemonPayload || typeof lemonPayload !== "object" || typeof lemonPayload.valid !== "boolean") {
      const malformedPayload = {
        valid: false,
        error: "Received an unexpected response from the license service."
      };

      if (!IS_PRODUCTION) {
        malformedPayload.upstreamStatus = lemonResponse.status;
      }

      return sendJson(response, 502, malformedPayload);
    }

    return sendJson(response, 200, {
      valid: lemonPayload.valid
    });
  } catch (error) {
    const errorPayload = {
      valid: false,
      error: "Unable to validate the license at the moment."
    };

    if (!IS_PRODUCTION) {
      errorPayload.error = "Unable to validate the license at the moment. Please check the Lemon Squeezy connection.";
    }

    return sendJson(response, 500, errorPayload);
  }
};

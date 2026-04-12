const LEMON_ACTIVATE_URL = "https://api.lemonsqueezy.com/v1/licenses/activate";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

function sendJson(response, status, payload) {
  response.status(status).setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  response.json(payload);
}

function extractString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function extractLicenseeName(payload) {
  // Lemon Squeezy returns customer details in `meta`. Prefer the human-readable name,
  // then fall back to the customer email, otherwise return an empty string.
  const customerName = typeof payload?.meta?.customer_name === "string" ? payload.meta.customer_name.trim() : "";
  const customerEmail = typeof payload?.meta?.customer_email === "string" ? payload.meta.customer_email.trim() : "";

  return customerName || customerEmail || "";
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, {
      activated: false,
      error: "Method not allowed."
    });
  }

  // Kept as a required server-side Vercel env var for deployment parity with the licensing backend.
  // It remains private and is never exposed to the client.
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;

  if (!apiKey) {
    return sendJson(response, 500, {
      activated: false,
      error: "License activation is not configured."
    });
  }

  const body = request.body && typeof request.body === "object" ? request.body : {};
  const licenseKey = extractString(body.licenseKey);
  const instanceName = extractString(body.instanceName);

  if (!licenseKey) {
    return sendJson(response, 400, {
      activated: false,
      error: "A license key is required."
    });
  }

  try {
    const requestBody = new URLSearchParams({
      license_key: licenseKey
    });

    if (instanceName) {
      requestBody.append("instance_name", instanceName);
    }

    const lemonResponse = await fetch(LEMON_ACTIVATE_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: requestBody.toString()
    });

    const lemonPayload = await lemonResponse.json().catch(() => null);

    if (!lemonResponse.ok) {
      const isClientActivationFailure =
        lemonResponse.status === 400 ||
        lemonResponse.status === 404 ||
        lemonResponse.status === 422;

      if (isClientActivationFailure) {
        return sendJson(response, 200, { activated: false });
      }

      const errorPayload = {
        activated: false,
        error: "License activation service is currently unavailable."
      };

      if (!IS_PRODUCTION) {
        errorPayload.upstreamStatus = lemonResponse.status;
      }

      return sendJson(response, 502, errorPayload);
    }

    if (!lemonPayload || typeof lemonPayload !== "object" || typeof lemonPayload.activated !== "boolean") {
      const malformedPayload = {
        activated: false,
        error: "Received an unexpected response from the license service."
      };

      if (!IS_PRODUCTION) {
        malformedPayload.upstreamStatus = lemonResponse.status;
      }

      return sendJson(response, 502, malformedPayload);
    }

    return sendJson(response, 200, {
      activated: lemonPayload.activated,
      licenseeName: lemonPayload.activated ? extractLicenseeName(lemonPayload) : ""
    });
  } catch (error) {
    const errorPayload = {
      activated: false,
      error: "Unable to activate the license at the moment."
    };

    if (!IS_PRODUCTION) {
      errorPayload.error = "Unable to activate the license at the moment. Please check the Lemon Squeezy connection.";
    }

    return sendJson(response, 500, errorPayload);
  }
};

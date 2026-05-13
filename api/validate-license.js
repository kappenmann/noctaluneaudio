const IS_PRODUCTION = process.env.NODE_ENV === "production";
const {
  callLemonLicenseEndpoint,
  extractString,
  LEMON_VALIDATE_URL
} = require("./_lib/lemon-license");
const {
  getRequestedProductId,
  resolveLicenseEntitlement
} = require("./_lib/license-entitlements");

function sendJson(response, status, payload) {
  response.status(status).setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  response.json(payload);
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, {
      valid: false,
      error: "Method not allowed."
    });
  }

  if (!process.env.LEMON_SQUEEZY_API_KEY) {
    return sendJson(response, 500, {
      valid: false,
      error: "License validation is not configured."
    });
  }

  const body = request.body && typeof request.body === "object" ? request.body : {};
  const licenseKey = extractString(body.licenseKey);
  const requestedProductId = getRequestedProductId(body);

  if (!licenseKey) {
    return sendJson(response, 400, {
      valid: false,
      error: "A license key is required."
    });
  }

  try {
    const { response: lemonResponse, payload: lemonPayload } = await callLemonLicenseEndpoint(
      LEMON_VALIDATE_URL,
      {
        license_key: licenseKey
      }
    );

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

    const entitlement = resolveLicenseEntitlement(lemonPayload, requestedProductId);

    return sendJson(response, 200, {
      valid: entitlement.authorized
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

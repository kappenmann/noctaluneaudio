const IS_PRODUCTION = process.env.NODE_ENV === "production";
const {
  callLemonLicenseEndpoint,
  extractLicenseeName,
  extractString
} = require("./_lib/lemon-license");
const {
  buildActivationCertificate,
  getPublicKeyFingerprint,
  loadPrivateKeyPem,
  SIGNATURE_ALGORITHM,
  SIGNATURE_PADDING,
  signActivationCertificate,
  verifyActivationSignature
} = require("./_lib/license-certificate");

function sendJson(response, status, payload) {
  response.status(status).setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  response.json(payload);
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, {
      activated: false,
      error: "Method not allowed."
    });
  }

  if (!process.env.LEMON_SQUEEZY_API_KEY) {
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
    const privateKeyPem = loadPrivateKeyPem();
    console.log("[activate-license] signing key present:", true);
    console.log("[activate-license] public key fingerprint (sha256):", getPublicKeyFingerprint(privateKeyPem));

    const validateResult = await callLemonLicenseEndpoint(
      "https://api.lemonsqueezy.com/v1/licenses/validate",
      {
        license_key: licenseKey
      }
    );

    if (!validateResult.response.ok) {
      const isClientValidationFailure =
        validateResult.response.status === 400 ||
        validateResult.response.status === 404 ||
        validateResult.response.status === 422;

      if (isClientValidationFailure) {
        return sendJson(response, 200, { activated: false });
      }

      const errorPayload = {
        activated: false,
        error: "License validation service is currently unavailable."
      };

      if (!IS_PRODUCTION) {
        errorPayload.upstreamStatus = validateResult.response.status;
      }

      return sendJson(response, 502, errorPayload);
    }

    if (!validateResult.payload || validateResult.payload.valid !== true) {
      return sendJson(response, 200, { activated: false });
    }

    const activationBody = { license_key: licenseKey };

    if (instanceName) {
      activationBody.instance_name = instanceName;
    }

    const { response: lemonResponse, payload: lemonPayload } = await callLemonLicenseEndpoint(
      "https://api.lemonsqueezy.com/v1/licenses/activate",
      activationBody
    );

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

    const licenseeName = extractLicenseeName(lemonPayload);
    const activationCertificate = buildActivationCertificate({
      licenseKey,
      licenseeName,
      instanceName
    });

    console.log("[activate-license] activationCertificate:", activationCertificate);
    console.log("[activate-license] signature config:", {
      algorithm: SIGNATURE_ALGORITHM,
      padding: SIGNATURE_PADDING,
      encoding: "utf8-to-base64"
    });

    const activationSignature = signActivationCertificate(activationCertificate, privateKeyPem);
    const signatureSelfCheck = verifyActivationSignature(
      activationCertificate,
      activationSignature,
      privateKeyPem
    );

    console.log("[activate-license] signature self-check:", signatureSelfCheck);

    const responseBody = {
      activated: lemonPayload.activated,
      licenseeName,
      activationCertificate,
      activationSignature
    };

    console.log("[activate-license] response shape:", {
      activated: responseBody.activated,
      licenseeName: responseBody.licenseeName,
      activationCertificateLength: responseBody.activationCertificate.length,
      activationSignatureLength: responseBody.activationSignature.length,
      signatureSelfCheck
    });

    return sendJson(response, 200, responseBody);
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

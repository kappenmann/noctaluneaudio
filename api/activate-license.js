const IS_PRODUCTION = process.env.NODE_ENV === "production";
const {
  callLemonLicenseEndpoint,
  extractLicenseeName,
  extractString,
  findLicenseInstanceByName,
  LEMON_ACTIVATE_URL,
  LEMON_VALIDATE_URL
} = require("./_lib/lemon-license");
const {
  getRequestedProductId,
  resolveLicenseEntitlement
} = require("./_lib/license-entitlements");
const {
  buildActivationCertificate,
  loadPrivateKeyPem,
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
  const requestedProductId = getRequestedProductId(body);

  if (!licenseKey) {
    return sendJson(response, 400, {
      activated: false,
      error: "A license key is required."
    });
  }

  if (!instanceName) {
    return sendJson(response, 400, {
      activated: false,
      error: "An instance name is required."
    });
  }

  try {
    const validateResult = await callLemonLicenseEndpoint(
      LEMON_VALIDATE_URL,
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

    const entitlement = resolveLicenseEntitlement(validateResult.payload, requestedProductId);

    if (!entitlement.authorized) {
      return sendJson(response, 200, { activated: false });
    }

    const privateKeyPem = loadPrivateKeyPem();

    let existingInstance = null;
    try {
      existingInstance = await findLicenseInstanceByName(
        validateResult.payload?.license_key?.id,
        instanceName
      );
    } catch (instanceLookupError) {
      console.warn("[activate-license] Existing instance lookup failed; trying a new activation.");
    }

    let lemonPayload;
    let reusedExistingInstance = false;

    if (existingInstance?.id) {
      lemonPayload = {
        activated: true,
        license_key: validateResult.payload.license_key,
        instance: existingInstance,
        meta: validateResult.payload.meta
      };
      reusedExistingInstance = true;
    } else {
      const activationBody = {
        license_key: licenseKey,
        instance_name: instanceName
      };

      const activationResult = await callLemonLicenseEndpoint(
        LEMON_ACTIVATE_URL,
        activationBody
      );
      const lemonResponse = activationResult.response;
      lemonPayload = activationResult.payload;

      if (!lemonResponse.ok) {
        const isClientActivationFailure =
          lemonResponse.status === 400 ||
          lemonResponse.status === 404 ||
          lemonResponse.status === 422;

        if (isClientActivationFailure) {
          return sendJson(response, 200, {
            activated: false,
            error: extractString(lemonPayload?.error) || "License activation failed."
          });
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
    }

    if (lemonPayload.activated !== true) {
      return sendJson(response, 200, { activated: false });
    }

    const licenseeName = extractLicenseeName(lemonPayload);
    const activationCertificate = buildActivationCertificate({
      licenseKey,
      licenseeName,
      instanceName,
      productName: entitlement.certificateProductName,
      productId: entitlement.productId,
      entitlementId: entitlement.entitlementId,
      licenseSource: entitlement.licenseSource,
      instanceId: extractString(lemonPayload?.instance?.id)
    });

    const activationSignature = signActivationCertificate(activationCertificate, privateKeyPem);
    const signatureSelfCheck = verifyActivationSignature(
      activationCertificate,
      activationSignature,
      privateKeyPem
    );

    if (!signatureSelfCheck) {
      throw new Error("Activation signature self-check failed.");
    }

    const responseBody = {
      activated: lemonPayload.activated,
      licenseeName,
      activationCertificate,
      activationSignature,
      reusedExistingInstance,
      instanceId: extractString(lemonPayload?.instance?.id)
    };

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

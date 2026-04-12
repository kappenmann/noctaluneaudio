const crypto = require("crypto");

const PRODUCT_NAME = "NoctaTape";
const SIGNATURE_ALGORITHM = "RSA-SHA256";
const SIGNATURE_PADDING = crypto.constants.RSA_PKCS1_PADDING;

function buildActivationCertificate({ licenseKey, licenseeName, instanceName }) {
  // Key order is intentionally fixed so JSON.stringify produces a deterministic string
  // for signing and later verification inside the JUCE plugin.
  const certificate = {
    licenseKey,
    licenseeName,
    product: PRODUCT_NAME,
    instanceName,
    issuedAt: new Date().toISOString()
  };

  return JSON.stringify(certificate);
}

function signActivationCertificate(certificateJson) {
  // Put your RSA private key into the Vercel environment variable LICENSE_SIGNING_PRIVATE_KEY.
  // Store the PEM as a multiline secret. If needed, escaped "\n" sequences are normalized below.
  const privateKey = process.env.LICENSE_SIGNING_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("License signing key is not configured.");
  }

  const normalizedKey = privateKey.replace(/\\n/g, "\n");
  return crypto.sign(
    SIGNATURE_ALGORITHM,
    Buffer.from(certificateJson, "utf8"),
    {
      key: normalizedKey,
      padding: SIGNATURE_PADDING
    }
  ).toString("base64");
}

module.exports = {
  PRODUCT_NAME,
  buildActivationCertificate,
  SIGNATURE_ALGORITHM,
  SIGNATURE_PADDING,
  signActivationCertificate
};

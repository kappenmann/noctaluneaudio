const crypto = require("crypto");

const PRODUCT_NAME = "NoctaTape";

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
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(certificateJson, "utf8");
  signer.end();

  return signer.sign(normalizedKey, "base64");
}

module.exports = {
  PRODUCT_NAME,
  buildActivationCertificate,
  signActivationCertificate
};

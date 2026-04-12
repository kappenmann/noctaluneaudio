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

function loadPrivateKeyPem() {
  // Put your RSA private key into the Vercel environment variable LICENSE_SIGNING_PRIVATE_KEY.
  // Store the PEM as a multiline secret. If needed, escaped "\n" sequences are normalized below.
  const privateKey = process.env.LICENSE_SIGNING_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("License signing key is not configured.");
  }

  return privateKey.replace(/\\n/g, "\n");
}

function getPublicKeyFingerprint(privateKeyPem) {
  const publicKeyPem = crypto.createPublicKey(privateKeyPem).export({
    type: "spki",
    format: "pem"
  });

  return crypto.createHash("sha256").update(publicKeyPem).digest("hex");
}

function signActivationCertificate(certificateJson, privateKeyPem) {
  const signer = crypto.createSign(SIGNATURE_ALGORITHM);
  signer.update(certificateJson, "utf8");
  signer.end();

  // This explicitly uses standard RSA PKCS#1 v1.5 padding, matching the JUCE-side expectation.
  return signer.sign(
    {
      key: privateKeyPem,
      padding: SIGNATURE_PADDING
    },
    "base64"
  );
}

function verifyActivationSignature(certificateJson, signatureBase64, privateKeyPem) {
  const verifier = crypto.createVerify(SIGNATURE_ALGORITHM);
  verifier.update(certificateJson, "utf8");
  verifier.end();

  return verifier.verify(
    {
      key: crypto.createPublicKey(privateKeyPem),
      padding: SIGNATURE_PADDING
    },
    signatureBase64,
    "base64"
  );
}

module.exports = {
  PRODUCT_NAME,
  buildActivationCertificate,
  SIGNATURE_ALGORITHM,
  SIGNATURE_PADDING,
  getPublicKeyFingerprint,
  loadPrivateKeyPem,
  signActivationCertificate,
  verifyActivationSignature
};

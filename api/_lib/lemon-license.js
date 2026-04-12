const LEMON_VALIDATE_URL = "https://api.lemonsqueezy.com/v1/licenses/validate";
const LEMON_ACTIVATE_URL = "https://api.lemonsqueezy.com/v1/licenses/activate";

function extractString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function extractLicenseeName(payload) {
  const customerName = extractString(payload?.meta?.customer_name);
  const customerEmail = extractString(payload?.meta?.customer_email);
  return customerName || customerEmail || "";
}

async function callLemonLicenseEndpoint(url, formData) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(formData).toString()
  });

  const payload = await response.json().catch(() => null);

  return {
    response,
    payload
  };
}

module.exports = {
  LEMON_VALIDATE_URL,
  LEMON_ACTIVATE_URL,
  callLemonLicenseEndpoint,
  extractLicenseeName,
  extractString
};

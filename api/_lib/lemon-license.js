const LEMON_VALIDATE_URL = "https://api.lemonsqueezy.com/v1/licenses/validate";
const LEMON_ACTIVATE_URL = "https://api.lemonsqueezy.com/v1/licenses/activate";
const LEMON_LICENSE_INSTANCES_URL = "https://api.lemonsqueezy.com/v1/license-key-instances";

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

async function findLicenseInstanceByName(licenseKeyId, instanceName) {
  const normalizedLicenseKeyId = String(licenseKeyId || "").trim();
  const normalizedInstanceName = extractString(instanceName);

  if (!normalizedLicenseKeyId || !normalizedInstanceName || !process.env.LEMON_SQUEEZY_API_KEY) {
    return null;
  }

  const url = new URL(LEMON_LICENSE_INSTANCES_URL);
  url.searchParams.set("filter[license_key_id]", normalizedLicenseKeyId);
  url.searchParams.set("page[size]", "100");

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.api+json",
      Authorization: `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`
    }
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload || !Array.isArray(payload.data)) {
    throw new Error(`Unable to list license instances (HTTP ${response.status}).`);
  }

  const matchingInstance = payload.data.find(
    (item) => extractString(item?.attributes?.name) === normalizedInstanceName
  );

  if (!matchingInstance) {
    return null;
  }

  return {
    id: extractString(matchingInstance?.attributes?.identifier),
    name: extractString(matchingInstance?.attributes?.name)
  };
}

module.exports = {
  LEMON_VALIDATE_URL,
  LEMON_ACTIVATE_URL,
  LEMON_LICENSE_INSTANCES_URL,
  callLemonLicenseEndpoint,
  extractLicenseeName,
  extractString,
  findLicenseInstanceByName
};

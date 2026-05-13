const DEFAULT_PRODUCT_ID = "noctatape";

function extractString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseIdList(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonConfig(envName, fallback) {
  const rawConfig = extractString(process.env[envName]);

  if (!rawConfig) {
    return fallback;
  }

  try {
    const parsedConfig = JSON.parse(rawConfig);
    return parsedConfig && typeof parsedConfig === "object" ? parsedConfig : fallback;
  } catch (error) {
    console.warn(`[license-entitlements] Ignoring invalid ${envName} JSON.`);
    return fallback;
  }
}

function normalizeProductId(productId) {
  return extractString(productId || DEFAULT_PRODUCT_ID).toLowerCase();
}

function normalizeId(value) {
  if (value === null || typeof value === "undefined") {
    return "";
  }

  return String(value).trim();
}

function normalizeIdList(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map(normalizeId).filter(Boolean);
}

function normalizeProductConfig(productId, config) {
  const normalizedProductId = normalizeProductId(productId);

  return {
    certificateProductName: extractString(config?.certificateProductName) || normalizedProductId,
    singleVariantIds: normalizeIdList(config?.singleVariantIds),
    singleProductIds: normalizeIdList(config?.singleProductIds)
  };
}

function normalizeBundleConfig(bundleId, config) {
  return {
    id: extractString(bundleId),
    variantIds: normalizeIdList(config?.variantIds),
    productIds: normalizeIdList(config?.productIds),
    grants: Array.isArray(config?.grants) ? config.grants.map(normalizeProductId).filter(Boolean) : []
  };
}

const PRODUCTS = parseJsonConfig("LEMON_LICENSE_PRODUCTS_JSON", {
  noctatape: {
    certificateProductName: "NoctaTape",
    singleVariantIds: parseIdList(
      process.env.LEMON_NOCTATAPE_VARIANT_IDS ||
        process.env.LEMON_PRODUCT_NOCTATAPE_VARIANT_IDS
    ),
    singleProductIds: parseIdList(
      process.env.LEMON_NOCTATAPE_PRODUCT_IDS ||
        process.env.LEMON_PRODUCT_NOCTATAPE_PRODUCT_IDS
    )
  }
});

const BUNDLES = parseJsonConfig("LEMON_LICENSE_BUNDLES_JSON", {
  all_plugins: {
    variantIds: parseIdList(
      process.env.LEMON_ALL_PLUGINS_BUNDLE_VARIANT_IDS ||
        process.env.LEMON_BUNDLE_ALL_PLUGINS_VARIANT_IDS
    ),
    productIds: parseIdList(
      process.env.LEMON_ALL_PLUGINS_BUNDLE_PRODUCT_IDS ||
        process.env.LEMON_BUNDLE_ALL_PLUGINS_PRODUCT_IDS
    ),
    grants: parseIdList(process.env.LEMON_ALL_PLUGINS_BUNDLE_GRANTS || "noctatape")
  }
});

function getRequestedProductId(body) {
  return normalizeProductId(body?.productId || DEFAULT_PRODUCT_ID);
}

function getProductConfig(productId) {
  const normalizedProductId = normalizeProductId(productId);
  const config = PRODUCTS[normalizedProductId];

  return config ? normalizeProductConfig(normalizedProductId, config) : null;
}

function idsContain(ids, value) {
  const normalizedValue = normalizeId(value);

  if (!normalizedValue) {
    return false;
  }

  return ids.map(normalizeId).includes(normalizedValue);
}

function getFirstString(...values) {
  for (const value of values) {
    const normalizedValue = normalizeId(value);

    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return "";
}

function extractLemonLicenseIds(payload) {
  return {
    productId: getFirstString(
      payload?.meta?.product_id,
      payload?.meta?.productId,
      payload?.license_key?.product_id,
      payload?.license_key?.productId
    ),
    variantId: getFirstString(
      payload?.meta?.variant_id,
      payload?.meta?.variantId,
      payload?.license_key?.variant_id,
      payload?.license_key?.variantId
    )
  };
}

function resolveLicenseEntitlement(payload, requestedProductId) {
  const normalizedProductId = normalizeProductId(requestedProductId);
  const productConfig = getProductConfig(normalizedProductId);

  if (!payload || payload.valid !== true || !productConfig) {
    return {
      authorized: false,
      productId: normalizedProductId,
      certificateProductName: productConfig?.certificateProductName || normalizedProductId
    };
  }

  const lemonIds = extractLemonLicenseIds(payload);

  if (
    idsContain(productConfig.singleProductIds, lemonIds.productId) ||
    idsContain(productConfig.singleVariantIds, lemonIds.variantId)
  ) {
    return {
      authorized: true,
      productId: normalizedProductId,
      certificateProductName: productConfig.certificateProductName,
      entitlementId: normalizedProductId,
      licenseSource: "single",
      lemonProductId: lemonIds.productId,
      lemonVariantId: lemonIds.variantId
    };
  }

  for (const [bundleId, bundleConfig] of Object.entries(BUNDLES)) {
    const normalizedBundle = normalizeBundleConfig(bundleId, bundleConfig);
    const grantsProduct = normalizedBundle.grants.includes(normalizedProductId);
    const matchesBundle =
      idsContain(normalizedBundle.productIds, lemonIds.productId) ||
      idsContain(normalizedBundle.variantIds, lemonIds.variantId);

    if (grantsProduct && matchesBundle) {
      return {
        authorized: true,
        productId: normalizedProductId,
        certificateProductName: productConfig.certificateProductName,
        entitlementId: normalizedBundle.id,
        licenseSource: "bundle",
        lemonProductId: lemonIds.productId,
        lemonVariantId: lemonIds.variantId
      };
    }
  }

  return {
    authorized: false,
    productId: normalizedProductId,
    certificateProductName: productConfig.certificateProductName,
    lemonProductId: lemonIds.productId,
    lemonVariantId: lemonIds.variantId
  };
}

module.exports = {
  BUNDLES,
  DEFAULT_PRODUCT_ID,
  PRODUCTS,
  getProductConfig,
  getRequestedProductId,
  resolveLicenseEntitlement
};

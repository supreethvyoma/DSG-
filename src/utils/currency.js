const REGION_TO_CURRENCY = {
  IN: "INR",
  US: "USD",
  GB: "GBP",
  CA: "CAD",
  AU: "AUD",
  NZ: "NZD",
  JP: "JPY",
  CN: "CNY",
  SG: "SGD",
  AE: "AED",
  SA: "SAR",
  QA: "QAR",
  KW: "KWD",
  OM: "OMR",
  BH: "BHD",
  PK: "PKR",
  BD: "BDT",
  NP: "NPR",
  LK: "LKR",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  IE: "EUR",
  PT: "EUR",
  BE: "EUR"
};

const STORAGE_KEYS = {
  preferredCurrency: "preferredCurrency",
  geoCountry: "geoCountry",
  geoPrompted: "currencyGeoPermissionPrompted"
};

function getBrowserLocale() {
  if (typeof navigator === "undefined") return "en-IN";
  return navigator.languages?.[0] || navigator.language || "en-IN";
}

function getBrowserLanguages() {
  if (typeof navigator === "undefined") return ["en-IN"];
  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    return navigator.languages;
  }
  return [navigator.language || "en-IN"];
}

function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

function getRegionFromLocale(locale) {
  const match = String(locale || "").match(/-([A-Za-z]{2})$/);
  return match ? match[1].toUpperCase() : "";
}

function isIndiaTimeZone(timeZone) {
  const tz = String(timeZone || "");
  return tz === "Asia/Kolkata" || tz === "Asia/Calcutta";
}

function isInIndiaBounds(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return false;
  return lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98;
}

export function requestLocationPermissionForCurrency() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;
  if (!("geolocation" in navigator)) return;

  const alreadyPrompted = localStorage.getItem(STORAGE_KEYS.geoPrompted) === "1";
  if (alreadyPrompted) return;

  localStorage.setItem(STORAGE_KEYS.geoPrompted, "1");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const latitude = position?.coords?.latitude;
      const longitude = position?.coords?.longitude;

      if (isInIndiaBounds(latitude, longitude)) {
        localStorage.setItem(STORAGE_KEYS.geoCountry, "IN");
      } else {
        localStorage.setItem(STORAGE_KEYS.geoCountry, "OTHER");
      }
    },
    () => {
      localStorage.setItem(STORAGE_KEYS.geoCountry, "UNKNOWN");
    },
    {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 1000 * 60 * 60 * 12
    }
  );
}

export function getUserCurrency() {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEYS.preferredCurrency);
    if (saved) return saved;

    const geoCountry = localStorage.getItem(STORAGE_KEYS.geoCountry);
    if (geoCountry === "IN") return "INR";
  }

  const languages = getBrowserLanguages();
  const hasIndiaLanguage = languages.some((lang) => String(lang).toUpperCase().includes("-IN"));
  if (hasIndiaLanguage) return "INR";

  const timeZone = getBrowserTimeZone();
  if (isIndiaTimeZone(timeZone)) return "INR";

  const locale = getBrowserLocale();
  const region = getRegionFromLocale(locale);
  return REGION_TO_CURRENCY[region] || "USD";
}

export function formatCurrencyForUser(value, options = {}) {
  const amount = Number(value || 0);
  const currency = options.currency || getUserCurrency();
  const browserLocale = getBrowserLocale();
  const locale =
    options.locale ||
    (currency === "INR" && !String(browserLocale).toUpperCase().includes("-IN")
      ? "en-IN"
      : browserLocale);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatCurrencyINR(value) {
  return formatCurrencyForUser(value, { locale: "en-IN", currency: "INR" });
}

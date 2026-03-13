export const DEFAULT_SITE_THEME = "sunrise";
const SITE_THEME_STORAGE_KEY = "site-theme-settings";

const BUILT_IN_THEME_DEFINITIONS = [
  {
    value: "sunrise",
    label: "Sunrise",
    description: "Warm saffron and sandstone accents",
    palette: {
      bg: "#f4efe7",
      surface: "#ffffff",
      text: "#1f2937",
      header: "#7c2d12",
      accent: "#9a3412",
      button: "#fb923c"
    }
  },
  {
    value: "forest",
    label: "Forest",
    description: "Deep green surfaces with fresh mint highlights",
    palette: {
      bg: "#edf6f0",
      surface: "#ffffff",
      text: "#163126",
      header: "#174d3a",
      accent: "#166534",
      button: "#22c55e"
    }
  },
  {
    value: "midnight",
    label: "Midnight",
    description: "Ink blue shell with gold accents",
    palette: {
      bg: "#edf2fb",
      surface: "#ffffff",
      text: "#18253d",
      header: "#162447",
      accent: "#1d4ed8",
      button: "#2563eb"
    }
  }
];

const HEX_COLOR_REGEX = /^#([0-9a-f]{6})$/i;

function hexToRgb(hex) {
  const normalized = String(hex || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixColors(colorA, colorB, ratio = 0.5) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const t = Math.max(0, Math.min(1, Number(ratio) || 0));

  return rgbToHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t
  });
}

function darken(color, amount = 0.15) {
  return mixColors(color, "#000000", amount);
}

function toRgba(color, alpha = 1) {
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

function getReadableTextColor(color) {
  const { r, g, b } = hexToRgb(color);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.62 ? "#111827" : "#f8fafc";
}

function buildThemeVariables(theme) {
  const palette = theme.palette;
  const headerText = getReadableTextColor(palette.header);
  const buttonText = getReadableTextColor(palette.button);
  const accentText = getReadableTextColor(palette.accent);

  return {
    "--site-bg": palette.bg,
    "--site-surface": palette.surface,
    "--site-surface-muted": mixColors(palette.surface, palette.bg, 0.4),
    "--site-text": palette.text,
    "--site-text-soft": mixColors(palette.text, palette.surface, 0.45),
    "--site-border": mixColors(palette.text, palette.surface, 0.18),
    "--site-link": palette.accent,
    "--site-link-hover": darken(palette.accent, 0.12),
    "--site-header-bg": palette.header,
    "--site-header-border": darken(palette.header, 0.18),
    "--site-header-text": headerText,
    "--site-search-border": palette.accent,
    "--site-search-focus": palette.button,
    "--site-badge-bg": mixColors(palette.button, palette.accent, 0.4),
    "--site-badge-text": accentText,
    "--site-button-bg": palette.button,
    "--site-button-hover": darken(palette.button, 0.12),
    "--site-button-text": buttonText,
    "--site-footer-bg": darken(palette.header, 0.24),
    "--site-footer-border": darken(palette.header, 0.12),
    "--site-footer-text": getReadableTextColor(darken(palette.header, 0.24)),
    "--site-hero-start": palette.header,
    "--site-hero-end": palette.button,
    "--site-card-shadow": `0 16px 40px ${toRgba(palette.header, 0.14)}`
  };
}

function normalizeCustomTheme(theme) {
  const palette = {
    bg: String(theme?.palette?.bg || "").trim(),
    surface: String(theme?.palette?.surface || "").trim(),
    text: String(theme?.palette?.text || "").trim(),
    header: String(theme?.palette?.header || "").trim(),
    accent: String(theme?.palette?.accent || "").trim(),
    button: String(theme?.palette?.button || "").trim()
  };

  const paletteValid = Object.values(palette).every((color) => HEX_COLOR_REGEX.test(color));
  if (!paletteValid) {
    return null;
  }

  const value = String(theme?.id || "").trim().toLowerCase();
  if (!value) {
    return null;
  }

  return {
    value,
    label: String(theme?.name || "Custom Theme").trim(),
    description: String(theme?.description || "Custom storefront palette").trim(),
    palette,
    isCustom: true
  };
}

export function getSiteThemeOptions(customThemes = []) {
  const normalizedCustomThemes = Array.isArray(customThemes)
    ? customThemes.map(normalizeCustomTheme).filter(Boolean)
    : [];

  return [
    ...BUILT_IN_THEME_DEFINITIONS.map((theme) => ({ ...theme, isCustom: false })),
    ...normalizedCustomThemes
  ];
}

export function readStoredSiteTheme() {
  if (typeof window === "undefined") return null;

  try {
    const rawValue = window.localStorage.getItem(SITE_THEME_STORAGE_KEY);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue);
    return {
      siteTheme: String(parsed?.siteTheme || DEFAULT_SITE_THEME),
      customThemes: Array.isArray(parsed?.customThemes) ? parsed.customThemes : []
    };
  } catch {
    return null;
  }
}

export function persistSiteTheme(themeValue, customThemes = []) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      SITE_THEME_STORAGE_KEY,
      JSON.stringify({
        siteTheme: String(themeValue || DEFAULT_SITE_THEME),
        customThemes: Array.isArray(customThemes) ? customThemes : []
      })
    );
  } catch {
    // Ignore storage failures and continue with in-memory theme application.
  }
}

export function applySiteTheme(themeValue, customThemes = []) {
  if (typeof document === "undefined") return;

  const themeOptions = getSiteThemeOptions(customThemes);
  const activeTheme =
    themeOptions.find((theme) => theme.value === themeValue) ||
    themeOptions.find((theme) => theme.value === DEFAULT_SITE_THEME) ||
    BUILT_IN_THEME_DEFINITIONS[0];

  const root = document.documentElement;
  root.setAttribute("data-site-theme", activeTheme.value);

  Object.entries(buildThemeVariables(activeTheme)).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  persistSiteTheme(activeTheme.value, customThemes);
}

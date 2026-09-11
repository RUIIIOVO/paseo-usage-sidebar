import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "../../shared/i18n/messages";

/**
 * Paseo does not expose its language to plugins: PluginHostProps carries theme,
 * host, and layout only, and the app's language preference lives in client-side
 * app settings rather than daemon config.
 *
 * It is still readable. The app persists those settings under a known key, and a
 * plugin client bundle is evaluated inside the same renderer, so the preference
 * can be read straight out of storage. Paseo's own resolution is
 * `resolveSupportedLocale(settings.language, navigator.languages)`: an explicit
 * language wins outright, and "system" (the default) falls through to the
 * navigator. This reproduces both halves, so the panel now follows an explicit
 * language override instead of only matching while the setting is "System".
 */

/** Where Paseo's app settings live. A rename upstream degrades to the navigator path. */
const APP_SETTINGS_KEY = "@paseo:app-settings";

/**
 * The stored preference, or null when it is "system", unreadable, or not a
 * locale this plugin ships. Every failure mode falls through to the navigator
 * rather than throwing: storage may be absent (native), blocked, or hold a
 * shape from a newer app version.
 */
function storedLanguage(): Locale | null {
  try {
    if (typeof localStorage === "undefined") {
      return null;
    }
    const raw = localStorage.getItem(APP_SETTINGS_KEY);
    if (!raw) {
      return null;
    }
    const language = (JSON.parse(raw) as { language?: unknown } | null)?.language;
    if (typeof language !== "string" || language === "system") {
      return null;
    }
    return isLocale(language) ? language : null;
  } catch {
    return null;
  }
}

const TWO_LETTER: Record<string, Locale> = {
  ar: "ar",
  en: "en",
  es: "es",
  fr: "fr",
  ja: "ja",
  ko: "ko",
  ru: "ru",
};

function matchTag(tag: string): Locale | null {
  const lower = tag.toLowerCase();
  if (lower === "pt" || lower === "pt-br") {
    return "pt-BR";
  }
  if (lower === "zh" || lower === "zh-cn" || lower.startsWith("zh-hans")) {
    return "zh-CN";
  }
  const primary = lower.split("-", 1)[0] ?? "";
  return TWO_LETTER[primary] ?? null;
}

function navigatorTags(): readonly string[] {
  if (typeof navigator === "undefined") {
    return [];
  }
  const nav = navigator as Navigator & { languages?: readonly string[]; language?: string };
  if (Array.isArray(nav.languages) && nav.languages.length > 0) {
    return nav.languages;
  }
  return typeof nav.language === "string" && nav.language ? [nav.language] : [];
}

function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * `platform` comes from PluginSurfaceProps.layout: browser globals only exist on web.
 * `override` lets a caller pin a locale explicitly.
 */
export function resolveLocale(platform: "ios" | "android" | "web", override?: string | null): Locale {
  if (override && isLocale(override)) {
    return override;
  }
  if (platform !== "web") {
    return DEFAULT_LOCALE;
  }
  const explicit = storedLanguage();
  if (explicit) {
    return explicit;
  }
  for (const tag of navigatorTags()) {
    const matched = matchTag(tag);
    if (matched) {
      return matched;
    }
  }
  return DEFAULT_LOCALE;
}

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "./i18n.shared";

/**
 * Paseo does not expose its language to plugins: PluginHostProps carries theme,
 * host, and layout only, and the app's language preference lives in client-side
 * app settings rather than daemon config.
 *
 * This mirrors Paseo's own `resolveSupportedLocale` for its default "system"
 * setting, run against the same navigator the app itself reads. It matches the
 * app exactly unless the user has explicitly overridden Paseo's language to
 * something other than their system locale.
 */

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
  for (const tag of navigatorTags()) {
    const matched = matchTag(tag);
    if (matched) {
      return matched;
    }
  }
  return DEFAULT_LOCALE;
}

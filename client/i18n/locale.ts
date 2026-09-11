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

/**
 * Language changes are not announced.
 *
 * Paseo writes the new preference into `@paseo:app-settings` and re-renders its
 * own tree from React state; nothing crosses into plugin land. `storage` only
 * fires for *other* documents, so a same-window switch — which is the only kind
 * that happens here — never emits an event. The value is therefore polled, and
 * the poll is the whole mechanism: one `localStorage.getItem` plus a `JSON.parse`
 * of a small object, at 1 Hz, only while something is actually subscribed.
 */
const LOCALE_POLL_MS = 1_000;

let current: Locale | null = null;
const listeners = new Set<(locale: Locale) => void>();
let timer: ReturnType<typeof setInterval> | null = null;

/**
 * The live locale, memoised so repeated reads (and `useSyncExternalStore`'s
 * snapshot, which demands a stable identity between changes) do not re-parse
 * storage on every call.
 */
export function getLocale(platform: "ios" | "android" | "web" = "web"): Locale {
  if (platform !== "web") {
    return DEFAULT_LOCALE;
  }
  if (current === null) {
    current = resolveLocale("web");
  }
  return current;
}

function check(): void {
  const next = resolveLocale("web");
  if (next === current) {
    return;
  }
  current = next;
  for (const listener of listeners) {
    listener(next);
  }
}

/**
 * Calls back whenever the resolved locale changes. Returns an unsubscribe; the
 * poll stops with the last subscriber.
 *
 * On iOS and Android there is no storage and no navigator to change, so this is
 * a no-op that never fires.
 */
export function subscribeLocale(listener: (locale: Locale) => void): () => void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return () => {};
  }
  if (listeners.size === 0) {
    // The cache is only kept current by the poll, so it is stale by definition
    // after an idle gap. Re-resolving before the first listener arrives means
    // the snapshot it reads immediately after this call is already right,
    // instead of being a poll-tick behind. Safe to write without notifying:
    // there is nobody to notify.
    current = resolveLocale("web");
  }
  listeners.add(listener);
  if (timer === null) {
    timer = setInterval(check, LOCALE_POLL_MS);
    // Cross-document writes still arrive as events; taking them too just makes
    // the other-window case instant instead of up to a second late.
    window.addEventListener("storage", check);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
      window.removeEventListener("storage", check);
    }
  };
}

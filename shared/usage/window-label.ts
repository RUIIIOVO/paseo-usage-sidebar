import type { Messages } from "../i18n/messages";
import type { UsageWindow } from "./contract";

/**
 * Paseo labels Claude's rolling windows "Session" and "Weekly · <model>", which
 * says nothing about the actual period. The daemon's window ids do, and the
 * wording follows Claude Code's `/usage` ("Current session", "Current week
 * (Opus)") rather than the daemon's bare adjectives:
 *
 *   five_hour            → the 5-hour rolling window (labelled "Session")
 *   weekly               → the 7-day window
 *   weekly_<model>       → a model-scoped 7-day window, e.g. weekly_model_fable
 *   daily / monthly      → other providers' fixed windows
 *   coding_limit_*, interval_*, everything else → keep the daemon's own label
 *
 * The model suffix is taken from the daemon's label ("Weekly · Fable") when it
 * has one, because that is the provider's display name for it; the id is only a
 * fallback for a label that does not follow the convention.
 */
function modelSuffix(window: UsageWindow): string | null {
  const separator = window.label.indexOf("·");
  if (separator >= 0) {
    const suffix = window.label.slice(separator + 1).trim();
    if (suffix) {
      return suffix;
    }
  }
  const fromId = window.id.replace(/^weekly_(model_)?/, "").replace(/[_-]+/g, " ").trim();
  if (!fromId) {
    return null;
  }
  return fromId.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function windowLabel(window: UsageWindow, messages: Messages): string {
  if (window.id === "five_hour") {
    return messages.windowFiveHour;
  }
  if (window.id === "weekly") {
    return messages.windowWeekly;
  }
  if (window.id.startsWith("weekly_")) {
    const suffix = modelSuffix(window);
    return suffix ? messages.windowScoped(messages.windowWeekly, suffix) : messages.windowWeekly;
  }
  if (window.id === "daily") {
    return messages.windowDaily;
  }
  if (window.id === "monthly") {
    return messages.windowMonthly;
  }
  return window.label;
}

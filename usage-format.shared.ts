import type { Locale, Messages } from "./i18n.shared";
import type { UsageBalance, UsageTone, UsageWindow } from "./usage.shared";

/**
 * Value shapes mirror Paseo's own provider-usage helpers (percent rounding, tone
 * thresholds, compact durations); only the wording is localized, because Paseo's
 * copy for this surface is hardcoded English.
 */

export function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function formatPct(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(
    Math.round(clampPct(value)) / 100,
  );
}

/** Compact `2d` / `3h` / `5m`, localized. Returns null for a non-finite instant. */
function compactDuration(deltaMs: number, messages: Messages): string | null {
  if (!Number.isFinite(deltaMs)) {
    return null;
  }
  const minutes = Math.floor(deltaMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return messages.days(days);
  }
  if (hours > 0) {
    return messages.hours(hours);
  }
  return messages.minutes(minutes);
}

export function formatResetLabel(iso: string | null | undefined, messages: Messages): string | null {
  if (!iso) {
    return null;
  }
  const deltaMs = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(deltaMs)) {
    return null;
  }
  if (deltaMs <= 0) {
    return messages.resettingNow;
  }
  const duration = compactDuration(deltaMs, messages);
  return duration ? messages.resets(duration) : null;
}

export function formatRunsOutLabel(iso: string | null | undefined, messages: Messages): string | null {
  if (!iso) {
    return null;
  }
  const deltaMs = new Date(iso).getTime() - Date.now();
  const duration = compactDuration(Math.max(deltaMs, 0), messages);
  return duration ? messages.runsOut(duration) : null;
}

export function formatAgo(iso: string | null | undefined, messages: Messages): string | null {
  if (!iso) {
    return null;
  }
  const deltaMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(deltaMs)) {
    return null;
  }
  if (deltaMs < 60_000) {
    return messages.justNow;
  }
  const duration = compactDuration(deltaMs, messages);
  return duration ? messages.ago(duration) : null;
}

function formatTokenCount(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatAmount(value: number, unit: UsageBalance["unit"], locale: Locale): string {
  switch (unit) {
    case "usd":
      return new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(value);
    case "tokens":
      return formatTokenCount(value, locale);
    default:
      return new Intl.NumberFormat(locale).format(value);
  }
}

export function deriveTone(usedPct: number | null): UsageTone {
  if (usedPct == null) {
    return "default";
  }
  if (usedPct > 90) {
    return "danger";
  }
  if (usedPct >= 70) {
    return "warning";
  }
  return "default";
}

/** A window reports either the consumed or the remaining share; normalize to consumed. */
export function windowUsedPct(window: UsageWindow): number | null {
  if (window.usedPct != null) {
    return window.usedPct;
  }
  if (window.remainingPct != null) {
    return 100 - window.remainingPct;
  }
  return null;
}

export function balanceReading(
  balance: UsageBalance,
  locale: Locale,
  messages: Messages,
): { amountText: string; usedPct: number | null } {
  const { used, remaining, limit, unit } = balance;
  if (limit != null && limit > 0) {
    const consumed = used ?? (remaining != null ? limit - remaining : null);
    return {
      amountText: `${consumed != null ? formatAmount(consumed, unit, locale) : "—"} / ${formatAmount(limit, unit, locale)}`,
      usedPct: consumed != null ? (consumed / limit) * 100 : null,
    };
  }
  if (remaining != null) {
    return { amountText: messages.balanceLeft(formatAmount(remaining, unit, locale)), usedPct: null };
  }
  if (used != null) {
    return { amountText: formatAmount(used, unit, locale), usedPct: null };
  }
  return { amountText: "—", usedPct: null };
}

export function statusLabel(
  status: "available" | "unavailable" | "error",
  messages: Messages,
): string | null {
  if (status === "available") {
    return null;
  }
  return status === "error" ? messages.error : messages.unavailable;
}

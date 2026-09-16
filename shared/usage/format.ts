import type { Locale, Messages } from "../i18n/messages";
import type { UsageBalance, UsageTone, UsageWindow } from "./contract";

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

/**
 * Two-unit compact duration (`2d 3h`, `3h 25m`, `40m`), localized.
 *
 * Claude Code and Codex both spell the remainder out to a second unit — `3h 25m`
 * rather than `3h` — because a bare leading unit hides up to an hour of headroom
 * right when the window is about to matter. Returns null for a non-finite instant.
 */
function compactDuration(deltaMs: number, messages: Messages): string | null {
  if (!Number.isFinite(deltaMs)) {
    return null;
  }
  const totalMinutes = Math.floor(deltaMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  if (days > 0) {
    return hours > 0 ? `${messages.days(days)} ${messages.hours(hours)}` : messages.days(days);
  }
  if (hours > 0) {
    return minutes > 0 ? `${messages.hours(hours)} ${messages.minutes(minutes)}` : messages.hours(hours);
  }
  return messages.minutes(minutes);
}

const DAY_MS = 24 * 60 * 60_000;

/** Remaining time until an instant, or null when it is absent, unparseable, or past. */
function remainingMs(iso: string | null | undefined): number | null {
  if (!iso) {
    return null;
  }
  const delta = new Date(iso).getTime() - Date.now();
  return Number.isFinite(delta) && delta > 0 ? delta : null;
}

/** Within a day, the wall-clock time; beyond it, the date too. Mirrors Claude Code's `/usage`. */
export function formatResetClock(
  iso: string | null | undefined,
  locale: Locale,
  messages: Messages,
): string | null {
  if (!iso) {
    return null;
  }
  const at = new Date(iso);
  const time = at.getTime();
  const remaining = time - Date.now();
  // A reset that already came due is announced as "resetting now"; a stale
  // wall-clock time next to that would read as a contradiction.
  if (!Number.isFinite(time) || remaining <= 0) {
    return null;
  }
  const withinADay = remaining < DAY_MS;
  const clock = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    ...(withinADay ? {} : { month: "short", day: "numeric" }),
  }).format(at);
  return messages.resetsAt(clock);
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

/**
 * The reset a row leads with: a countdown while the window still resets today,
 * the wall-clock instant once it is a day or more out.
 *
 * Claude Code makes the same split — its session bar prints `Resets 3pm` while
 * the weekly bars print `Resets Nov 12, 3pm` — because the two horizons answer
 * different questions. Under a day, "how long do I have" is the actionable
 * number; past that, `1d` is too coarse to plan around and a date is not.
 */
export function formatResetPrimary(
  iso: string | null | undefined,
  locale: Locale,
  messages: Messages,
): string | null {
  const remaining = remainingMs(iso);
  if (remaining == null) {
    return formatResetLabel(iso, messages);
  }
  return remaining >= DAY_MS ? formatResetClock(iso, locale, messages) : formatResetLabel(iso, messages);
}

/** The other half of the pair, for a tooltip: whichever form the row did not print. */
export function formatResetSecondary(
  iso: string | null | undefined,
  locale: Locale,
  messages: Messages,
): string | null {
  const remaining = remainingMs(iso);
  if (remaining == null) {
    return null;
  }
  return remaining >= DAY_MS ? formatResetLabel(iso, messages) : formatResetClock(iso, locale, messages);
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

/** Where the ramp steps. Below `WARNING` a window is simply not the problem. */
const WARNING_PCT = 70;
const DANGER_PCT = 90;

/**
 * A reading's own tone, from the share consumed.
 *
 * A known-good reading is `ok`, not `default`: the two used to collapse into one
 * value, which left every healthy bar painted in the "no data" grey and made
 * "comfortable" and "unknown" indistinguishable.
 */
export function deriveTone(usedPct: number | null): UsageTone {
  if (usedPct == null) {
    return "default";
  }
  if (usedPct > DANGER_PCT) {
    return "danger";
  }
  return usedPct >= WARNING_PCT ? "warning" : "ok";
}

const SEVERITY: Record<UsageTone, number> = { default: 0, ok: 1, warning: 2, danger: 3 };

/**
 * The tone a bar paints: the more severe of what the daemon reported and what
 * the percentage implies.
 *
 * Neither alone is right. Taking the daemon's blindly means its thresholds decide
 * where this plugin's ramp steps, and a provider that reports no tone at all
 * paints grey. Deriving locally and ignoring the daemon throws away the one thing
 * a percentage cannot express — a window projected to run out early is `danger`
 * at 40% — so the escalation is kept and only the floor is ours.
 */
export function resolveTone(reported: UsageTone | undefined, usedPct: number | null): UsageTone {
  const derived = deriveTone(usedPct);
  if (reported == null) {
    return derived;
  }
  return SEVERITY[reported] >= SEVERITY[derived] ? reported : derived;
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

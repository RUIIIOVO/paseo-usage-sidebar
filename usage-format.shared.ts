import type { UsageBalance, UsageTone, UsageWindow } from "./usage.shared";

/**
 * Formatting mirrors Paseo's own provider-usage helpers so the surface reads
 * identically to Settings → Usage. Keep the outputs byte-for-byte compatible.
 */

export function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function formatPct(value: number): string {
  return `${Math.round(clampPct(value))}%`;
}

function relative(iso: string): string | null {
  const deltaMs = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(deltaMs)) {
    return null;
  }
  if (deltaMs <= 0) {
    return "now";
  }
  const minutes = Math.floor(deltaMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return `${days}d`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
}

export function formatResetLabel(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }
  const value = relative(iso);
  if (!value) {
    return null;
  }
  return value === "now" ? "resetting now" : `resets ${value}`;
}

export function formatAgo(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }
  const deltaMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(deltaMs)) {
    return null;
  }
  if (deltaMs < 60_000) {
    return "just now";
  }
  const minutes = Math.floor(deltaMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return `${days}d ago`;
  }
  if (hours > 0) {
    return `${hours}h ago`;
  }
  return `${minutes}m ago`;
}

function formatTokenCount(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return String(Math.round(value));
}

export function formatAmount(value: number, unit: UsageBalance["unit"]): string {
  switch (unit) {
    case "usd":
      return `$${value.toFixed(2)}`;
    case "tokens":
      return formatTokenCount(value);
    default:
      return value.toLocaleString();
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

export function balanceReading(balance: UsageBalance): { amountText: string; usedPct: number | null } {
  const { used, remaining, limit, unit } = balance;
  if (limit != null && limit > 0) {
    const consumed = used ?? (remaining != null ? limit - remaining : null);
    return {
      amountText: `${consumed != null ? formatAmount(consumed, unit) : "—"} / ${formatAmount(limit, unit)}`,
      usedPct: consumed != null ? (consumed / limit) * 100 : null,
    };
  }
  if (remaining != null) {
    return { amountText: `${formatAmount(remaining, unit)} left`, usedPct: null };
  }
  if (used != null) {
    return { amountText: formatAmount(used, unit), usedPct: null };
  }
  return { amountText: "—", usedPct: null };
}

export function statusLabel(status: "available" | "unavailable" | "error"): string | null {
  if (status === "available") {
    return null;
  }
  return status === "error" ? "Error" : "Unavailable";
}

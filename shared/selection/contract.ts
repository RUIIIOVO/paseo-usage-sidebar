import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";
import type { Messages } from "../i18n/messages";
import type { ProviderUsage, UsageSnapshot, UsageWindow } from "../usage/contract";

/**
 * Which rows the sidebar meter pins. A row is identified by provider and window
 * id rather than by index, so a provider that reports its windows in a different
 * order — or temporarily drops one — does not silently repoint the selection.
 */
export const SelectionSchema = z.object({
  keys: z.array(z.string()).default([]),
  /** False until the user picks anything; the meter then shows its own default. */
  configured: z.boolean().default(false),
});

export type Selection = z.output<typeof SelectionSchema>;

export const readSelection = defineRpc({
  name: "selection.read",
  input: z.object({}),
  output: SelectionSchema,
});

export const writeSelection = defineRpc({
  name: "selection.write",
  input: z.object({ keys: z.array(z.string()) }),
  output: SelectionSchema,
});

export function rowKey(providerId: string, windowId: string): string {
  return `${providerId}:${windowId}`;
}

/** Default pin set: every window of the first provider that reports usage. */
export function defaultKeys(snapshot: UsageSnapshot): string[] {
  const provider = snapshot.providers.find(
    (candidate) => candidate.status === "available" && candidate.windows.length > 0,
  );
  return provider ? provider.windows.map((window) => rowKey(provider.providerId, window.id)) : [];
}

/**
 * Apply a rearrangement of the rows on screen to the full pin list.
 *
 * The reorder block only ever sees the pins the current snapshot can resolve, so
 * what it hands back is a permutation of those — not of the list that gets
 * persisted. Saving it as-is dropped every pin whose provider happened to be
 * missing from that one poll, for good. The visible keys are instead dealt back
 * into the slots visible keys already held, which leaves an unresolved pin exactly
 * where it was, ready for the poll that brings its window back.
 */
export function reorderVisible(order: readonly string[], visible: readonly string[]): string[] {
  const slots = new Set(visible);
  const queue = [...visible];
  const next = order.map((key) => (slots.has(key) ? (queue.shift() ?? key) : key));
  // Not reachable from the panel, where `visible` is drawn from `order`; kept so a
  // caller that passes a stray key loses nothing rather than losing it silently.
  return [...next, ...queue];
}

export type PinnedRow = {
  key: string;
  providerId: string;
  providerName: string;
  label: string;
  usedPct: number | null;
  window: UsageWindow;
};

/**
 * Resolve a selection against a snapshot, in the order the keys are pinned.
 *
 * The key order is the user's own arrangement, so it wins over the order Paseo
 * reports; an unconfigured selection falls back to `defaultKeys`, which is that
 * provider order. Keys whose provider or window disappeared are skipped rather
 * than rendered as empty rows, and a duplicate key is honoured once.
 */
export function pinnedRows(
  snapshot: UsageSnapshot,
  selection: Selection,
  labelFor: (provider: ProviderUsage, window: UsageWindow, messages: Messages) => string,
  messages: Messages,
): PinnedRow[] {
  const available = new Map<string, { provider: ProviderUsage; window: UsageWindow }>();
  for (const provider of snapshot.providers) {
    for (const window of provider.windows) {
      available.set(rowKey(provider.providerId, window.id), { provider, window });
    }
  }

  const rows: PinnedRow[] = [];
  const seen = new Set<string>();
  for (const key of selection.configured ? selection.keys : defaultKeys(snapshot)) {
    const hit = available.get(key);
    if (!hit || seen.has(key)) {
      continue;
    }
    seen.add(key);
    const { provider, window } = hit;
    rows.push({
      key,
      providerId: provider.providerId,
      providerName: provider.displayName,
      label: labelFor(provider, window, messages),
      usedPct: window.usedPct ?? (window.remainingPct != null ? 100 - window.remainingPct : null),
      window,
    });
  }
  return rows;
}

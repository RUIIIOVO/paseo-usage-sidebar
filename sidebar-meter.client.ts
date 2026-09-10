import type { PluginClientContext, PluginCleanup } from "@getpaseo/plugin";
import { messagesFor, type Messages } from "./i18n.shared";
import { resolveLocale } from "./locale.client";
import { clampPct, deriveTone, formatPct, windowUsedPct } from "./usage-format.shared";
import { listUsage, type UsageSnapshot, type UsageTone } from "./usage.shared";

/**
 * An always-visible meter directly under the plugin's own sidebar item.
 *
 * Paseo has no sidebar-widget contribution: a sidebar item is
 * `{ id, title, icon, surface }` and renders as a host-owned row. This mounts a
 * plain DOM node next to that row instead, which is possible only because the
 * desktop and web clients evaluate plugin client bundles inside the same
 * renderer. It is unsupported by the plugin API and deliberately fail-soft:
 * every step that depends on host internals degrades to "render nothing".
 *
 * Anchor: the row's testID, which Paseo derives from this plugin's own id, so it
 * cannot collide with another plugin.
 */
const ANCHOR_SELECTOR = '[data-testid="plugin-sidebar-usage-sidebar-usage"]';
const REFRESH_INTERVAL_MS = 60_000;
const MAX_ROWS = 4;
const NODE_MARK = "data-usage-sidebar-meter";

/** Paseo's own status palette, dark and light variants. */
const TONE_COLORS = {
  dark: { ok: "#6cb17b", warning: "#c09664", danger: "#d8847b", default: "#8b90a0" },
  light: { ok: "#3e704a", warning: "#7b5d39", danger: "#9d433b", default: "#6b7280" },
} as const;

type Row = { label: string; usedPct: number | null; tone: UsageTone };

function parseRgb(value: string): [number, number, number] | null {
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) {
    return null;
  }
  const parts = (match[1] ?? "").split(",").map((part) => Number.parseFloat(part.trim()));
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  return [parts[0] as number, parts[1] as number, parts[2] as number];
}

/** Walk up for the first opaque background so a transparent row does not read as dark. */
function isDarkBackground(element: Element): boolean {
  let current: Element | null = element;
  while (current) {
    const rgb = parseRgb(getComputedStyle(current).backgroundColor);
    if (rgb) {
      const [r, g, b] = rgb;
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      if (luminance > 0 || r + g + b > 0) {
        return luminance < 0.5;
      }
    }
    current = current.parentElement;
  }
  return true;
}

function toRows(snapshot: UsageSnapshot): Row[] {
  const rows: Row[] = [];
  for (const provider of snapshot.providers) {
    if (provider.status !== "available") {
      continue;
    }
    for (const window of provider.windows) {
      const usedPct = windowUsedPct(window);
      rows.push({ label: window.label, usedPct, tone: window.tone ?? deriveTone(usedPct) });
      if (rows.length >= MAX_ROWS) {
        return rows;
      }
    }
  }
  return rows;
}

export function startSidebarMeter(client: PluginClientContext): PluginCleanup {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
    return () => {};
  }

  const messages: Messages = messagesFor(resolveLocale("web"));
  let node: HTMLElement | null = null;
  let rows: Row[] = [];
  let stopped = false;

  function paint(): void {
    if (!node) {
      return;
    }
    const anchor = document.querySelector(ANCHOR_SELECTOR);
    const labelColor = anchor ? getComputedStyle(anchor).color : "#8b90a0";
    const palette = TONE_COLORS[anchor && !isDarkBackground(anchor) ? "light" : "dark"];
    const rgb = parseRgb(labelColor) ?? [139, 144, 160];
    const trackColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.18)`;

    node.textContent = "";
    if (rows.length === 0) {
      return;
    }

    for (const row of rows) {
      const item = document.createElement("div");
      item.style.cssText = "display:flex;flex-direction:column;gap:4px;";

      const head = document.createElement("div");
      head.style.cssText = "display:flex;justify-content:space-between;gap:8px;align-items:baseline;";

      const label = document.createElement("span");
      label.textContent = row.label;
      label.style.cssText = `color:${labelColor};font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;

      const value = document.createElement("span");
      value.textContent = row.usedPct != null ? formatPct(row.usedPct, resolveLocale("web")) : "—";
      value.style.cssText = `color:${labelColor};font-size:11px;font-weight:500;flex-shrink:0;`;

      head.append(label, value);

      const track = document.createElement("div");
      track.style.cssText = `height:3px;border-radius:2px;background:${trackColor};overflow:hidden;`;

      const fill = document.createElement("div");
      fill.style.cssText = `height:3px;border-radius:2px;width:${clampPct(row.usedPct ?? 0)}%;background:${palette[row.tone]};`;

      track.append(fill);
      item.append(head, track);
      node.append(item);
    }

    node.title = messages.title;
  }

  function ensureMounted(): void {
    if (stopped) {
      return;
    }
    const anchor = document.querySelector(ANCHOR_SELECTOR);
    const parent = anchor?.parentElement;
    if (!anchor || !parent) {
      return;
    }
    if (node && node.parentElement === parent) {
      return;
    }
    node?.remove();

    const created = document.createElement("div");
    created.setAttribute(NODE_MARK, "true");
    const anchorStyle = getComputedStyle(anchor);
    created.style.cssText = [
      "display:flex",
      "flex-direction:column",
      "gap:9px",
      "margin:5px 0 9px",
      `padding-left:${anchorStyle.paddingLeft || "8px"}`,
      `padding-right:${anchorStyle.paddingRight || "8px"}`,
      "pointer-events:none",
    ].join(";");

    parent.insertBefore(created, anchor.nextSibling);
    node = created;
    paint();
  }

  async function refresh(): Promise<void> {
    try {
      const snapshot = await client.rpc(listUsage, {});
      rows = toRows(snapshot as UsageSnapshot);
      ensureMounted();
      paint();
    } catch {
      // Keep the last painted rows; the panel surfaces the real error.
    }
  }

  // The sidebar unmounts on route changes and on window resize breakpoints.
  const observer = new MutationObserver(() => ensureMounted());
  observer.observe(document.body, { childList: true, subtree: true });

  ensureMounted();
  void refresh();
  const timer = setInterval(() => void refresh(), REFRESH_INTERVAL_MS);

  return () => {
    stopped = true;
    clearInterval(timer);
    observer.disconnect();
    node?.remove();
    node = null;
  };
}

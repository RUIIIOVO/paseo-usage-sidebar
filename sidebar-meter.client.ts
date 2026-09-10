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
/** Theme changes are not announced in the DOM, so the probed colours are polled. */
const APPEARANCE_POLL_MS = 2_000;
const MAX_ROWS = 4;
const NODE_MARK = "data-usage-sidebar-meter";

/**
 * Paseo's built-in themes, keyed by the sidebar background they paint.
 *
 * Plugins receive theme colors as props inside a surface, but this meter is a raw
 * DOM node outside React, so the theme has to be identified from what is actually
 * rendered. Every built-in theme paints a distinct sidebar background, which makes
 * it a reliable key. Values are Paseo's own tokens, so the meter matches the app
 * exactly rather than approximating it.
 */
type Palette = Record<UsageTone, string>;

const STATUS_DARK: Palette = { ok: "#6cb17b", warning: "#c09664", danger: "#d8847b", default: "#8b90a0" };
const STATUS_LIGHT: Palette = { ok: "#3e704a", warning: "#7b5d39", danger: "#9d433b", default: "#71717a" };

type ThemeTokens = { track: string; label: string; status: Palette };

const THEMES: ReadonlyArray<{ sidebar: [number, number, number] } & ThemeTokens> = [
  // light
  { sidebar: [244, 244, 245], track: "#e4e4e7", label: "#71717a", status: STATUS_LIGHT },
  // dark
  { sidebar: [20, 23, 22], track: "#434645", label: "#A1A5A4", status: STATUS_DARK },
  // zinc
  { sidebar: [19, 19, 22], track: "#3f3f46", label: "#a1a1aa", status: STATUS_DARK },
  // midnight
  { sidebar: [18, 20, 32], track: "#3c3e4c", label: "#9a9db0", status: STATUS_DARK },
  // claude
  { sidebar: [26, 25, 24], track: "#4a4745", label: "#ada9a5", status: STATUS_DARK },
  // ghostty
  { sidebar: [33, 37, 45], track: "#4a4f5e", label: "#c8ccd8", status: STATUS_DARK },
  // pure black
  { sidebar: [0, 0, 0], track: "#202020", label: "#a1a1aa", status: STATUS_DARK },
];

/** dark (#141716) and zinc (#131316) differ by 5, so match the nearest theme, not the first in range. */
const MATCH_MAX_DISTANCE = 12;

type Row = { label: string; usedPct: number | null; tone: UsageTone };

function parseColor(value: string): { rgb: [number, number, number]; alpha: number } | null {
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) {
    return null;
  }
  const parts = (match[1] ?? "")
    .split(/[,/]/)
    .map((part) => Number.parseFloat(part.trim()))
    .filter((part) => !Number.isNaN(part));
  if (parts.length < 3) {
    return null;
  }
  return {
    rgb: [parts[0] as number, parts[1] as number, parts[2] as number],
    alpha: parts.length > 3 ? (parts[3] as number) : 1,
  };
}

function luminanceOf(rgb: [number, number, number]): number {
  return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
}

/** First ancestor background that actually paints; a row's own background is transparent. */
function paintedBackground(anchor: Element): [number, number, number] | null {
  let current: Element | null = anchor;
  while (current) {
    const parsed = parseColor(getComputedStyle(current).backgroundColor);
    if (parsed && parsed.alpha > 0.05) {
      return parsed.rgb;
    }
    current = current.parentElement;
  }
  return null;
}

function matchTheme(background: [number, number, number]): ThemeTokens | null {
  let best: ThemeTokens | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const theme of THEMES) {
    const distance =
      Math.abs(theme.sidebar[0] - background[0]) +
      Math.abs(theme.sidebar[1] - background[1]) +
      Math.abs(theme.sidebar[2] - background[2]);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = theme;
    }
  }
  return bestDistance <= MATCH_MAX_DISTANCE ? best : null;
}

type Appearance = { labelColor: string; trackColor: string; palette: Palette; key: string };

/**
 * Exact tokens for a built-in theme; for anything else (a plugin-contributed
 * theme) fall back to the rendered text color plus a light/dark status palette
 * chosen by background luminance.
 */
function readAppearance(): Appearance | null {
  const anchor = document.querySelector(ANCHOR_SELECTOR);
  if (!anchor) {
    return null;
  }
  const background = paintedBackground(anchor);
  const matched = background ? matchTheme(background) : null;
  if (matched) {
    return {
      labelColor: matched.label,
      trackColor: matched.track,
      palette: matched.status,
      key: `${matched.label}|${matched.track}|${matched.status.ok}`,
    };
  }

  const dark = background ? luminanceOf(background) <= 0.5 : true;
  const labelColor = getComputedStyle(anchor).color || (dark ? "#A1A5A4" : "#71717a");
  const rgb = parseColor(labelColor)?.rgb ?? (dark ? [161, 165, 164] : [113, 113, 122]);
  return {
    labelColor,
    trackColor: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.22)`,
    palette: dark ? STATUS_DARK : STATUS_LIGHT,
    key: `fallback|${labelColor}|${dark ? "dark" : "light"}`,
  };
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
  let appearance: Appearance | null = null;

  /** Repaints only when the measured colours actually changed. */
  function syncAppearance(): boolean {
    const next = readAppearance();
    if (!next) {
      return false;
    }
    if (appearance && appearance.key === next.key) {
      return false;
    }
    appearance = next;
    return true;
  }

  function paint(): void {
    if (!node) {
      return;
    }
    const { labelColor, trackColor, palette } = appearance ?? {
      labelColor: STATUS_DARK.default,
      trackColor: "rgba(139, 144, 160, 0.22)",
      palette: STATUS_DARK,
    };

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
    syncAppearance();
    paint();
  }

  async function refresh(): Promise<void> {
    try {
      const snapshot = await client.rpc(listUsage, {});
      rows = toRows(snapshot as UsageSnapshot);
      ensureMounted();
      syncAppearance();
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
  const appearanceTimer = setInterval(() => {
    if (!stopped && syncAppearance()) {
      paint();
    }
  }, APPEARANCE_POLL_MS);

  const media = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: light)") : null;
  const onSchemeChange = () => {
    if (syncAppearance()) {
      paint();
    }
  };
  media?.addEventListener("change", onSchemeChange);

  return () => {
    stopped = true;
    clearInterval(timer);
    clearInterval(appearanceTimer);
    media?.removeEventListener("change", onSchemeChange);
    observer.disconnect();
    node?.remove();
    node = null;
  };
}

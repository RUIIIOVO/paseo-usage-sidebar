import type { UsageTone } from "./contract";

/**
 * The one place bar colours are defined. Both surfaces that paint a bar — the
 * panel (React, inside a themed surface) and the sidebar meter (a raw DOM node
 * that probes its colours) — read from here, because the two had drifted: the
 * meter carried its own literals and the panel derived most of its fills from
 * host theme tokens, so a change to one silently disagreed with the other.
 *
 * The ramp is blue → orange → red rather than Paseo's green → amber → red.
 * Green reads as "good" and spends the eye's only strong signal on the state
 * that needs no attention; blue is the neutral "nothing to do here" colour, which
 * leaves warm hues to mean exactly one thing — you are running out — and makes
 * the orange→red step the only colour change in the block.
 *
 * `default` stays grey: it is not a low reading, it is a missing one.
 */
type Palette = Record<UsageTone, string>;

/**
 * Tuned against a light track (#e4e4e7), not against text rules. The previous
 * warning token (#7b5d39) came from Paseo's text palette, where a light
 * background demands dark ink; as a 4px fill it read as brown.
 *
 * Orange is the one entry that trades contrast for hue. On white, brightness and
 * contrast move in opposite directions, and an orange dark enough to clear 3:1 on
 * the track is back to reading as amber-brown — the exact thing being fixed. This
 * sits at 2.8 on the track and 3.6 on the page behind it, which is the point where
 * it still reads unambiguously orange. Pure #f97316 would be 2.0 and vanish.
 * Blue and red pay no such tax and clear 3:1 on both.
 */
export const STATUS_LIGHT: Palette = {
  ok: "#2f6fd0",
  warning: "#cc7016",
  danger: "#c53b3b",
  default: "#71717a",
};

/** Same ramp against a dark track (#434645), where brightness and contrast agree. */
export const STATUS_DARK: Palette = {
  ok: "#6ba3e0",
  warning: "#e8a462",
  danger: "#e8756a",
  default: "#8b90a0",
};

/** Perceived lightness of an `#rrggbb` colour, or null when it is not one. */
export function hexLuminance(color: string): number | null {
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!hex) {
    return null;
  }
  const value = Number.parseInt(hex[1]!, 16);
  return (0.299 * ((value >> 16) & 255) + 0.587 * ((value >> 8) & 255) + 0.114 * (value & 255)) / 255;
}

/** Which ramp a surface takes. Unknown colours fall back to the dark one. */
export function paletteForSurface(color: string): Palette {
  const luminance = hexLuminance(color);
  return luminance != null && luminance > 0.6 ? STATUS_LIGHT : STATUS_DARK;
}

export type { Palette };

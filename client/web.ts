import type { View } from "react-native";

/** Native has accessibilityLabel; web also gets a hover tooltip. */
export function updatePinButtonMetadata(view: View | null, label: string, platform: string): void {
  if (platform !== "web") return;
  const node = view as unknown as HTMLElement | null;
  if (!node || typeof node.setAttribute !== "function") return;
  node.setAttribute("title", label);
  // Keyboard focus uses the button's surface tint instead of a browser outline.
  node.style.outlineStyle = "none";
}

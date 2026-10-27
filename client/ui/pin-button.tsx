import type { PluginTheme } from "@getpaseo/plugin";
import { useEffect, useRef, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, View } from "react-native";
import { updatePinButtonMetadata } from "../web";
import { PIN_OUTLINE_SOURCE, PIN_SOLID_SOURCE } from "./pin-glyph";

/** One pin affordance for both the usage rows and the sidebar arrangement. */
export function PinButton({
  pinned,
  label,
  disabled = false,
  compact,
  theme,
  onPress,
}: {
  pinned: boolean;
  label: string;
  disabled?: boolean;
  compact: boolean;
  theme: PluginTheme;
  onPress: () => void;
}) {
  const ref = useRef<View | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    updatePinButtonMetadata(ref.current, label, Platform.OS);
  }, [label]);

  return (
    <Pressable
      ref={ref}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: pinned, disabled }}
      aria-checked={pinned}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.button,
        { width: compact ? 44 : 32, height: compact ? 44 : 32 },
        {
          backgroundColor: hovered || pressed || focused ? theme.colors.surface2 : "transparent",
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Image
        accessible={false}
        source={pinned ? PIN_SOLID_SOURCE : PIN_OUTLINE_SOURCE}
        tintColor={pinned ? theme.colors.foreground : theme.colors.foregroundMuted}
        resizeMode="contain"
        style={styles.glyph}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  glyph: { width: 16, height: 16 },
  button: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
});

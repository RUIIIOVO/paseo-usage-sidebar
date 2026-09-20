import type { PluginTheme } from "@getpaseo/plugin";
import { useRpc, type PluginSurfaceProps } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  balanceReading,
  clampPct,
  formatAgo,
  formatPct,
  formatResetPrimary,
  formatRunsOutLabel,
  resolveTone,
  statusLabel,
  windowUsedPct,
} from "../../shared/usage/format";
import { paletteForSurface } from "../../shared/usage/palette";
import { errorMessage, panelFailureView } from "../../shared/usage/errors";
import { isRtl, messagesFor, type Locale, type Messages } from "../../shared/i18n/messages";
import { getLocale, subscribeLocale } from "../i18n/locale";
import { publishSelection } from "../selection/store";
import {
  defaultKeys,
  pinnedRows,
  readSelection,
  rowKey,
  writeSelection,
  type PinnedRow,
  type Selection,
} from "../../shared/selection/contract";
import { windowLabel } from "../../shared/usage/window-label";
import {
  listUsage,
  type ProviderUsage,
  type UsageBalance,
  type UsageSnapshot,
  type UsageTone,
  type UsageWindow,
} from "../../shared/usage/contract";

const REFRESH_INTERVAL_MS = 60_000;
const STALE_TIME_MS = 30_000;

/** Paseo's design tokens, inlined because the plugin theme only exposes colors. */
const SPACE = { 1: 4, 1.5: 6, 2: 8, 3: 12, 4: 16, 6: 24 } as const;
const FONT = { sm: 12, base: 14 } as const;
const RADIUS_LG = 8;
/** Fixed so a drag offset converts to an index without measuring rows. */
const ORDER_ROW_HEIGHT = 40;
/** A fetch shorter than this never surfaces a spinner; one that does holds it this long. */
const BUSY_DELAY_MS = 200;
const BUSY_MINIMUM_MS = 600;

/**
 * Bar fills come from the plugin's own ramp rather than the host's status
 * tokens. Those tokens are tuned for text — on a light theme Paseo's
 * statusWarning is a dark amber that reads as brown at 4px, and its
 * statusSuccess reads as near-black — and they are a green/amber/red ramp, where
 * this surface wants blue/orange/red. See shared/usage/palette.ts.
 *
 * The ramp is still chosen from the theme (off surface0) so a plugin-contributed
 * light theme gets the light one.
 */
function fillColor(theme: PluginTheme, tone: UsageTone | undefined): string {
  return paletteForSurface(theme.colors.surface0)[tone ?? "default"];
}

function useStyles(theme: PluginTheme, compact: boolean, rtl: boolean) {
  const row = rtl ? "row-reverse" : "row";
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  return useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1, backgroundColor: theme.colors.surface0 },
        content: {
          paddingHorizontal: compact ? SPACE[4] : SPACE[6],
          paddingTop: compact ? SPACE[4] : SPACE[6],
          paddingBottom: SPACE[6],
        },
        /** Settings centers its column instead of stretching to the window width. */
        column: { width: "100%", maxWidth: 720, alignSelf: "center" },
        sectionHeader: {
          flexDirection: row,
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: SPACE[3],
          marginLeft: SPACE[1],
        },
        sectionHeaderTitle: { color: theme.colors.foregroundMuted, fontSize: FONT.sm, writingDirection, textAlign },
        refreshButton: {
          flexDirection: row,
          alignItems: "center",
          gap: SPACE[1.5],
          paddingHorizontal: SPACE[2],
          paddingVertical: SPACE[1],
          borderRadius: 6,
        },
        refreshButtonPressed: { backgroundColor: theme.colors.surface2 },
        /** Fixed slot: the spinner and the icon are not the same size, and a button that resizes mid-refresh reads as a glitch. */
        refreshIcon: { width: 14, height: 14, alignItems: "center", justifyContent: "center" },
        refreshLabel: { color: theme.colors.foregroundMuted, fontSize: FONT.sm, writingDirection },

        /**
         * The reorder block. Rows are a fixed height so a drag can map a finger
         * offset straight onto an index (`round(dy / ORDER_ROW_HEIGHT)`) without
         * measuring anything.
         */
        orderRow: {
          flexDirection: row,
          alignItems: "center",
          gap: SPACE[2],
          height: ORDER_ROW_HEIGHT,
          paddingHorizontal: SPACE[3],
          backgroundColor: theme.colors.surface1,
        },
        orderRowDragging: {
          backgroundColor: theme.colors.surface2,
          borderRadius: RADIUS_LG,
          // Lifts the dragged row over its neighbours while it travels.
          zIndex: 2,
          opacity: 0.96,
        },
        orderHandle: { paddingVertical: SPACE[1], paddingHorizontal: SPACE[1] },
        orderLabel: { flex: 1, color: theme.colors.foreground, fontSize: FONT.sm, writingDirection, textAlign },
        orderValue: { color: theme.colors.foregroundMuted, fontSize: FONT.sm, writingDirection },
        orderButton: {
          width: 22,
          height: 22,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        orderButtonDisabled: { opacity: 0.35 },
        orderEmpty: { padding: SPACE[4] },
        orderSection: { marginBottom: SPACE[6] },

        card: {
          backgroundColor: theme.colors.surface1,
          borderRadius: RADIUS_LG,
          borderWidth: 1,
          borderColor: theme.colors.border,
          overflow: "hidden",
        },
        divider: { height: 1, backgroundColor: theme.colors.border },

        provider: { gap: SPACE[4], paddingVertical: SPACE[4], paddingHorizontal: SPACE[4] },
        providerHeader: { flexDirection: row, alignItems: "center", gap: SPACE[2] },
        providerName: { flexShrink: 1, color: theme.colors.foreground, fontSize: FONT.base, writingDirection, textAlign },
        headerSpacer: { flex: 1 },
        planBadge: {
          paddingHorizontal: SPACE[2],
          paddingVertical: 2,
          borderRadius: 9999,
          backgroundColor: theme.colors.surface2,
        },
        planBadgeLabel: { color: theme.colors.foregroundMuted, fontSize: FONT.sm, writingDirection },
        statusRow: { flexDirection: row, alignItems: "center", gap: SPACE[1.5] },
        statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.foregroundMuted },
        statusDotError: { backgroundColor: theme.colors.statusDanger },
        statusLabel: { color: theme.colors.foregroundMuted, fontSize: FONT.sm },

        bars: { gap: SPACE[3] },
        bar: { gap: 3 },
        barLabelRow: {
          flexDirection: row,
          justifyContent: "space-between",
          alignItems: "center",
          gap: SPACE[2],
        },
        barLabel: { flexShrink: 1, color: theme.colors.foregroundMuted, fontSize: FONT.sm, writingDirection, textAlign },
        barValueGroup: { flexDirection: row, alignItems: "center", gap: SPACE[2], flexShrink: 0 },
        /**
         * A secondary toggle, sized to match the reorder block's arrows. Pinned state
         * reads as a filled slot rather than an accent chip: an accent fill made this
         * the most saturated thing on the screen, louder than the bars it annotates.
         */
        pinButton: {
          width: 22,
          height: 22,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        pinButtonActive: { backgroundColor: theme.colors.surface2 },
        iconButtonPressed: { opacity: 0.7 },
        barValue: { color: theme.colors.foreground, fontSize: FONT.sm, fontWeight: "500", writingDirection },
        barReset: { color: theme.colors.foregroundMuted, fontWeight: "normal" },
        barAtRisk: { color: theme.colors.statusDanger, fontWeight: "normal" },
        track: { height: 4, borderRadius: 2, backgroundColor: theme.colors.surface2, overflow: "hidden", flexDirection: row },
        fill: { height: 4, borderRadius: 2 },

        details: { gap: SPACE[1] },
        detailRow: { flexDirection: row, justifyContent: "space-between", gap: SPACE[2] },
        detailLabel: { flexShrink: 1, color: theme.colors.foregroundMuted, fontSize: FONT.sm, writingDirection, textAlign },
        detailValue: { color: theme.colors.foreground, fontSize: FONT.sm, writingDirection },

        providerError: { color: theme.colors.statusDanger, fontSize: FONT.sm, lineHeight: FONT.sm * 1.4 },
        providerFooter: { color: theme.colors.foregroundMuted, fontSize: FONT.sm, writingDirection, textAlign },

        stateCard: { padding: SPACE[4], alignItems: "center", gap: SPACE[3] },
        stateText: { color: theme.colors.foregroundMuted, fontSize: FONT.base, textAlign: "center" },
        stateTitle: { color: theme.colors.foreground, fontSize: FONT.base },
        retryButton: {
          paddingHorizontal: SPACE[3],
          paddingVertical: SPACE[1.5],
          borderRadius: 6,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        retryLabel: { color: theme.colors.foreground, fontSize: FONT.sm },
      }),
    [theme, compact, row, textAlign, writingDirection],
  );
}

type Styles = ReturnType<typeof useStyles>;

function WindowBar({
  window,
  theme,
  styles,
  locale,
  messages,
  pinned,
  onTogglePin,
}: {
  window: UsageWindow;
  theme: PluginTheme;
  styles: Styles;
  locale: Locale;
  messages: Messages;
  pinned?: boolean;
  onTogglePin?: () => void;
}) {
  const usedPct = windowUsedPct(window);
  const tone = resolveTone(window.tone, usedPct);
  const atRisk = window.runsOutAt != null && window.shortfallPct != null;
  const trailing = atRisk
    ? formatRunsOutLabel(window.runsOutAt, messages)
    : formatResetPrimary(window.resetsAt, locale, messages);

  return (
    <View style={styles.bar}>
      <View style={styles.barLabelRow}>
        <Text style={styles.barLabel} numberOfLines={1}>
          {windowLabel(window, messages)}
        </Text>
        <View style={styles.barValueGroup}>
          <Text style={styles.barValue}>
            {usedPct != null ? formatPct(usedPct, locale) : "—"}
            {trailing ? <Text style={atRisk ? styles.barAtRisk : styles.barReset}>{` · ${trailing}`}</Text> : null}
          </Text>
          {onTogglePin ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={pinned ? messages.hideFromSidebar : messages.showInSidebar}
              onPress={onTogglePin}
              style={({ pressed }) => [
                styles.pinButton,
                pinned ? styles.pinButtonActive : null,
                pressed ? styles.iconButtonPressed : null,
              ]}
            >
              <Icon
                name={pinned ? "Minus" : "Plus"}
                size={12}
                color={pinned ? theme.colors.foreground : theme.colors.foregroundMuted}
              />
            </Pressable>
          ) : null}
        </View>
      </View>
      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${clampPct(usedPct ?? 0)}%`, backgroundColor: fillColor(theme, tone) }]}
        />
      </View>
    </View>
  );
}

function BalanceBar({
  balance,
  theme,
  styles,
  locale,
  messages,
}: {
  balance: UsageBalance;
  theme: PluginTheme;
  styles: Styles;
  locale: Locale;
  messages: Messages;
}) {
  const { amountText, usedPct } = balanceReading(balance, locale, messages);
  const reset = formatResetPrimary(balance.resetsAt, locale, messages);
  const tone = resolveTone(balance.tone, usedPct);

  return (
    <View style={styles.bar}>
      <View style={styles.barLabelRow}>
        <Text style={styles.barLabel} numberOfLines={1}>
          {balance.label}
        </Text>
        <Text style={styles.barValue}>
          {amountText}
          {reset ? <Text style={styles.barReset}>{` · ${reset}`}</Text> : null}
        </Text>
      </View>
      {usedPct != null ? (
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${clampPct(usedPct)}%`, backgroundColor: fillColor(theme, tone) },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Debounced busy flag: nothing for a fetch that finishes quickly, and once shown
 * it stays for a beat.
 *
 * The panel refetches every 60 seconds and a warm `provider.usage.list` answers
 * in tens of milliseconds, so wiring a spinner straight to `isFetching` made the
 * refresh button twitch on its own, with no click behind it. Below
 * `BUSY_DELAY_MS` the work is invisible and should stay invisible; past it, the
 * spinner holds for `BUSY_MINIMUM_MS` so a response landing right after the
 * spinner appeared does not blink it straight back out.
 */
function useBusy(active: boolean): boolean {
  const [busy, setBusy] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (active) {
      if (busy) {
        return;
      }
      const timer = setTimeout(() => {
        shownAt.current = Date.now();
        setBusy(true);
      }, BUSY_DELAY_MS);
      return () => clearTimeout(timer);
    }
    if (!busy) {
      return;
    }
    const remaining = BUSY_MINIMUM_MS - (Date.now() - shownAt.current);
    if (remaining <= 0) {
      setBusy(false);
      return;
    }
    const timer = setTimeout(() => setBusy(false), remaining);
    return () => clearTimeout(timer);
  }, [active, busy]);

  return busy;
}

/** Immutable splice-move; returns the same array when the move is a no-op. */
function moved<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [entry] = next.splice(from, 1);
  if (entry === undefined) {
    return next;
  }
  next.splice(to, 0, entry);
  return next;
}

function clampIndex(value: number, length: number): number {
  return Math.max(0, Math.min(length - 1, value));
}

/**
 * A grip that reports a vertical drag, driven by DOM pointer events.
 *
 * React Native's `PanResponder` is the portable way to do this, and it is what
 * this started as — but the responder never claimed the gesture inside Paseo's
 * plugin host, so a drag fell through to the browser and selected text instead.
 * Pointer events on the underlying node are unambiguous: `preventDefault` on
 * pointerdown kills the text selection, and pointer capture keeps the gesture
 * alive when the cursor outruns the 40px grip.
 *
 * On iOS and Android the ref is a native view with no `addEventListener`, so the
 * effect no-ops and the arrow buttons are the whole story there.
 */
function DragHandle({
  rowKey,
  label,
  style,
  children,
  onBegin,
  onDrag,
  onEnd,
}: {
  rowKey: string;
  label: string;
  style: StyleProp<ViewStyle>;
  children: React.ReactNode;
  onBegin: (key: string) => void;
  onDrag: (key: string, dy: number) => void;
  onEnd: (committed: boolean) => void;
}) {
  const ref = useRef<View | null>(null);

  useEffect(() => {
    const node = ref.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== "function") {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      node.setPointerCapture?.(event.pointerId);
      const originY = event.clientY;
      onBegin(rowKey);

      const onPointerMove = (moveEvent: PointerEvent) => onDrag(rowKey, moveEvent.clientY - originY);
      const finish = (committed: boolean) => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerCancel);
        onEnd(committed);
      };
      const onPointerUp = () => finish(true);
      const onPointerCancel = () => finish(false);

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerCancel);
    };

    node.addEventListener("pointerdown", onPointerDown);
    node.style.cursor = "grab";
    node.style.touchAction = "none";
    return () => node.removeEventListener("pointerdown", onPointerDown);
  }, [rowKey, onBegin, onDrag, onEnd]);

  return (
    <View ref={ref} accessibilityLabel={label} style={style}>
      {children}
    </View>
  );
}

/**
 * The pinned rows, in the order the sidebar meter paints them, draggable by the
 * grip and movable by the arrows.
 *
 * It lives here rather than on the meter itself because this surface already
 * owns the selection and its persistence — and because the meter is a raw DOM
 * node with `pointer-events:none` that repaints wholesale every refresh, so a
 * gesture on it would be fighting the host's own sidebar.
 *
 * The arrows are not a lesser fallback: they are the only path that works with a
 * keyboard, a screen reader, or on a phone, where a drag inside a scroll view is
 * ambiguous. The drag is the shortcut.
 */
function OrderBlock({
  rows,
  styles,
  theme,
  locale,
  messages,
  onReorder,
}: {
  rows: PinnedRow[];
  styles: Styles;
  theme: PluginTheme;
  locale: Locale;
  messages: Messages;
  onReorder: (keys: string[]) => void;
}) {
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [previewKeys, setPreviewKeys] = useState<string[] | null>(null);
  /**
   * Gesture scratch space. Refs rather than state because the pointer listeners
   * are bound once per mounted handle and must read the arrangement they have
   * already mutated this gesture, not the one their render closed over.
   */
  const liveKeys = useRef<string[]>([]);
  /** How far the row has already been re-homed, so the finger keeps its grip point. */
  const settled = useRef(0);
  const keysRef = useRef<string[]>([]);
  const reorderRef = useRef(onReorder);
  reorderRef.current = onReorder;

  const keys = rows.map((row) => row.key);
  keysRef.current = keys;
  const byKey = new Map(rows.map((row) => [row.key, row]));
  const ordered = (previewKeys ?? keys).flatMap((key) => {
    const row = byKey.get(key);
    return row ? [row] : [];
  });

  const move = (from: number, to: number) => {
    onReorder(moved(keys, from, clampIndex(to, keys.length)));
  };

  const beginDrag = useCallback((key: string) => {
    liveKeys.current = [...keysRef.current];
    settled.current = 0;
    setPreviewKeys(liveKeys.current);
    setDragKey(key);
    setDragOffset(0);
  }, []);

  const dragTo = useCallback((key: string, dy: number) => {
    const from = liveKeys.current.indexOf(key);
    const steps = Math.round((dy - settled.current) / ORDER_ROW_HEIGHT);
    if (steps !== 0 && from >= 0) {
      const to = clampIndex(from + steps, liveKeys.current.length);
      if (to !== from) {
        liveKeys.current = moved(liveKeys.current, from, to);
        // The row has moved a slot under the finger, so the same finger position
        // now means zero offset again — otherwise it would jump a full row.
        settled.current += (to - from) * ORDER_ROW_HEIGHT;
        setPreviewKeys(liveKeys.current);
      }
    }
    setDragOffset(dy - settled.current);
  }, []);

  const endDrag = useCallback((committed: boolean) => {
    const next = liveKeys.current;
    setDragKey(null);
    setDragOffset(0);
    setPreviewKeys(null);
    if (committed && next.length > 0 && next.join("\u0000") !== keysRef.current.join("\u0000")) {
      reorderRef.current(next);
    }
  }, []);

  if (rows.length === 0) {
    return (
      <View style={[styles.card, styles.orderEmpty]}>
        <Text style={styles.stateText}>{messages.sidebarEmpty}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {ordered.map((row, index) => {
        const dragging = row.key === dragKey;
        const position = (previewKeys ?? keys).indexOf(row.key);
        return (
          <View
            key={row.key}
            style={[
              styles.orderRow,
              dragging ? styles.orderRowDragging : null,
              dragging ? { transform: [{ translateY: dragOffset }] } : null,
            ]}
          >
            <DragHandle
              rowKey={row.key}
              label={messages.reorder}
              style={styles.orderHandle}
              onBegin={beginDrag}
              onDrag={dragTo}
              onEnd={endDrag}
            >
              <Icon name="GripVertical" size={14} color={theme.colors.foregroundMuted} />
            </DragHandle>
            <Text style={styles.orderLabel} numberOfLines={1}>
              {`${row.providerName} · ${row.label}`}
            </Text>
            <Text style={styles.orderValue}>{row.usedPct != null ? formatPct(row.usedPct, locale) : "—"}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={messages.moveUp}
              disabled={position <= 0}
              onPress={() => move(index, index - 1)}
              style={({ pressed }) => [
                styles.orderButton,
                position <= 0 ? styles.orderButtonDisabled : null,
                pressed ? styles.iconButtonPressed : null,
              ]}
            >
              <Icon name="ChevronUp" size={12} color={theme.colors.foregroundMuted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={messages.moveDown}
              disabled={position >= ordered.length - 1}
              onPress={() => move(index, index + 1)}
              style={({ pressed }) => [
                styles.orderButton,
                position >= ordered.length - 1 ? styles.orderButtonDisabled : null,
                pressed ? styles.iconButtonPressed : null,
              ]}
            >
              <Icon name="ChevronDown" size={12} color={theme.colors.foregroundMuted} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function ProviderBlock({
  provider,
  stale,
  theme,
  styles,
  locale,
  messages,
  pinnedKeys,
  onTogglePin,
}: {
  provider: ProviderUsage;
  /** The snapshot is still rendered, but it is not being refreshed any more. */
  stale: boolean;
  theme: PluginTheme;
  styles: Styles;
  locale: Locale;
  messages: Messages;
  pinnedKeys: ReadonlySet<string>;
  onTogglePin: (key: string) => void;
}) {
  const status = statusLabel(provider.status, messages);
  /**
   * Provenance, age, and — when polling has stopped — the fact that the age is
   * no longer moving. All three answer "how much do I trust this number", so
   * they belong on one line rather than in a badge of their own.
   */
  const footer = useMemo(() => {
    const ago = formatAgo(provider.fetchedAt, messages);
    return [provider.sourceLabel, ago ? messages.updated(ago) : null, stale ? messages.stale : null]
      .filter(Boolean)
      .join(" · ");
  }, [provider.sourceLabel, provider.fetchedAt, messages, stale]);

  const hasBars = provider.windows.length > 0 || provider.balances.length > 0;

  return (
    <View style={styles.provider}>
      <View style={styles.providerHeader}>
        <Text style={styles.providerName} numberOfLines={1}>
          {provider.displayName}
        </Text>
        {provider.planLabel ? (
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeLabel} numberOfLines={1}>
              {provider.planLabel}
            </Text>
          </View>
        ) : null}
        <View style={styles.headerSpacer} />
        {status ? (
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                provider.status === "error" ? styles.statusDotError : null,
              ]}
            />
            <Text style={styles.statusLabel}>{status}</Text>
          </View>
        ) : null}
      </View>

      {provider.error ? (
        <Text style={styles.providerError} numberOfLines={3}>
          {provider.error}
        </Text>
      ) : null}

      {hasBars ? (
        <View style={styles.bars}>
          {provider.windows.map((window) => (
            <WindowBar
              key={window.id}
              window={window}
              theme={theme}
              styles={styles}
              locale={locale}
              messages={messages}
              pinned={pinnedKeys.has(rowKey(provider.providerId, window.id))}
              onTogglePin={() => onTogglePin(rowKey(provider.providerId, window.id))}
            />
          ))}
          {provider.balances.map((balance) => (
            <BalanceBar
              key={balance.id}
              balance={balance}
              theme={theme}
              styles={styles}
              locale={locale}
              messages={messages}
            />
          ))}
        </View>
      ) : null}

      {provider.details.length > 0 ? (
        <View style={styles.details}>
          {provider.details.map((detail) => (
            <View key={detail.id} style={styles.detailRow}>
              <Text style={styles.detailLabel} numberOfLines={1}>
                {detail.label}
              </Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {detail.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {footer ? (
        <Text style={styles.providerFooter} numberOfLines={1}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Paseo's language setting, as a subscription rather than a one-time read: the
 * panel stays open across a language change, so resolving once at mount left it
 * in the old language until it was closed and reopened.
 */
function useLocale(platform: "ios" | "android" | "web"): Locale {
  const subscribe = useCallback(
    (onChange: () => void) => (platform === "web" ? subscribeLocale(onChange) : () => {}),
    [platform],
  );
  const snapshot = useCallback(() => getLocale(platform), [platform]);
  // Server snapshot: the plugin host renders on the client only, but React
  // requires the third argument whenever a bundle may be hydrated.
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function UsageSurface({ theme, layout }: PluginSurfaceProps) {
  const locale = useLocale(layout.platform);
  const messages = useMemo(() => messagesFor(locale), [locale]);
  const styles = useStyles(theme, layout.compact, isRtl(locale));
  const fetchUsage = useRpc(listUsage);
  const fetchSelection = useRpc(readSelection);
  const persistSelection = useRpc(writeSelection);

  const query = useQuery<UsageSnapshot>({
    queryKey: ["usage-sidebar", "snapshot"],
    queryFn: () => fetchUsage({}),
    refetchInterval: REFRESH_INTERVAL_MS,
    staleTime: STALE_TIME_MS,
  });

  const queryClient = useQueryClient();
  const selectionQuery = useQuery<Selection>({
    queryKey: ["usage-sidebar", "selection"],
    queryFn: async () => {
      const selection = await fetchSelection({});
      publishSelection(selection);
      return selection;
    },
    staleTime: Number.POSITIVE_INFINITY,
  });

  const providers = query.data?.providers ?? [];
  const refreshing = useBusy(query.isFetching);

  /**
   * React Query keeps the last successful snapshot through a failure, so a
   * broken poll leaves real numbers on screen. What the failure changes is what
   * may be said about them and what may be offered to fix it.
   */
  const failure = panelFailureView({
    isError: query.isError,
    error: query.error,
    providerCount: providers.length,
  });

  /**
   * The pin list is ordered, not a set: its order is the order the sidebar meter
   * paints. Until the user pins anything it mirrors the meter's own default.
   */
  const persistedOrder = useMemo(() => {
    const selection = selectionQuery.data;
    if (selection?.configured) {
      return selection.keys;
    }
    return query.data ? defaultKeys(query.data) : [];
  }, [selectionQuery.data, query.data]);

  /**
   * An edit takes effect locally first and stays authoritative afterwards: the
   * snapshot refetches every 60 seconds, and without this a poll landing
   * mid-drag would yank the list back to the server's copy.
   */
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const order = localOrder ?? persistedOrder;
  const pinnedKeys = useMemo(() => new Set(order), [order]);

  const pinned: PinnedRow[] = useMemo(() => {
    if (!query.data) {
      return [];
    }
    return pinnedRows(
      query.data,
      { keys: order, configured: true },
      (_provider, window) => windowLabel(window, messages),
      messages,
    );
  }, [query.data, order, messages]);

  const savePins = useMutation({
    mutationFn: (keys: string[]) => persistSelection({ keys }),
    onSuccess: (selection) => {
      queryClient.setQueryData(["usage-sidebar", "selection"], selection);
      publishSelection(selection);
    },
  });

  const commitOrder = (keys: string[]) => {
    setLocalOrder(keys);
    savePins.mutate(keys);
  };

  const togglePin = (key: string) => {
    // Appended, not inserted: a newly pinned row joins the end of the arrangement
    // instead of displacing one the user placed deliberately.
    commitOrder(pinnedKeys.has(key) ? order.filter((entry) => entry !== key) : [...order, key]);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.column}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderTitle}>{messages.title}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={refreshing ? messages.refreshing : messages.refresh}
            accessibilityState={{ busy: refreshing }}
            onPress={() => void query.refetch()}
            style={({ pressed }) => [styles.refreshButton, pressed ? styles.refreshButtonPressed : null]}
          >
            <View style={styles.refreshIcon}>
              {refreshing ? (
                <ActivityIndicator size="small" color={theme.colors.foregroundMuted} />
              ) : (
                <Icon name="RefreshCw" size={14} color={theme.colors.foregroundMuted} />
              )}
            </View>
            {/* The label never changes: swapping it for "Refreshing..." resizes the button under the cursor. */}
            <Text style={styles.refreshLabel}>{messages.refresh}</Text>
          </Pressable>
        </View>

        {query.isPending ? (
          <View style={[styles.card, styles.stateCard]}>
            <Text style={styles.stateText}>{messages.loading}</Text>
          </View>
        ) : null}

        {query.isError ? (
          <View style={[styles.card, styles.stateCard]}>
            <Text style={styles.stateTitle}>
              {failure.linkLost ? messages.linkLostTitle : messages.errorTitle}
            </Text>
            <Text style={styles.stateText}>
              {failure.linkLost ? messages.linkLostBody : errorMessage(query.error)}
            </Text>
            {/* A dropped session cannot be retried into working, so offering the
                button would just be a way to fail again. */}
            {failure.showRetry ? (
              <Pressable accessibilityRole="button" style={styles.retryButton} onPress={() => void query.refetch()}>
                <Text style={styles.retryLabel}>{messages.retry}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {!query.isPending && !query.isError && providers.length === 0 ? (
          <View style={[styles.card, styles.stateCard]}>
            <Text style={styles.stateText}>{messages.empty}</Text>
          </View>
        ) : null}

        {providers.length > 0 ? (
          <View style={styles.orderSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderTitle}>{messages.sidebarOrder}</Text>
            </View>
            <OrderBlock
              rows={pinned}
              styles={styles}
              theme={theme}
              locale={locale}
              messages={messages}
              onReorder={commitOrder}
            />
          </View>
        ) : null}

        {providers.length > 0 ? (
          <View style={styles.card}>
            {providers.map((provider, index) => (
              <Fragment key={provider.providerId}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <ProviderBlock
                  provider={provider}
                  stale={failure.showingStale}
                  theme={theme}
                  styles={styles}
                  locale={locale}
                  messages={messages}
                  pinnedKeys={pinnedKeys}
                  onTogglePin={togglePin}
                />
              </Fragment>
            ))}
          </View>
        ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

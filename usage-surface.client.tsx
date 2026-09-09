import type { PluginSurfaceProps, PluginTheme } from "@getpaseo/plugin";
import { useRpc } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/react-native";
import { useQuery } from "@tanstack/react-query";
import React, { Fragment, useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  balanceReading,
  clampPct,
  deriveTone,
  formatAgo,
  formatPct,
  formatResetLabel,
  formatRunsOutLabel,
  statusLabel,
  windowUsedPct,
} from "./usage-format.shared";
import { isRtl, messagesFor, type Locale, type Messages } from "./i18n.shared";
import { resolveLocale } from "./locale.client";
import {
  listUsage,
  type ProviderUsage,
  type UsageBalance,
  type UsageSnapshot,
  type UsageTone,
  type UsageWindow,
} from "./usage.shared";

const REFRESH_INTERVAL_MS = 60_000;
const STALE_TIME_MS = 30_000;

/** Paseo's design tokens, inlined because the plugin theme only exposes colors. */
const SPACE = { 1: 4, 1.5: 6, 2: 8, 3: 12, 4: 16, 6: 24 } as const;
const FONT = { sm: 12, base: 14 } as const;
const RADIUS_LG = 8;

function fillColor(theme: PluginTheme, tone: UsageTone | undefined): string {
  switch (tone) {
    case "ok":
      return theme.colors.statusSuccess;
    case "warning":
      return theme.colors.statusWarning;
    case "danger":
      return theme.colors.statusDanger;
    default:
      return theme.colors.foregroundMuted;
  }
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
        refreshLabel: { color: theme.colors.foregroundMuted, fontSize: FONT.sm, writingDirection },

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
}: {
  window: UsageWindow;
  theme: PluginTheme;
  styles: Styles;
  locale: Locale;
  messages: Messages;
}) {
  const usedPct = windowUsedPct(window);
  const tone = window.tone ?? deriveTone(usedPct);
  const atRisk = window.runsOutAt != null && window.shortfallPct != null;
  const trailing = atRisk
    ? formatRunsOutLabel(window.runsOutAt, messages)
    : formatResetLabel(window.resetsAt, messages);

  return (
    <View style={styles.bar}>
      <View style={styles.barLabelRow}>
        <Text style={styles.barLabel} numberOfLines={1}>
          {window.label}
        </Text>
        <Text style={styles.barValue}>
          {usedPct != null ? formatPct(usedPct, locale) : "—"}
          {trailing ? <Text style={atRisk ? styles.barAtRisk : styles.barReset}>{` · ${trailing}`}</Text> : null}
        </Text>
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
  const reset = formatResetLabel(balance.resetsAt, messages);

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
              { width: `${clampPct(usedPct)}%`, backgroundColor: fillColor(theme, balance.tone ?? "default") },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

function ProviderBlock({
  provider,
  theme,
  styles,
  locale,
  messages,
}: {
  provider: ProviderUsage;
  theme: PluginTheme;
  styles: Styles;
  locale: Locale;
  messages: Messages;
}) {
  const status = statusLabel(provider.status, messages);
  const footer = useMemo(() => {
    const ago = formatAgo(provider.fetchedAt, messages);
    return [provider.sourceLabel, ago ? messages.updated(ago) : null].filter(Boolean).join(" · ");
  }, [provider.sourceLabel, provider.fetchedAt, messages]);

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

export function UsageSurface({ theme, layout }: PluginSurfaceProps) {
  const locale = useMemo(() => resolveLocale(layout.platform), [layout.platform]);
  const messages = useMemo(() => messagesFor(locale), [locale]);
  const styles = useStyles(theme, layout.compact, isRtl(locale));
  const fetchUsage = useRpc(listUsage);

  const query = useQuery<UsageSnapshot>({
    queryKey: ["usage-sidebar", "snapshot"],
    queryFn: () => fetchUsage({}),
    refetchInterval: REFRESH_INTERVAL_MS,
    staleTime: STALE_TIME_MS,
  });

  const providers = query.data?.providers ?? [];
  const refreshing = query.isFetching;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.column}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderTitle}>{messages.title}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={messages.refresh}
            onPress={() => void query.refetch()}
            style={({ pressed }) => [styles.refreshButton, pressed ? styles.refreshButtonPressed : null]}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={theme.colors.foregroundMuted} />
            ) : (
              <Icon name="RefreshCw" size={14} color={theme.colors.foregroundMuted} />
            )}
            <Text style={styles.refreshLabel}>{refreshing ? messages.refreshing : messages.refresh}</Text>
          </Pressable>
        </View>

        {query.isPending ? (
          <View style={[styles.card, styles.stateCard]}>
            <Text style={styles.stateText}>{messages.loading}</Text>
          </View>
        ) : null}

        {query.isError ? (
          <View style={[styles.card, styles.stateCard]}>
            <Text style={styles.stateTitle}>{messages.errorTitle}</Text>
            <Text style={styles.stateText}>
              {query.error instanceof Error ? query.error.message : String(query.error)}
            </Text>
            <Pressable accessibilityRole="button" style={styles.retryButton} onPress={() => void query.refetch()}>
              <Text style={styles.retryLabel}>{messages.retry}</Text>
            </Pressable>
          </View>
        ) : null}

        {!query.isPending && !query.isError && providers.length === 0 ? (
          <View style={[styles.card, styles.stateCard]}>
            <Text style={styles.stateText}>{messages.empty}</Text>
          </View>
        ) : null}

        {providers.length > 0 ? (
          <View style={styles.card}>
            {providers.map((provider, index) => (
              <Fragment key={provider.providerId}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <ProviderBlock
                  provider={provider}
                  theme={theme}
                  styles={styles}
                  locale={locale}
                  messages={messages}
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

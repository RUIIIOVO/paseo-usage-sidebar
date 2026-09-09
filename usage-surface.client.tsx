import type { PluginSurfaceProps, PluginTheme } from "@getpaseo/plugin";
import { useRpc } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/react-native";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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

function toneColor(theme: PluginTheme, tone: UsageTone | undefined): string {
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

/** The daemon already classifies each row; this only covers rows that arrive without a tone. */
function deriveTone(usedPct: number | null | undefined, tone: UsageTone | undefined): UsageTone {
  if (tone) {
    return tone;
  }
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

function formatPct(value: number | null | undefined): string {
  return value == null ? "—" : `${Math.round(value)}%`;
}

function formatReset(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }
  const target = Date.parse(iso);
  if (Number.isNaN(target)) {
    return null;
  }
  const deltaMs = target - Date.now();
  if (deltaMs <= 0) {
    return "Resets now";
  }
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 60) {
    return `Resets in ${Math.max(minutes, 1)}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remainder = minutes % 60;
    return remainder ? `Resets in ${hours}h ${remainder}m` : `Resets in ${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainderHours = hours % 24;
  return remainderHours ? `Resets in ${days}d ${remainderHours}h` : `Resets in ${days}d`;
}

function formatTimestamp(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatBalance(balance: UsageBalance): string {
  const amount = balance.remaining ?? balance.used;
  if (amount == null) {
    return "—";
  }
  switch (balance.unit) {
    case "usd":
      return `$${amount.toFixed(2)}`;
    case "credits":
      return `${Math.round(amount)} credits`;
    case "requests":
      return `${Math.round(amount)} requests`;
    case "tokens":
      return `${Math.round(amount)} tokens`;
    default:
      return String(amount);
  }
}

function useStyles(theme: PluginTheme, compact: boolean) {
  return useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1, backgroundColor: theme.colors.surface0 },
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: compact ? 16 : 24,
          paddingTop: compact ? 16 : 24,
          paddingBottom: 12,
        },
        title: { color: theme.colors.foreground, fontSize: 18, fontWeight: "600" },
        refreshButton: {
          width: 32,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
        },
        refreshButtonPressed: { backgroundColor: theme.colors.surface2 },
        body: { paddingHorizontal: compact ? 16 : 24, paddingBottom: 24, gap: 12 },
        card: {
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 12,
          backgroundColor: theme.colors.surface1,
          padding: 14,
          gap: 12,
        },
        cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
        providerName: { color: theme.colors.foreground, fontSize: 14, fontWeight: "600" },
        planLabel: { color: theme.colors.foregroundMuted, fontSize: 12 },
        row: { gap: 6 },
        rowHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
        rowLabel: { color: theme.colors.foreground, fontSize: 13, flexShrink: 1 },
        rowValue: { fontSize: 13, fontWeight: "600" },
        rowMeta: { color: theme.colors.foregroundMuted, fontSize: 11 },
        track: { height: 4, borderRadius: 2, backgroundColor: theme.colors.surface2, overflow: "hidden" },
        fill: { height: 4, borderRadius: 2 },
        detailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
        detailLabel: { color: theme.colors.foregroundMuted, fontSize: 12 },
        detailValue: { color: theme.colors.foreground, fontSize: 12 },
        errorText: { color: theme.colors.statusDanger, fontSize: 12 },
        stateBox: { padding: 24, gap: 8, alignItems: "center" },
        stateTitle: { color: theme.colors.foreground, fontSize: 14, fontWeight: "600", textAlign: "center" },
        stateDetail: { color: theme.colors.foregroundMuted, fontSize: 12, textAlign: "center" },
        retryButton: {
          marginTop: 8,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 8,
          backgroundColor: theme.colors.accent,
        },
        retryLabel: { color: theme.colors.accentForeground, fontSize: 13, fontWeight: "600" },
        footer: { color: theme.colors.foregroundMuted, fontSize: 11, paddingTop: 4 },
      }),
    [theme, compact],
  );
}

type Styles = ReturnType<typeof useStyles>;

function UsageMeter({
  label,
  usedPct,
  meta,
  tone,
  theme,
  styles,
}: {
  label: string;
  usedPct: number | null | undefined;
  meta: string | null;
  tone: UsageTone;
  theme: PluginTheme;
  styles: Styles;
}) {
  const color = toneColor(theme, tone);
  const width = usedPct == null ? 0 : Math.min(Math.max(usedPct, 0), 100);
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.rowValue, { color }]}>{formatPct(usedPct)}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${width}%`, backgroundColor: color }]} />
      </View>
      {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
    </View>
  );
}

function ProviderCard({
  provider,
  theme,
  styles,
}: {
  provider: ProviderUsage;
  theme: PluginTheme;
  styles: Styles;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.providerName} numberOfLines={1}>
          {provider.displayName}
        </Text>
        {provider.planLabel ? (
          <Text style={styles.planLabel} numberOfLines={1}>
            {provider.planLabel}
          </Text>
        ) : null}
      </View>

      {provider.error ? <Text style={styles.errorText}>{provider.error}</Text> : null}

      {provider.windows.map((window: UsageWindow) => (
        <UsageMeter
          key={window.id}
          label={window.label}
          usedPct={window.usedPct}
          meta={formatReset(window.resetsAt)}
          tone={deriveTone(window.usedPct, window.tone)}
          theme={theme}
          styles={styles}
        />
      ))}

      {provider.balances.map((balance: UsageBalance) => (
        <View key={balance.id} style={styles.detailRow}>
          <Text style={styles.detailLabel} numberOfLines={1}>
            {balance.label}
          </Text>
          <Text style={[styles.detailValue, { color: toneColor(theme, balance.tone) }]}>
            {formatBalance(balance)}
          </Text>
        </View>
      ))}

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
  );
}

export function UsageSurface({ theme, layout }: PluginSurfaceProps) {
  const styles = useStyles(theme, layout.compact);
  const fetchUsage = useRpc(listUsage);

  const query = useQuery<UsageSnapshot>({
    queryKey: ["usage-sidebar", "snapshot"],
    queryFn: () => fetchUsage({}),
    refetchInterval: REFRESH_INTERVAL_MS,
    staleTime: STALE_TIME_MS,
  });

  const snapshot = query.data;
  const reported = useMemo(
    () => (snapshot?.providers ?? []).filter((provider) => provider.status !== "unavailable"),
    [snapshot],
  );
  const unavailableCount = (snapshot?.providers.length ?? 0) - reported.length;

  const footer = useMemo(() => {
    if (!snapshot) {
      return null;
    }
    const parts: string[] = [];
    const stamp = formatTimestamp(snapshot.fetchedAt);
    if (stamp) {
      parts.push(`Updated ${stamp}`);
    }
    parts.push(snapshot.source === "sdk" ? "via Paseo SDK" : "via local daemon");
    if (unavailableCount > 0) {
      parts.push(`${unavailableCount} provider${unavailableCount === 1 ? "" : "s"} not signed in`);
    }
    return parts.join(" · ");
  }, [snapshot, unavailableCount]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Plan usage</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh plan usage"
          onPress={() => void query.refetch()}
          style={({ pressed }) => [styles.refreshButton, pressed ? styles.refreshButtonPressed : null]}
        >
          {query.isFetching ? (
            <ActivityIndicator size="small" color={theme.colors.foregroundMuted} />
          ) : (
            <Icon name="RefreshCw" size={16} color={theme.colors.foregroundMuted} />
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {query.isPending ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={theme.colors.foregroundMuted} />
            <Text style={styles.stateDetail}>Loading usage…</Text>
          </View>
        ) : null}

        {query.isError ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>Unable to load usage</Text>
            <Text style={styles.stateDetail}>
              {query.error instanceof Error ? query.error.message : String(query.error)}
            </Text>
            <Pressable accessibilityRole="button" style={styles.retryButton} onPress={() => void query.refetch()}>
              <Text style={styles.retryLabel}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {!query.isPending && !query.isError && reported.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>No usage data</Text>
            <Text style={styles.stateDetail}>
              No provider on this host reports plan usage. Sign in to a provider that publishes quota windows.
            </Text>
          </View>
        ) : null}

        {reported.map((provider) => (
          <ProviderCard key={provider.providerId} provider={provider} theme={theme} styles={styles} />
        ))}

        {footer ? <Text style={styles.footer}>{footer}</Text> : null}
      </ScrollView>
    </View>
  );
}

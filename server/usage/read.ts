import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import { UsageSnapshotSchema, type UsageSnapshot } from "../../shared/usage/contract";

/**
 * Paseo 0.8 exposes provider usage through the plugin SDK, and the manifest
 * requires `>=0.8.0`, so `paseo.providers.listUsage()` is always there.
 *
 * Until 0.8 this file also carried a fallback that opened its own WebSocket to
 * the daemon and replayed the `provider.usage.list` handshake by hand, because
 * 0.7 gave plugins no usage API. That path is unreachable under the new
 * requirement, and it was the only reason server code depended on the DOM's
 * `WebSocket`/`MessageEvent`/`CloseEvent` globals, so it is gone along with the
 * `PASEO_USAGE_SIDEBAR_HOST` override and the config.json endpoint probing.
 */

/**
 * The daemon's payload is validated rather than trusted: a provider that reports
 * a window shape this plugin does not model should degrade to a missing field,
 * not crash the surface.
 */
function normalize(payload: unknown): UsageSnapshot {
  const raw = (payload ?? {}) as { fetchedAt?: unknown; providers?: unknown };
  return UsageSnapshotSchema.parse({
    fetchedAt: typeof raw.fetchedAt === "string" ? raw.fetchedAt : null,
    source: "sdk",
    providers: Array.isArray(raw.providers) ? raw.providers : [],
  });
}

export async function readUsage(
  _input: Record<string, never>,
  context: PluginHandlerContext,
): Promise<UsageSnapshot> {
  return normalize(await context.paseo.providers.listUsage());
}

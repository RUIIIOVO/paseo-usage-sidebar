import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import { UsageSnapshotSchema, type UsageSnapshot } from "../../shared/usage/contract";
import {
  errorMessage,
  HOST_LINK_LOST_CODE,
  INITIAL_LINK_FAILURE_STATE,
  judgeLinkFailure,
  type LinkFailureState,
} from "../../shared/usage/errors";

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

/**
 * Failure history, kept per plugin process rather than per call: the grace
 * window in `judgeLinkFailure` only means anything if a poll can see what the
 * poll before it saw.
 */
let linkFailure: LinkFailureState = INITIAL_LINK_FAILURE_STATE;

/**
 * Errors the fault switch can stand in for, spelled the way the host spells
 * them so the classifier is exercised on real input rather than on a sentinel
 * only the tests know about.
 */
const FAULTS = {
  proven: "Update the host to list provider usage",
  suspected: "Connection lost",
  unrelated: "provider rejected the request: 429",
} as const;

/** One warning per process, not one per poll, for a switch left set by mistake. */
let faultWarned = false;

/**
 * `PASEO_USAGE_SIDEBAR_FAULT` forces a failure without a daemon to break.
 * Dropping a real session means suspending the machine and waiting for the
 * lease to expire, which is not something a reviewer should have to stage to
 * see what this path renders.
 *
 * An unrecognized value is reported and ignored rather than treated as a fault:
 * the switch is a development aid, and failing shut would turn a typo in
 * someone's shell profile into a plugin that never loads usage again.
 */
function injectedFault(): Error | null {
  const name = process.env.PASEO_USAGE_SIDEBAR_FAULT;
  if (!name) {
    return null;
  }
  if (Object.hasOwn(FAULTS, name)) {
    return new Error(FAULTS[name as keyof typeof FAULTS]);
  }
  if (!faultWarned) {
    faultWarned = true;
    console.error(
      `usage-sidebar: ignoring PASEO_USAGE_SIDEBAR_FAULT="${name}" (expected proven|suspected|unrelated)`,
    );
  }
  return null;
}

export async function readUsage(
  _input: Record<string, never>,
  context: PluginHandlerContext,
): Promise<UsageSnapshot> {
  try {
    const fault = injectedFault();
    if (fault) {
      throw fault;
    }
    const snapshot = normalize(await context.paseo.providers.listUsage());
    // A reading got through, so whatever the last failures were, they were not
    // this session ending.
    linkFailure = INITIAL_LINK_FAILURE_STATE;
    return snapshot;
  } catch (error) {
    const verdict = judgeLinkFailure(error, Date.now(), linkFailure);
    linkFailure = verdict.state;

    if (verdict.kind === "rethrow") {
      // Unchanged, so the panel keeps showing the host's own wording and keeps
      // offering the retry that might still work.
      throw error;
    }
    if (verdict.announce) {
      console.error(
        `usage-sidebar: the session with the Paseo daemon was dropped (${errorMessage(error)}). ` +
          "Reload the plugin to reconnect.",
      );
    }
    // The code travels in the message because that is all the host's handler-error
    // wrapper preserves on the way to the client.
    throw new Error(`${HOST_LINK_LOST_CODE}: ${errorMessage(error)}`);
  }
}

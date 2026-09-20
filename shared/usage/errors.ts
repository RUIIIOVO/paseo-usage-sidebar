/**
 * Errors the server side classifies so the client can render a localized,
 * actionable message instead of the host's raw text.
 *
 * The plugin child process talks to the daemon over its own IPC `DaemonClient`,
 * which Paseo creates with reconnection disabled. When the daemon drops that
 * session (observed: "Closing physical WebSocket with expired application
 * lease" after the machine slept), the client forgets the daemon's `server_info`
 * and every SDK call that gates on a feature flag fails with a misleading
 * "Update the host to ..." message, even though the host is current. Only a
 * plugin reload rebuilds the connection, so the UI must say so.
 */
export const HOST_LINK_LOST_CODE = "usage-sidebar/host-link-lost";

/**
 * Proof the session is gone for good: this text can only be produced *after*
 * the client has forgotten `server_info`, which nothing short of a reload puts
 * back. Safe to diagnose from a single occurrence.
 */
const PROVEN_PATTERNS = [/update the host to list provider usage/i];

/**
 * Consistent with a dropped session, but also with a single call that raced a
 * transport blip. Telling someone to reload the plugin over a blip that heals
 * itself is a worse failure than showing the host's own wording for one poll,
 * so these only count as a diagnosis once they persist — see
 * `SUSPECT_GRACE_MS` in server/usage/read.ts.
 */
const SUSPECTED_PATTERNS = [/connection lost/i, /daemon client closed/i, /daemon client is disposed/i];

/**
 * `proven` — the link is definitively gone.
 * `suspected` — looks like it, but may be a blip; needs to persist first.
 * `unrelated` — not a link failure at all; let it through untouched.
 */
export type LinkFailureKind = "proven" | "suspected" | "unrelated";

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return String(error);
}

/** Classifies the raw SDK error, before it has been re-thrown with the code. */
export function classifyLinkFailure(error: unknown): LinkFailureKind {
  const message = errorMessage(error);
  if (PROVEN_PATTERNS.some((pattern) => pattern.test(message))) return "proven";
  if (SUSPECTED_PATTERNS.some((pattern) => pattern.test(message))) return "suspected";
  return "unrelated";
}

/**
 * True for the error as it reaches the client. The host wraps handler errors
 * ("Request failed: <message> requestType=... code=handler_error"), so match on
 * the embedded code rather than the whole string.
 */
export function isHostLinkLost(error: unknown): boolean {
  return errorMessage(error).includes(HOST_LINK_LOST_CODE);
}

/**
 * How long a `suspected` failure has to keep failing before it is reported as a
 * dropped session.
 *
 * Sized against the caller, not the transport: the panel's query retries within
 * a couple of seconds and then polls every 60s, so this has to outlast the
 * retry burst — otherwise one blip escalates itself inside a single refresh —
 * while still resolving on the very next poll.
 */
export const SUSPECT_GRACE_MS = 15_000;

/**
 * What the reader remembers between calls. Held by the caller and threaded
 * through `judgeLinkFailure` so the decision itself stays pure and testable.
 */
export type LinkFailureState = {
  /** Start of the current unbroken run of `suspected` failures. */
  suspectedSince: number | null;
  /** Whether this link loss has already been logged. */
  reported: boolean;
};

export const INITIAL_LINK_FAILURE_STATE: LinkFailureState = { suspectedSince: null, reported: false };

export type LinkVerdict = {
  /**
   * `rethrow` — not (yet) a diagnosis; let the host's own error through so the
   * UI keeps offering a retry. `link-lost` — report the dropped session.
   */
  kind: "rethrow" | "link-lost";
  /** True exactly once per link loss, so the log is not written per poll. */
  announce: boolean;
  state: LinkFailureState;
};

/** Decides what a failed `listUsage` means, given when it happened. */
export function judgeLinkFailure(error: unknown, now: number, state: LinkFailureState): LinkVerdict {
  const kind = classifyLinkFailure(error);
  if (kind === "unrelated") {
    return { kind: "rethrow", announce: false, state: { suspectedSince: null, reported: false } };
  }
  if (kind === "suspected") {
    const suspectedSince = state.suspectedSince ?? now;
    if (now - suspectedSince < SUSPECT_GRACE_MS) {
      return { kind: "rethrow", announce: false, state: { suspectedSince, reported: false } };
    }
    return {
      kind: "link-lost",
      announce: !state.reported,
      state: { suspectedSince, reported: true },
    };
  }
  return { kind: "link-lost", announce: !state.reported, state: { suspectedSince: null, reported: true } };
}

/**
 * Consecutive failed polls before the sidebar meter admits its numbers are old.
 *
 * One miss is not worth reacting to — it is usually a poll that raced a daemon
 * restart and the next one lands. Two means something is actually wrong, and by
 * then the block has been wrong for a full refresh interval.
 */
export const STALE_AFTER_FAILURES = 2;

/**
 * Nothing to mark as stale when there is nothing on screen: an empty meter
 * already reads as "no data", and the panel carries the explanation.
 */
export function isMeterStale(consecutiveFailures: number, rowCount: number): boolean {
  return consecutiveFailures >= STALE_AFTER_FAILURES && rowCount > 0;
}

export type PanelFailureView = {
  /** Show the localized dropped-session guidance instead of the host's text. */
  linkLost: boolean;
  /** The last snapshot is still on screen but is no longer live. */
  showingStale: boolean;
  /** A retry cannot fix a dropped session, so the error card must not offer one. */
  showRetry: boolean;
};

export function panelFailureView(input: {
  isError: boolean;
  error: unknown;
  providerCount: number;
}): PanelFailureView {
  const linkLost = input.isError && isHostLinkLost(input.error);
  return {
    linkLost,
    showingStale: input.isError && input.providerCount > 0,
    showRetry: input.isError && !linkLost,
  };
}

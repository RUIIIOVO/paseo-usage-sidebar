/**
 * The failure classifier and the two view decisions it feeds.
 *
 * Run: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HOST_LINK_LOST_CODE,
  INITIAL_LINK_FAILURE_STATE,
  SUSPECT_GRACE_MS,
  classifyLinkFailure,
  errorMessage,
  isHostLinkLost,
  isMeterStale,
  judgeLinkFailure,
  panelFailureView,
  type LinkFailureState,
} from "../shared/usage/errors";

/** The message the SDK produces once the client has forgotten `server_info`. */
const PROVEN = new Error("Update the host to list provider usage");
/** What a call that raced the disconnect sees. */
const SUSPECTED = new Error("Connection lost");
const UNRELATED = new Error("provider rejected the request: 429");

describe("errorMessage", () => {
  it("unwraps every shape a rejection can take", () => {
    assert.equal(errorMessage(new Error("boom")), "boom");
    assert.equal(errorMessage("boom"), "boom");
    assert.equal(errorMessage({ toString: () => "boom" }), "boom");
    assert.equal(errorMessage(undefined), "undefined");
  });
});

describe("classifyLinkFailure", () => {
  it("treats only the feature-gate text as proof", () => {
    assert.equal(classifyLinkFailure(PROVEN), "proven");
    // Case-insensitive: the host has changed this string's capitalization before.
    assert.equal(classifyLinkFailure(new Error("UPDATE THE HOST TO LIST PROVIDER USAGE")), "proven");
  });

  it("treats transport wording as suspicion, not proof", () => {
    for (const message of ["Connection lost", "Daemon client closed", "daemon client is disposed"]) {
      assert.equal(classifyLinkFailure(new Error(message)), "suspected", message);
    }
  });

  it("leaves ordinary failures alone", () => {
    assert.equal(classifyLinkFailure(UNRELATED), "unrelated");
    assert.equal(classifyLinkFailure(new Error("Update the host to do something else")), "unrelated");
  });
});

describe("judgeLinkFailure", () => {
  it("diagnoses a proven failure on the first occurrence", () => {
    const verdict = judgeLinkFailure(PROVEN, 1_000, INITIAL_LINK_FAILURE_STATE);
    assert.equal(verdict.kind, "link-lost");
    assert.equal(verdict.announce, true);
  });

  it("logs a link loss once, not once per poll", () => {
    const first = judgeLinkFailure(PROVEN, 1_000, INITIAL_LINK_FAILURE_STATE);
    const second = judgeLinkFailure(PROVEN, 61_000, first.state);
    assert.equal(second.kind, "link-lost");
    assert.equal(second.announce, false);
  });

  it("rethrows a suspected failure inside the grace window", () => {
    // This is the regression the grace window exists for: a retry burst must not
    // escalate a blip into "reload the plugin".
    let state: LinkFailureState = INITIAL_LINK_FAILURE_STATE;
    for (const now of [0, 1_000, 3_000, SUSPECT_GRACE_MS - 1]) {
      const verdict = judgeLinkFailure(SUSPECTED, now, state);
      assert.equal(verdict.kind, "rethrow", `at ${now}ms`);
      state = verdict.state;
    }
  });

  it("diagnoses a suspected failure that outlives the grace window", () => {
    const first = judgeLinkFailure(SUSPECTED, 0, INITIAL_LINK_FAILURE_STATE);
    const later = judgeLinkFailure(SUSPECTED, SUSPECT_GRACE_MS, first.state);
    assert.equal(later.kind, "link-lost");
    assert.equal(later.announce, true);
  });

  it("restarts the clock when a suspected run is broken by an unrelated failure", () => {
    const suspected = judgeLinkFailure(SUSPECTED, 0, INITIAL_LINK_FAILURE_STATE);
    const unrelated = judgeLinkFailure(UNRELATED, 1_000, suspected.state);
    assert.equal(unrelated.kind, "rethrow");
    assert.equal(unrelated.state.suspectedSince, null);

    // Well past the original start, but the run is new, so still a rethrow.
    const resumed = judgeLinkFailure(SUSPECTED, 60_000, unrelated.state);
    assert.equal(resumed.kind, "rethrow");
  });

  it("never reclassifies an unrelated failure", () => {
    const verdict = judgeLinkFailure(UNRELATED, 999_999, { suspectedSince: 0, reported: true });
    assert.equal(verdict.kind, "rethrow");
    assert.equal(verdict.announce, false);
  });
});

describe("isHostLinkLost", () => {
  it("matches the code through the host's handler-error wrapper", () => {
    const wrapped = new Error(
      `Request failed: ${HOST_LINK_LOST_CODE}: Connection lost requestType=plugin_rpc code=handler_error`,
    );
    assert.equal(isHostLinkLost(wrapped), true);
  });

  it("does not match an unrelated error", () => {
    assert.equal(isHostLinkLost(UNRELATED), false);
    assert.equal(isHostLinkLost(undefined), false);
  });
});

describe("isMeterStale", () => {
  it("tolerates a single missed poll", () => {
    assert.equal(isMeterStale(0, 3), false);
    assert.equal(isMeterStale(1, 3), false);
  });

  it("marks the block stale from the second consecutive failure", () => {
    assert.equal(isMeterStale(2, 3), true);
    assert.equal(isMeterStale(9, 1), true);
  });

  it("stays quiet when there is nothing on screen to be stale", () => {
    assert.equal(isMeterStale(9, 0), false);
  });
});

describe("panelFailureView", () => {
  const linkLostError = new Error(`${HOST_LINK_LOST_CODE}: Connection lost`);

  it("renders nothing special while the query is healthy", () => {
    assert.deepEqual(panelFailureView({ isError: false, error: null, providerCount: 3 }), {
      linkLost: false,
      showingStale: false,
      showRetry: false,
    });
  });

  it("offers a retry for a recoverable failure", () => {
    assert.deepEqual(panelFailureView({ isError: true, error: UNRELATED, providerCount: 0 }), {
      linkLost: false,
      showingStale: false,
      showRetry: true,
    });
  });

  it("withholds the retry for a dropped session", () => {
    const view = panelFailureView({ isError: true, error: linkLostError, providerCount: 0 });
    assert.equal(view.linkLost, true);
    assert.equal(view.showRetry, false);
  });

  it("marks a surviving snapshot as stale", () => {
    const view = panelFailureView({ isError: true, error: linkLostError, providerCount: 2 });
    assert.equal(view.showingStale, true);
  });
});

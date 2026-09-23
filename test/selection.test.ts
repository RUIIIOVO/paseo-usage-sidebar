/**
 * How a rearrangement of the rows on screen lands in the pin list that is saved.
 *
 * Run: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pinnedRows, reorderVisible, type Selection } from "../shared/selection/contract";
import { messagesFor } from "../shared/i18n/messages";
import type { ProviderUsage, UsageSnapshot } from "../shared/usage/contract";

describe("reorderVisible", () => {
  const cases: Array<{ name: string; order: string[]; visible: string[]; expected: string[] }> = [
    {
      name: "is a plain reorder when every pin is on screen",
      order: ["a:1", "a:2", "b:1"],
      visible: ["b:1", "a:1", "a:2"],
      expected: ["b:1", "a:1", "a:2"],
    },
    {
      name: "keeps a pin the snapshot could not resolve, in its slot",
      order: ["a:1", "gone:1", "a:2", "b:1"],
      visible: ["b:1", "a:2", "a:1"],
      expected: ["b:1", "gone:1", "a:2", "a:1"],
    },
    {
      name: "keeps unresolved pins at either end",
      order: ["gone:1", "a:1", "a:2", "gone:2"],
      visible: ["a:2", "a:1"],
      expected: ["gone:1", "a:2", "a:1", "gone:2"],
    },
    {
      name: "leaves the list alone when nothing is on screen",
      order: ["gone:1", "gone:2"],
      visible: [],
      expected: ["gone:1", "gone:2"],
    },
    {
      name: "appends a visible key the list did not hold rather than dropping it",
      order: ["a:1"],
      visible: ["a:1", "stray:1"],
      expected: ["a:1", "stray:1"],
    },
  ];

  for (const { name, order, visible, expected } of cases) {
    it(name, () => {
      assert.deepEqual(reorderVisible(order, visible), expected);
    });
  }

  it("does not mutate its inputs", () => {
    const order = ["a:1", "a:2"];
    const visible = ["a:2", "a:1"];
    reorderVisible(order, visible);
    assert.deepEqual(order, ["a:1", "a:2"]);
    assert.deepEqual(visible, ["a:2", "a:1"]);
  });
});

/**
 * The scenario the helper exists for, end to end: a provider errors for one
 * poll, the user reorders what is left, and the provider comes back.
 */
describe("a reorder while one provider is missing", () => {
  const messages = messagesFor("en");
  const label = (_provider: ProviderUsage, window: { label: string }) => window.label;

  function provider(providerId: string, windowIds: string[]): ProviderUsage {
    return {
      providerId,
      displayName: providerId,
      status: windowIds.length > 0 ? "available" : "error",
      planLabel: null,
      windows: windowIds.map((id) => ({ id, label: id })),
      balances: [],
      details: [],
    };
  }

  function snapshot(providers: ProviderUsage[]): UsageSnapshot {
    return { fetchedAt: null, source: "sdk", providers };
  }

  it("still shows the missing provider's pin once it reports again", () => {
    const saved: Selection = { keys: ["claude:five_hour", "codex:weekly", "claude:weekly"], configured: true };

    const degraded = snapshot([provider("claude", ["five_hour", "weekly"]), provider("codex", [])]);
    const onScreen = pinnedRows(degraded, saved, label, messages).map((row) => row.key);
    assert.deepEqual(onScreen, ["claude:five_hour", "claude:weekly"]);

    const next = reorderVisible(saved.keys, [...onScreen].reverse());
    assert.deepEqual(next, ["claude:weekly", "codex:weekly", "claude:five_hour"]);

    const recovered = snapshot([provider("claude", ["five_hour", "weekly"]), provider("codex", ["weekly"])]);
    assert.deepEqual(
      pinnedRows(recovered, { keys: next, configured: true }, label, messages).map((row) => row.key),
      next,
    );
  });
});

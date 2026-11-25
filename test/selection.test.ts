/**
 * How a rearrangement of the rows on screen lands in the pin list that is saved.
 *
 * Run: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { accountKey, pinnedRows, reorderVisible, rowKey, type Selection } from "../shared/selection/contract";
import { hideSidebarTitle } from "../shared/selection/title-visibility";
import { resolveTone, windowUsedPct } from "../shared/usage/format";
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
    const saved: Selection = {
      keys: ["claude:five_hour", "codex:weekly", "claude:weekly"],
      configured: true,
      displayAs: "used", showSidebarTitle: true,
    };

    const degraded = snapshot([provider("claude", ["five_hour", "weekly"]), provider("codex", [])]);
    const onScreen = pinnedRows(degraded, saved, label, messages).map((row) => row.key);
    assert.deepEqual(onScreen, ["claude:five_hour", "claude:weekly"]);

    const next = reorderVisible(saved.keys, [...onScreen].reverse());
    assert.deepEqual(next, ["claude:weekly", "codex:weekly", "claude:five_hour"]);

    const recovered = snapshot([provider("claude", ["five_hour", "weekly"]), provider("codex", ["weekly"])]);
    assert.deepEqual(
      pinnedRows(recovered, { keys: next, configured: true, displayAs: "used", showSidebarTitle: true }, label, messages).map((row) => row.key),
      next,
    );
  });
});


describe("pinned row display mode", () => {
  it("keeps warning severity based on consumed quota in either mode", () => {
    for (const [usedPct, expectedTone] of [[5, "ok"], [80, "warning"], [95, "danger"]] as const) {
      const window = { id: "weekly", label: "Weekly", usedPct };
      const provider: ProviderUsage = { providerId: "p", displayName: "P", status: "available", planLabel: null, windows: [window], balances: [], details: [] };
      const snapshot: UsageSnapshot = { fetchedAt: null, source: "sdk", providers: [provider] };
      for (const mode of ["used", "remaining"] as const) {
        const [row] = pinnedRows(snapshot, { keys: ["p:weekly"], configured: true, displayAs: mode, showSidebarTitle: true }, (_p, w) => w.label, messagesFor("en"));
        assert.equal(row.displayPct, mode === "used" ? usedPct : 100 - usedPct);
        assert.equal(resolveTone(row.window.tone, windowUsedPct(row.window)), expectedTone);
      }
    }
  });
});


describe("sidebar title visibility", () => {
  it("hides the title on narrow sidebars or when disabled, with a meter to open settings", () => {
    assert.equal(hideSidebarTitle(true, 239, true), true);
    assert.equal(hideSidebarTitle(true, 240, true), false);
    assert.equal(hideSidebarTitle(false, 400, true), true);
    assert.equal(hideSidebarTitle(false, 200, false), false);
    assert.equal(hideSidebarTitle(true, 0, true), false);
  });
});

describe("subscription aliases", () => {
  it("renames only the selected provider while keeping its pin identity", () => {
    const provider: ProviderUsage = { providerId: "antigravity-cli", displayName: "Antigravity (Default)", status: "available", planLabel: null, windows: [{id:"weekly",label:"Weekly",usedPct:20}], balances: [], details: [] };
    const snapshot: UsageSnapshot = { fetchedAt: null, source: "sdk", providers: [provider] };
    const base = { keys: ["antigravity-cli:weekly"], configured: true, displayAs: "remaining" as const, showSidebarTitle: true };
    const label = (_p: ProviderUsage, w: {label: string}) => w.label;
    assert.equal(pinnedRows(snapshot, {...base, aliases: {"antigravity-cli":"Antigravity-My"}}, label, messagesFor("en"))[0].providerName, "Antigravity-My");
    assert.equal(pinnedRows(snapshot, {...base, aliases: {"antigravity-cli":"  "}}, label, messagesFor("en"))[0].providerName, provider.displayName);
    assert.equal(pinnedRows(snapshot, base, label, messagesFor("en"))[0].key, "antigravity-cli:weekly");
  });
});


describe("accounts from one source", () => {
  it("keeps aliases and pins independent when windows have identical IDs", () => {
    const make = (name: string): ProviderUsage => ({ providerId: "antigravity-accounts", displayName: name, status: "available", planLabel: null, windows: [{ id: "gemini-5h", label: "5h", usedPct: 10 }], balances: [], details: [] });
    const a = make("Antigravity accounts (Gemini-My)");
    const b = make("Antigravity accounts (Gemini-Out)");
    const snapshot: UsageSnapshot = { fetchedAt: null, source: "sdk", providers: [a, b] };
    const selection: Selection = { keys: [rowKey(accountKey(a), "gemini-5h"), rowKey(accountKey(b), "gemini-5h")], configured: true, displayAs: "remaining", showSidebarTitle: true, aliases: { [accountKey(a)]: "My", [accountKey(b)]: "Out" } };
    const rows = pinnedRows(snapshot, selection, (_p, w) => w.label, messagesFor("en"));
    assert.deepEqual(rows.map((row) => row.providerName), ["My", "Out"]);
    assert.notEqual(rows[0].key, rows[1].key);
    assert.deepEqual(pinnedRows(snapshot, { ...selection, aliases: { ...selection.aliases, [accountKey(a)]: "Changed" } }, (_p, w) => w.label, messagesFor("en")).map((row) => row.providerName), ["Changed", "Out"]);
  });
});

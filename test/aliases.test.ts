import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it } from "node:test";
import { readSelectionState, writeSelectionState } from "../server/selection/state";

it("persists aliases without changing pins or preferences, and clears them", () => {
  const old = process.env.XDG_STATE_HOME;
  const dir = mkdtempSync(join(tmpdir(), "usage-sidebar-test-"));
  process.env.XDG_STATE_HOME = dir;
  try {
    writeSelectionState({ keys: ["a:weekly"], displayAs: "remaining", showSidebarTitle: false });
    writeSelectionState({ keys: ["a:weekly"], aliases: { a: "Antigravity-My" }, hiddenAccounts: ["other"], onlySelected: true });
    assert.deepEqual(readSelectionState(), { keys: ["a:weekly"], configured: true, displayAs: "remaining", showSidebarTitle: false, aliases: { a: "Antigravity-My" }, hiddenAccounts: ["other"], onlySelected: true });
    writeSelectionState({ keys: ["a:weekly"], aliases: {} });
    assert.deepEqual(readSelectionState().aliases, {});
  } finally {
    if (old === undefined) delete process.env.XDG_STATE_HOME; else process.env.XDG_STATE_HOME = old;
    rmSync(dir, { recursive: true, force: true });
  }
});

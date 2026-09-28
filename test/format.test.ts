/**
 * Reset wording for a usage window.
 *
 * Run: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { messagesFor } from "../shared/i18n/messages";
import { formatResetLabel, formatWindowReset } from "../shared/usage/format";

const zh = messagesFor("zh-CN");
const inMs = (ms: number) => new Date(Date.now() + ms).toISOString();

describe("formatResetLabel", () => {
  it("says resetting now in the last minute instead of a 0-minute countdown", () => {
    assert.equal(formatResetLabel(inMs(30_000), zh), zh.resettingNow);
  });

  it("counts down once a full minute remains", () => {
    assert.equal(formatResetLabel(inMs(5 * 60_000 + 1_000), zh), zh.resets(zh.minutes(5)));
  });
});

describe("formatWindowReset", () => {
  it("marks an unused window with no reset instant as idle", () => {
    const window = { id: "five_hour", label: "Session", usedPct: 0, resetsAt: null };
    assert.equal(formatWindowReset(window, "zh-CN", zh), zh.idleWindow);
  });

  it("stays silent for a used window whose provider reports no reset", () => {
    const window = { id: "five_hour", label: "Session", usedPct: 40, resetsAt: null };
    assert.equal(formatWindowReset(window, "zh-CN", zh), null);
  });

  it("prefers the reported reset over the idle note", () => {
    const window = { id: "five_hour", label: "Session", usedPct: 0, resetsAt: inMs(2 * 3_600_000 + 60_000) };
    assert.equal(formatWindowReset(window, "zh-CN", zh), zh.resets(zh.hours(2) + " " + zh.minutes(1)));
  });
});

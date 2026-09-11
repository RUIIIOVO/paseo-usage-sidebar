import type { PluginServerContext } from "@getpaseo/plugin/server";
import { readSelectionState, writeSelectionState } from "./server/selection/state";
import { readSelection, writeSelection } from "./shared/selection/contract";
import { readUsage } from "./server/usage/read";
import { listUsage } from "./shared/usage/contract";

/**
 * Server entry: the three RPC handlers. Everything here needs either Node
 * (the pin list is a file) or the daemon-side Paseo API (provider usage).
 */
export default function contribute(server: PluginServerContext) {
  server.handle(listUsage, readUsage);
  server.handle(readSelection, () => readSelectionState());
  server.handle(writeSelection, (input) => writeSelectionState(input));
  return () => {};
}

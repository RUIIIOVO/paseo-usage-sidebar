import type { PluginCleanup } from "@getpaseo/plugin";
import type { PluginClientContext } from "@getpaseo/plugin/client";
import { startSidebarMeter } from "./client/ui/sidebar-meter";
import { sidebarTitle } from "./client/ui/sidebar-title";
import { UsageSurface } from "./client/ui/usage-surface";

const SURFACE_ID = "usage";

/**
 * Client entry: the surface, its sidebar row, the Command Center shortcut, and
 * the sidebar meter.
 *
 * The meter used to be registered through `plugin.addClientSide(startSidebarMeter)`.
 * 0.8 drops that wrapper because this entry *is* the client callback — it already
 * receives a `PluginClientContext` and returns a cleanup — so the meter is
 * started inline and its teardown folded into the returned cleanup.
 */
export default function contribute(client: PluginClientContext): PluginCleanup {
  const title = sidebarTitle();

  const removers = [
    client.addSurface(SURFACE_ID, UsageSurface),
    client.addSidebarItem({
      id: "usage",
      title,
      icon: "Gauge",
      surface: SURFACE_ID,
    }),
    client.addCommandCenterItem({
      id: "open-usage",
      title,
      icon: "Gauge",
      keywords: ["usage", "quota", "plan", "limit", "tokens"],
      context: "global",
      onSelect: (context) => {
        context.openSurface(SURFACE_ID);
      },
    }),
  ];

  const stopMeter = startSidebarMeter(client);

  // The removers are idempotent, so running them here is safe even though Paseo
  // also drops outstanding registrations after this cleanup returns.
  return () => {
    stopMeter();
    for (const remove of removers) {
      remove();
    }
  };
}

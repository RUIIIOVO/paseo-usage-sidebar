import type { PluginCleanup } from "@getpaseo/plugin";
import type { PluginClientContext } from "@getpaseo/plugin/client";
import { subscribeLocale } from "./client/i18n/locale";
import { startSidebarMeter } from "./client/ui/sidebar-meter";
import { sidebarTitle } from "./client/ui/sidebar-title";
import { UsageSurface } from "./client/ui/usage-surface";

const SURFACE_ID = "usage";

/**
 * The two host registrations that carry a *string* label rather than a component.
 *
 * Everything else in this plugin re-renders or repaints from the live locale, but
 * these hand Paseo a fixed string, so the only way to change the language they
 * show is to withdraw the registration and make it again.
 */
function registerLabels(client: PluginClientContext): PluginCleanup {
  const title = sidebarTitle();
  const removers = [
    client.addSidebarItem({
      id: "usage",
      title,
      icon: "Gauge",
      surface: SURFACE_ID,
    }),
    client.addCommandCenterItem({
      id: "open-usage",
      title,
      // Searchable in English regardless of the display language: the command
      // center is typed into, and muscle memory outlives a language switch.
      keywords: ["usage", "quota", "plan", "limit", "tokens"],
      icon: "Gauge",
      context: "global",
      onSelect: (context) => {
        context.openSurface(SURFACE_ID);
      },
    }),
  ];
  return () => {
    for (const remove of removers) {
      remove();
    }
  };
}

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
  const removeSurface = client.addSurface(SURFACE_ID, UsageSurface);
  let removeLabels = registerLabels(client);

  // Only fires on an actual change of resolved locale, so the re-registration —
  // the one thing here that visibly reshuffles host state — costs nothing while
  // the language is left alone.
  const stopWatchingLocale = subscribeLocale(() => {
    removeLabels();
    removeLabels = registerLabels(client);
  });

  const stopMeter = startSidebarMeter(client);

  // The removers are idempotent, so running them here is safe even though Paseo
  // also drops outstanding registrations after this cleanup returns.
  return () => {
    stopWatchingLocale();
    stopMeter();
    removeLabels();
    removeSurface();
  };
}

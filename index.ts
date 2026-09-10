import type { PluginContext } from "@getpaseo/plugin";
import { startSidebarMeter } from "./sidebar-meter.client";
import { sidebarTitle } from "./sidebar-title.client";
import { UsageSurface } from "./usage-surface.client";
import { readUsage } from "./usage.server";
import { listUsage } from "./usage.shared";

const SURFACE_ID = "usage";

export default function contribute(plugin: PluginContext) {
  plugin.handle(listUsage, readUsage);
  plugin.addSurface(SURFACE_ID, UsageSurface);
  plugin.addSidebarItem({
    id: "usage",
    title: sidebarTitle(),
    icon: "Gauge",
    surface: SURFACE_ID,
  });
  plugin.addClientSide(startSidebarMeter);
  plugin.addCommandCenterItem({
    id: "open-usage",
    title: sidebarTitle(),
    icon: "Gauge",
    keywords: ["usage", "quota", "plan", "limit", "tokens"],
    context: "global",
    onSelect: (context) => {
      context.openSurface(SURFACE_ID);
    },
  });
  return () => {};
}

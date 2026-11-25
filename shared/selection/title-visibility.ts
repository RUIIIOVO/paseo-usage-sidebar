/** Keep the title available when no meter can act as its replacement entry point. */
export function hideSidebarTitle(showTitle: boolean, sidebarWidth: number, hasMeters: boolean): boolean {
  return hasMeters && (!showTitle || (sidebarWidth > 0 && sidebarWidth < 240));
}

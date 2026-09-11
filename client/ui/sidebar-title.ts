import { messagesFor } from "../../shared/i18n/messages";
import { getLocale } from "../i18n/locale";

/**
 * Sidebar and Command Center labels are plain strings held by the host's
 * registry, not components it re-renders, so the label is whatever the string
 * said at registration time. This resolves it fresh on every call; following a
 * language change is the caller's job, by re-registering with a new string
 * (see index.client.tsx).
 */
export function sidebarTitle(): string {
  const platform = typeof document === "undefined" ? "ios" : "web";
  return messagesFor(getLocale(platform)).title;
}

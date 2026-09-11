import { messagesFor } from "../../shared/i18n/messages";
import { resolveLocale } from "../i18n/locale";

/**
 * Sidebar and Command Center labels are plain strings captured when the client
 * bundle registers its contributions. The bundle is evaluated in the Paseo
 * renderer, so the locale is resolvable at registration time — but the label is
 * fixed for that session and does not follow a later language change.
 */
export function sidebarTitle(): string {
  const platform = typeof document === "undefined" ? "ios" : "web";
  return messagesFor(resolveLocale(platform)).title;
}

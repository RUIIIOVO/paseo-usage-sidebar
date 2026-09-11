import type { Selection } from "../../shared/selection/contract";

/**
 * The surface and the sidebar meter live in one client bundle instance, so a
 * module-level store is enough to make a pin toggle show up in the sidebar
 * immediately instead of on the meter's next poll.
 */
let current: Selection | null = null;
const listeners = new Set<(selection: Selection) => void>();

export function getSelection(): Selection | null {
  return current;
}

export function publishSelection(selection: Selection): void {
  current = selection;
  for (const listener of listeners) {
    listener(selection);
  }
}

export function subscribeSelection(listener: (selection: Selection) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

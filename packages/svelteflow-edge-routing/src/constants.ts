/** Debounce (ms) before routing runs after diagram changes.
 *  Must be > 0 so Svelte has time to apply position state before we read refs. */
export const DEBOUNCE_ROUTING_MS = 16;

/** Default border radius (px) for routed path corners. */
export const EDGE_BORDER_RADIUS = 0;

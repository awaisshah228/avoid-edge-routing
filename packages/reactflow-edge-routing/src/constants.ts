/** Debounce (ms) before routing runs after diagram changes.
 *  Must be > 0 so React has time to apply position state before we read nodesRef. */
export const DEBOUNCE_ROUTING_MS = 16;

/** Default border radius (px) for routed path corners. */
export const EDGE_BORDER_RADIUS = 0;

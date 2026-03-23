/**
 * Listener for edge-routing Web Worker messages.
 * Syncs "loaded" / "routed" into the edge routing store.
 */

import type { AvoidRoute } from "./routing-core";
import type { EdgeRoutingWorkerResponse } from "./worker-messages";
import { useEdgeRoutingStore } from "./edge-routing-store";

export interface AttachWorkerListenerOptions {
  onRouted?: (routes: Record<string, AvoidRoute>) => void;
  onLoaded?: (success: boolean) => void;
}

export function attachWorkerListener(
  worker: Worker,
  options: AttachWorkerListenerOptions = {}
): () => void {
  const { onRouted, onLoaded } = options;
  const setLoaded = useEdgeRoutingStore.getState().setLoaded;
  const setRoutes = useEdgeRoutingStore.getState().setRoutes;

  const handler = (e: MessageEvent<EdgeRoutingWorkerResponse>) => {
    const msg = e.data;
    if (!msg || typeof msg !== "object" || !("command" in msg)) return;

    switch (msg.command) {
      case "loaded":
        setLoaded(msg.success);
        onLoaded?.(msg.success);
        break;
      case "routed": {
        // Merge new routes with existing ones so edges that failed
        // to route this cycle keep their last good path
        const prev = useEdgeRoutingStore.getState().routes;
        const merged = { ...prev, ...msg.routes };
        setRoutes(merged);
        onRouted?.(merged);
        break;
      }
      default:
        break;
    }
  };

  worker.addEventListener("message", handler);
  return () => worker.removeEventListener("message", handler);
}

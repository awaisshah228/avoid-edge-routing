/**
 * createRoutingWorker — Creates and manages the edge-routing Web Worker.
 * Svelte equivalent of useRoutingWorker (React hook).
 *
 * Returns an object with { workerLoaded, post, close, destroy }.
 * Call destroy() in onDestroy() to clean up.
 */

import { writable, get } from "svelte/store";
import type { EdgeRoutingWorkerCommand } from "./worker-messages";
import type { AvoidRoute } from "./routing-core";
import { attachWorkerListener } from "./worker-listener";

export interface CreateRoutingWorkerOptions {
  onRouted?: (routes: Record<string, AvoidRoute>) => void;
  onLoaded?: (success: boolean) => void;
}

export interface RoutingWorkerInstance {
  workerLoaded: import("svelte/store").Writable<boolean>;
  post: (cmd: EdgeRoutingWorkerCommand) => void;
  close: () => void;
  destroy: () => void;
}

export function createRoutingWorker(options?: CreateRoutingWorkerOptions): RoutingWorkerInstance {
  const workerLoaded = writable(false);
  let worker: Worker | null = null;
  let cleanup: (() => void) | null = null;

  try {
    worker = new Worker(
      new URL("./edge-routing.worker.ts", import.meta.url),
      { type: "module" },
    );
    console.log("[edge-routing] Worker created successfully");
  } catch (e) {
    console.error("[edge-routing] Failed to create worker:", e);
  }

  if (worker) {
    worker.addEventListener("error", (e) => {
      console.error("[edge-routing] Worker error event:", e.message, e);
    });

    worker.addEventListener("messageerror", (e) => {
      console.error("[edge-routing] Worker messageerror:", e);
    });

    cleanup = attachWorkerListener(worker, {
      onRouted: (routes) => {
        const keys = Object.keys(routes);
        console.log("[edge-routing] Routed", keys.length, "edges");
        options?.onRouted?.(routes);
      },
      onLoaded: (success) => {
        console.log("[edge-routing] Worker loaded:", success);
        workerLoaded.set(success);
        options?.onLoaded?.(success);
      },
    });

    const onBeforeUnload = () => {
      worker?.postMessage({ command: "close" } as EdgeRoutingWorkerCommand);
      worker?.terminate();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", onBeforeUnload);
    }
  }

  function post(cmd: EdgeRoutingWorkerCommand) {
    worker?.postMessage(cmd);
  }

  function close() {
    if (worker) {
      worker.postMessage({ command: "close" } as EdgeRoutingWorkerCommand);
      worker.terminate();
      worker = null;
      workerLoaded.set(false);
    }
  }

  function destroy() {
    cleanup?.();
    close();
  }

  return { workerLoaded, post, close, destroy };
}

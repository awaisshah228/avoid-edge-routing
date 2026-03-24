import { useCallback, useEffect, useRef, useState } from "react";
import type { EdgeRoutingWorkerCommand } from "./worker-messages";
import type { AvoidRoute } from "./routing-core";
import { attachWorkerListener } from "./worker-listener";

export interface UseRoutingWorkerOptions {
  create?: boolean;
  onRouted?: (routes: Record<string, AvoidRoute>) => void;
  onLoaded?: (success: boolean) => void;
}

export interface UseRoutingWorkerResult {
  workerLoaded: boolean;
  post: (cmd: EdgeRoutingWorkerCommand) => void;
  close: () => void;
}

/**
 * Creates the edge-routing Web Worker and waits for it to load WASM.
 * WASM loads exclusively in the worker thread — never on the main thread.
 */
export function useRoutingWorker(options?: UseRoutingWorkerOptions): UseRoutingWorkerResult {
  const workerRef = useRef<Worker | null>(null);
  const [workerLoaded, setWorkerLoaded] = useState(false);
  const onRoutedRef = useRef(options?.onRouted);
  const onLoadedRef = useRef(options?.onLoaded);
  useEffect(() => {
    onRoutedRef.current = options?.onRouted;
    onLoadedRef.current = options?.onLoaded;
  });

  const createWorker = options?.create !== false;

  useEffect(() => {
    if (!createWorker) {
      console.log("[edge-routing] createWorker=false, skipping");
      workerRef.current = null;
      setWorkerLoaded(false);
      return;
    }
    console.log("[edge-routing] Creating worker...");
    let worker: Worker;
    try {
      worker = new Worker(
        new URL("./edge-routing.worker.ts", import.meta.url),
        { type: "module" },
      );
      console.log("[edge-routing] Worker created successfully (inline URL)");
      console.log("[edge-routing] Worker created successfully");
    } catch (e) {
      console.error("[edge-routing] Failed to create worker:", e);
      return;
    }

    workerRef.current = worker;

    worker.addEventListener("error", (e) => {
      console.error("[edge-routing] Worker error event:", e.message, e);
    });

    worker.addEventListener("messageerror", (e) => {
      console.error("[edge-routing] Worker messageerror:", e);
    });

    const cleanup = attachWorkerListener(worker, {
      onRouted: (routes) => {
        const keys = Object.keys(routes);
        console.log("[edge-routing] Routed", keys.length, "edges, ids:", keys, "sample path:", routes[keys[0]]?.path?.substring(0, 80));
        onRoutedRef.current?.(routes);
      },
      onLoaded: (success) => {
        console.log("[edge-routing] Worker WASM loaded:", success);
        setWorkerLoaded(success);
        onLoadedRef.current?.(success);
      },
    });

    const onBeforeUnload = () => {
      worker.postMessage({ command: "close" } as EdgeRoutingWorkerCommand);
      worker.terminate();
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      cleanup();
      worker.postMessage({ command: "close" } as EdgeRoutingWorkerCommand);
      worker.terminate();
      workerRef.current = null;
      setWorkerLoaded(false);
    };
  }, [createWorker]);

  const post = useCallback((cmd: EdgeRoutingWorkerCommand) => {
    if (workerRef.current) {
      workerRef.current.postMessage(cmd);
    }
  }, []);

  const close = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ command: "close" } as EdgeRoutingWorkerCommand);
      workerRef.current.terminate();
      workerRef.current = null;
      setWorkerLoaded(false);
    }
  }, []);

  return { workerLoaded, post, close };
}

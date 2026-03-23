/**
 * Polyfill for Web Worker: `window` is not available in workers, only `self`.
 * Some libraries (e.g. libavoid-js, Emscripten WASM) reference `window` directly.
 * This must be imported FIRST in any worker that loads such libraries.
 */
if (typeof window === "undefined" && typeof self !== "undefined") {
  (self as unknown as Record<string, unknown>).window = self;
}

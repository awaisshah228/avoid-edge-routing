import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [sveltekit()],
  ssr: {
    noExternal: ["obstacle-router", "svelteflow-edge-routing", "reactflow-edge-routing"],
  },
  server: {
    fs: {
      allow: [path.resolve("../../")],
    },
  },
});

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ReactFlowProvider } from "@xyflow/react";
import { inject } from "@vercel/analytics";
import App from "./App";

inject();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ReactFlowProvider>
      <App />
    </ReactFlowProvider>
  </StrictMode>
);

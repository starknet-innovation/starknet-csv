import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { StarknetProvider } from "./providers/StarknetProvider";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StarknetProvider>
      <App />
    </StarknetProvider>
  </StrictMode>,
);

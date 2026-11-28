import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LinkProvider } from "@meddash/design-system/components";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { RouterLink } from "./lib/RouterLink";
import { applyTheme, readTheme } from "./lib/theme";
import "@meddash/design-system/index.css";
import "./styles/global.css";

// Before the first render, so the page never paints in the wrong theme.
applyTheme(readTheme());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <LinkProvider component={RouterLink}>
        <App />
      </LinkProvider>
    </BrowserRouter>
  </StrictMode>,
);

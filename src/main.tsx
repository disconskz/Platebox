import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installClientLogger } from "./lib/client-logger";
import { RootErrorBoundary } from "./components/RootErrorBoundary";

installClientLogger();
createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);

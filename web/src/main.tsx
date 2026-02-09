import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "@xyflow/react/dist/style.css";
import App from "./App.tsx";
import "./i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);

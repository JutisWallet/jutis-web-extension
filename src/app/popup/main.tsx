import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { PopupApp } from "@/app/popup/App";
import "@/ui/styles/global.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found.");
}

createRoot(root).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>
);

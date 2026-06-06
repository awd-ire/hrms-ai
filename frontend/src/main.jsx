import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "@/App";
import ClickLogger from "@/components/debug/ClickLogger";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

/**
 * Global CSS (Tailwind)
 */
import "./index.css";

/**
 * Root bootstrap
 * - AuthProvider (global auth state)
 * - ThemeProvider (UI theme only)
 * - Router (React Router v6)
 */
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <ClickLogger />
          <App />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

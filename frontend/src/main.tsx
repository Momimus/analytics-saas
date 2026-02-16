import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./style.css";
import { AuthProvider } from "./context/auth";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./context/theme";

ReactDOM.createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

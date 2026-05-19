import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { ThemeProvider } from "../context/ThemeContext.tsx";
import { ToastProvider } from "./feedback/ToastContext";
import { AuthProvider } from "../features/auth/AuthContext";
import { queryClient } from "../queryClient";

function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default Providers;

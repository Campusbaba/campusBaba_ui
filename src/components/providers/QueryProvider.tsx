"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, ReactNode } from "react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";

// Example of a custom product-specific devtools panel that mounts in the unified shell
function CampusBabaDevtoolsPanel() {
  return (
    <div style={{ padding: "1rem" }}>
      <h3 style={{ fontSize: "1.125rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
        CampusBaba Internal Inspector
      </h3>
      <p style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>
        Use this lightweight panel to inspect custom product state, feature flags, or context without needing a separate admin route.
      </p>
      <div style={{ background: "rgba(0,0,0,0.2)", padding: "0.5rem", borderRadius: "0.25rem", fontSize: "0.875rem" }}>
        <strong>Environment:</strong> {process.env.NODE_ENV}
      </div>
    </div>
  );
}

//5 minutes data cache 
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 10, // 5 minutes
        refetchOnWindowFocus: false, // Prevents refetching when switching browser tabs
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      
      {/* 
        Unified Devtools Shell
        Only mounts in development. Keeps the panel lightweight and framework-friendly.
        You can pass both built-in library panels and product-specific custom panels.
      */}
      {process.env.NODE_ENV === "development" && (
        <TanStackDevtools
          plugins={[
            {
              name: "TanStack Query",
              render: <ReactQueryDevtoolsPanel />,
              defaultOpen: true,
            },
            {
              name: "CampusBaba Tools",
              render: <CampusBabaDevtoolsPanel />,
            },
          ]}
        />
      )}
    </QueryClientProvider>
  );
}

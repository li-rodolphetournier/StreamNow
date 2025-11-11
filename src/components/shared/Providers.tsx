"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ThemeProvider } from "@/components/shared/ThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {children}
        <ToastContainer
          position="bottom-right"
          newestOnTop
          closeOnClick
          pauseOnFocusLoss={false}
          pauseOnHover
          draggable={false}
          theme="dark"
          toastClassName="rounded-lg border border-border bg-background text-foreground shadow-lg"
          bodyClassName="text-sm"
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}


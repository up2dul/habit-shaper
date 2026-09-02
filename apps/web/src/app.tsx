import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import { queryClient, router } from "@/app-router";
import { Toaster } from "@/components/ui/toast";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster>
        <RouterProvider router={router} />
      </Toaster>
    </QueryClientProvider>
  );
}

export default App;

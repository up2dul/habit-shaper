import path from "path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    // pnpm resolves @fontsource files through the workspace-level node_modules.
    // Allow Vite to serve those real paths when running the web app directly.
    fs: {
      allow: [path.resolve(import.meta.dirname, "../..")],
    },
  },
});

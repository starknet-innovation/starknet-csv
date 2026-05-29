import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Served from https://starknet-innovation.github.io/starknet-csv/
// Override with VITE_BASE (e.g. "/" for a custom domain or local preview).
export default defineConfig({
  base: process.env.VITE_BASE ?? "/starknet-csv/",
  plugins: [react()],
});

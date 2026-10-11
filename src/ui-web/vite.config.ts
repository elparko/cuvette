import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const here = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: here,
  base: "./",
  plugins: [react(), tailwindcss()],
  build: { outDir: fileURLToPath(new URL("../../ui-dist/", import.meta.url)), emptyOutDir: true, assetsInlineLimit: 8192, chunkSizeWarningLimit: 1200 },
  server: { proxy: { "^/(api|events|graph)": process.env.CUVETTE_URL ?? "http://127.0.0.1:4317" } },
});

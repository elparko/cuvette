import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const policy = "default-src 'self'; script-src 'self'; img-src 'self' data: blob:; connect-src 'self' ipc: http://ipc.localhost; frame-src 'self'; style-src 'self' 'unsafe-inline'";

const contentPolicy = (): Plugin => ({
  name: "content-policy",
  apply: "build",
  transformIndexHtml: () => [{ tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: policy }, injectTo: "head-prepend" }],
});

const here = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: here,
  base: "./",
  plugins: [react(), tailwindcss(), contentPolicy()],
  build: { outDir: fileURLToPath(new URL("../../ui-dist/", import.meta.url)), emptyOutDir: true, assetsInlineLimit: 8192, chunkSizeWarningLimit: 1200 },
  server: { proxy: { "^/(api|events|graph)": process.env.CUVETTE_URL ?? "http://127.0.0.1:4317" } },
});

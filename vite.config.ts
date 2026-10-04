import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Tauri erwartet einen festen Port im Dev-Modus und statische Dateien in ./dist.
// GitHub Pages braucht den Repo-Unterpfad als Basis (gesetzt nur im Pages-Workflow).
// Tauri- und lokale Builds bleiben bei "/".
const base = process.env["GITHUB_PAGES_BASE"] ?? "/";

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: {
    outDir: "dist",
    target: "es2022",
    emptyOutDir: true,
  },
});

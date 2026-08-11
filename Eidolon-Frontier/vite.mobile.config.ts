import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: resolve(__dirname, "mobile"),
  base: "./",
  publicDir: resolve(__dirname, "public"),
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "dist-mobile"),
    emptyOutDir: true,
    sourcemap: false,
    target: "es2020",
  },
});

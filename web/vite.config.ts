import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// Egen domene (carboncut.no): siden ligger i rot, så base er '/'.
export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@calc": fileURLToPath(new URL("../calc/src", import.meta.url)) } },
  server: { host: "127.0.0.1", port: 5180, strictPort: true, fs: { allow: [".."] } },
});

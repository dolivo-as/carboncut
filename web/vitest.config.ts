import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@calc": fileURLToPath(new URL("../calc/src", import.meta.url)) } },
  test: { environment: "node" },
});

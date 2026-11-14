import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// Tester kjører i workerd (miniflare) med lokal D1 i minnet. Ingen konto, ingen nett.
export default defineConfig(async () => {
  const migrations = await readD1Migrations("./migrations");
  return {
    plugins: [
      cloudflareTest({
        main: "./src/index.ts",
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            MILJO: "lokal",
            ADMIN_DEV_KEY: "test-nokkel-kun-for-tester-0123456789",
            ADMIN_DEV_ID: "00000000-0000-4000-8000-00000000a001",
            DEV_ORIGINS: "http://127.0.0.1:5180",
          },
        },
      }),
    ],
    test: { setupFiles: ["./test/setup.ts"] },
  };
});

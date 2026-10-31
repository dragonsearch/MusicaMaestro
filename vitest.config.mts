import { defineConfig } from "vitest/config";

// .mts so the config is loaded as ESM. package.json is commonjs.
export default defineConfig({
  test: {
    // Queue and the extractor are node only, no browser globals needed.
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});

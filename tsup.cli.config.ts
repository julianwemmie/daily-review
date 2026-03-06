import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli/main.ts"],
  outDir: "dist/cli",
  format: "esm",
  target: "node20",
  platform: "node",
  splitting: false,
  bundle: true,
  // Don't bundle these — they'll be installed as deps
  external: [
    "commander",
    "@clack/prompts",
    "jszip",
    "sql.js",
    "transit-js",
  ],
  banner: {
    js: '#!/usr/bin/env node',
  },
});

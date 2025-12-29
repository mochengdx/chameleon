import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  // For GitHub Pages you typically need a sub-path base like `/repo-name/`.
  // The Pages workflow sets BASE_PATH automatically.
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: [
      {
        find: /^@chameleon\/adapters\/src$/,
        replacement: fileURLToPath(new URL("../packages/adapters/src", import.meta.url))
      },
      {
        find: /^@chameleon\/adapters$/,
        replacement: fileURLToPath(new URL("../packages/adapters/src", import.meta.url))
      },
      {
        find: /^@chameleon\/core$/,
        replacement: fileURLToPath(new URL("../packages/core/src", import.meta.url))
      },
      {
        find: /^@chameleon\/plugins$/,
        replacement: fileURLToPath(new URL("../packages/plugins/src", import.meta.url))
      }
    ]
  },
  optimizeDeps: {
    exclude: ["@chameleon/core", "@chameleon/adapters", "@chameleon/plugins"]
  }
});

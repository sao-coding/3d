import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const assetVersion = process.env.BUILD_ID ?? Date.now().toString(36);

export default defineConfig({
  server: {
    port: 3001,
  },
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.name?.endsWith(".css")
            ? `assets/[name]-${assetVersion}[extname]`
            : "assets/[name]-[hash][extname]",
      },
    },
  },
  plugins: [tailwindcss(), tanstackStart(), nitro({ preset: "node-server" }), viteReact()],
});

import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";

/*
  Address of the Python service (see `/service`). The browser never talks to it
  directly: requests to `/api` and `/socket.io` are proxied by the dev server.
  Inside Docker the service runs on the host, hence `host.docker.internal`
  (set through `docker-compose.yaml`).
*/
const apiTarget = process.env.API_PROXY_TARGET || "http://localhost:5001";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
      "/socket.io": {
        target: apiTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});

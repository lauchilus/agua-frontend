import { defineConfig, loadEnv } from "vite";
import preact from "@preact/preset-vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const proxy: Record<string, import("vite").ProxyOptions> = {
    "/api": {
      target: env.BACKEND_URL || "http://localhost:8080",
      changeOrigin: true,
      configure: (server) => {
        // El formulario muestra el 401; evitar el dialogo Basic nativo del navegador.
        server.on("proxyRes", (response) => {
          delete response.headers["www-authenticate"];
        });
      },
    },
  };
  return {
    plugins: [preact()],
    server: { port: 5173, strictPort: true, proxy },
    preview: { port: 4173, strictPort: true, proxy },
  };
});

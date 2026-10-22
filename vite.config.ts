import {readFileSync} from "node:fs";
import { defineConfig, loadEnv } from "vite";
import preact from "@preact/preset-vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  // El modo LAN exige certificados; nunca baja silenciosamente a HTTP.
  const https = mode === "lan" ? (() => {
    try {
      return { cert: readFileSync(new URL("./.certs/agua.pem", import.meta.url)), key: readFileSync(new URL("./.certs/agua-key.pem", import.meta.url)) };
    } catch {
      throw new Error("Faltan certificados LAN. Ejecuta scripts/preparar-lan.ps1 antes de npm run preview:lan.");
    }
  })() : undefined;
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
    define: { __APP_VERSION__: JSON.stringify(JSON.parse(readFileSync(new URL("./package.json",import.meta.url),"utf8")).version) },
    plugins: [preact()],
    server: { port: 5173, strictPort: true, proxy },
    preview: { port: 4173, strictPort: true, proxy, https, host: mode === "lan" ? "0.0.0.0" : "127.0.0.1" },
  };
});

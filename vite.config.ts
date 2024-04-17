import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import EnvironmentPlugin from "vite-plugin-environment";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    EnvironmentPlugin({
      // Uses 'development' if the NODE_ENV environment variable is not defined.
      NODE_ENV: "development",

      // Have in mind that variables coming from process.env are always strings.
      DEBUG: "false",
    }),
  ],
  resolve: {
    alias: {
      // Provide aliases for node modules
      stream: "stream-browserify",
      crypto: "crypto-browserify",
      zlib: "browserify-zlib",
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: "globalThis",
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
        }),
      ],
    },
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});

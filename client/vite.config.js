import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries
          vendor: ["preact"],
          // Split keyboard library
          keyboard: ["simple-keyboard"],
          // Split large libraries
          mediapipe: ["@mediapipe/camera_utils", "@mediapipe/face_mesh"],
          tensorflow: [
            "@tensorflow-models/body-segmentation",
            "@tensorflow/tfjs-backend-webgl",
            "@tensorflow/tfjs-core",
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ["preact", "preact/hooks", "preact/compat"],
  },
});

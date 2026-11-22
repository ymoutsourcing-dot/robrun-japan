import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// PUBLIC_INDEXING=true のときだけ検索エンジンにインデックスさせる（友人限定公開中は false）
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const indexing = env.PUBLIC_INDEXING === "true";
  return {
    plugins: [
      react(),
      {
        name: "robots-meta",
        transformIndexHtml: (html: string) =>
          html.replace("__ROBOTS__", indexing ? "index,follow" : "noindex,nofollow"),
      },
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: { flow: ["@xyflow/react"], vendor: ["react", "react-dom", "react-router-dom", "zustand"] },
        },
      },
    },
  };
});

import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";
import gzipPlugin from "rollup-plugin-gzip";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import tailwindcss from "@tailwindcss/vite";

// Fix for __dirname in ES modules
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(async ({ mode }): Promise<UserConfig> => ({
  root: 'client',
  define: {
    global: 'globalThis',
  },
  plugins: [
    tailwindcss(),
    nodePolyfills({
      globals: true,
      protocolImports: true,
    }),
    react({
      babel: {
        plugins: [],
      },
    }),
    runtimeErrorOverlay(),
    metaImagesPlugin(),
    ...(mode === "production" ? [
      gzipPlugin({
        filter: /\.(js|mjs|json|css|html)$/,
        minSize: 1000,
      })
    ] : []),
    ...(mode !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      treeshake: true,
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui-core': ['@radix-ui/react-dialog', '@radix-ui/react-popover'],
          'vendor-ui-form': ['@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-dropdown-menu'],
          'vendor-charts': ['recharts'],
          'vendor-utils': ['date-fns', 'zod', 'clsx', 'tailwind-merge'],
          'vendor-motion': ['framer-motion'],
          'vendor-icons': ['lucide-react'],
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo: any) => {
          if (!assetInfo.name) return 'assets/[name]-[hash][extname]';
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/woff2?|ttf|otf|eot/i.test(ext)) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    cssMinify: true,
  },
  server: {
    host: "0.0.0.0",
    port: 3005,
    allowedHosts: true,
    fs: {
      strict: false,
      deny: ["**/.*"],
    },
    proxy: {},
  },
}));

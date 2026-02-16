import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import gzipPlugin from "rollup-plugin-gzip";

export default defineConfig(async ({ mode }) => ({
  root: 'client',
  plugins: [
    react({
      // Enable React Compiler for better performance
      babel: {
        plugins: [],
      },
    }),
    runtimeErrorOverlay(),
    tailwindcss(),
    // Only include node polyfills in development
    ...(mode !== "production" ? [
      nodePolyfills({
        include: ["buffer", "events", "stream", "util"],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      })
    ] : []),
    // Enable gzip compression for production
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
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Optimization: Enable minification and chunking
    minify: 'esbuild',
    target: 'es2020',
    // esbuild minification is faster and sufficient for most cases
    rollupOptions: {
      treeshake: true,
      output: {
        // Split vendor chunks for better caching
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
        // Optimize chunk file naming for caching
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
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
    // Enable source maps for production debugging (optional)
    sourcemap: false,
    // Optimize chunk size - warn if chunks are larger
    chunkSizeWarningLimit: 500,
    // Reduce CSS size
    cssMinify: true,
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: false,
      deny: ["**/.*"],
    },
  },
}));

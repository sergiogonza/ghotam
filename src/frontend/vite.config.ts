import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 5173,
    proxy: {
      '/api/bluesky/live': { target: 'http://127.0.0.1:8790', changeOrigin: true },
      '/api/bluesky': { target: 'http://127.0.0.1:8790', changeOrigin: true },
      '/api/rss': { target: 'http://localhost:8788', changeOrigin: true },
      '/api/lm': { target: 'http://localhost:8789', changeOrigin: true },
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/hub': { target: 'http://localhost:5000', ws: true },
    },
  },
});

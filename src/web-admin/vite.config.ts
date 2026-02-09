import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import path from 'path';
import { config } from '../config/config'



export default defineConfig({
  plugins: [
    react(),
    TanStackRouterVite(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3024,
    proxy: {
      '/api': {
        target: 'http://localhost:3124',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173, // Preview port (can be anything)
    host: '0.0.0.0', // IMPORTANT: Allows Railway to access it
    proxy: {
      '/api': {
        target: 'http://web-admin-api.railway.internal',
        changeOrigin: true,
      },
    },
    allowedHosts: [
      'mes-event-admin.up.railway.app'
    ]
  },
  build: {
    outDir: 'dist/client',
    sourcemap: true,
  },
});

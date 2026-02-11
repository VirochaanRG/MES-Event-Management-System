import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import path from 'path';

export default defineConfig(({ mode }) =>
{
  const env = loadEnv(mode, process.cwd(), '');

  return {
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
      port: 3014,
      proxy: {
        '/api': {
          target: 'http://localhost:3114',
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 4173, // Preview port (can be anything)
      host: '0.0.0.0', // IMPORTANT: Allows Railway to access it
      proxy: {
        '/api': {
          target: 'https://web-user-production-f2a0.up.railway.app',
          changeOrigin: true,
        },
      },
      allowedHosts: [
        'mes-event-user.up.railway.app',
      ]
    },
    build: {
      outDir: 'dist/client',
      sourcemap: true,
    },
  };
});

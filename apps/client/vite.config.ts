import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(import.meta.dirname || path.resolve(), '../../');
  const env = loadEnv(mode, rootDir, '');
  const apiTarget = env.VITE_API_TARGET || process.env.VITE_API_TARGET || 'http://127.0.0.1:5000';

  return {
    envDir: rootDir,
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || path.resolve(), './src'),
      },
    },
    server: {
      host: true,
      port: 5173,
      allowedHosts: true,
      watch: {
        usePolling: true,
      },
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/media': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: apiTarget,
          ws: true,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (err: any) => {
              if (err.code === 'ECONNABORTED' || err.code === 'ECONNRESET') return;
              console.error('[ws proxy error]:', err.message);
            });
          },
        },
      },
    },
  };
});

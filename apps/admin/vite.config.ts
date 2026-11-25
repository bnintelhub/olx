import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command, mode }) => {
  const rootDir = path.resolve(import.meta.dirname || path.resolve(), '../../');
  const env = loadEnv(mode, rootDir, '');
  const apiTarget =
    env.VITE_API_TARGET ||
    process.env.VITE_API_TARGET ||
    env.APP_URL ||
    process.env.APP_URL ||
    env.SERVER_URL ||
    process.env.SERVER_URL ||
    'http://127.0.0.1:5000';
  const baseUrl = env.VITE_BASE_URL || process.env.VITE_BASE_URL || '/admin/';

  return {
    envDir: rootDir,
    base: baseUrl,
    plugins: [
      react(),
      {
        name: 'redirect-to-admin-base',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const url = req.url || '';
            if (
              !url.startsWith('/admin') &&
              (url.startsWith('/accept-invite') ||
                url.startsWith('/login') ||
                url.startsWith('/dashboard') ||
                url === '/')
            ) {
              const redirectPath = `/admin${url === '/' ? '/' : url}`;
              res.writeHead(302, { Location: redirectPath });
              res.end();
              return;
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || path.resolve(), './src'),
      },
    },
    server: {
      host: true,
      port: 5174,
      allowedHosts: true,
      hmr: process.env.CODESPACES
        ? {
            clientPort: 443,
          }
        : true,
      watch: {
        usePolling: true,
        interval: 1000,
        binaryInterval: 2000,
        ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/coverage/**'],
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
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts-vendor': ['recharts'],
          'icons-vendor': ['lucide-react'],
        },
      },
    },
  },
};
});

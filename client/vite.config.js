import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Bypass proxy for browser page navigations/refreshes requesting HTML (SPA fallback)
  const htmlBypass = (req) => {
    if (req.method === 'GET' && req.headers.accept && req.headers.accept.includes('text/html')) {
      return '/index.html';
    }
  };

  // Plugin to gracefully rewrite any lingering CRA %PUBLIC_URL% requests to root
  const publicUrlFallbackPlugin = {
    name: 'public-url-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.includes('%PUBLIC_URL%')) {
          req.url = req.url.replace('/%PUBLIC_URL%', '').replace('%PUBLIC_URL%', '');
        }
        next();
      });
    },
    transformIndexHtml(html) {
      return html.replace(/%PUBLIC_URL%/g, '');
    },
  };

  return {
    plugins: [react(), publicUrlFallbackPlugin],
    server: {
      port: 3000,
      open: false,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          bypass: htmlBypass,
        },
        '/auth': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          bypass: htmlBypass,
        },
        '/posts': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          bypass: htmlBypass,
        },
        '/user': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          bypass: htmlBypass,
        },
        '/upload': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          bypass: htmlBypass,
        },
        '/chat': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          bypass: htmlBypass,
        },
        '/message': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          bypass: htmlBypass,
        },
        '/stories': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          bypass: htmlBypass,
        },
        '/notifications': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          bypass: htmlBypass,
        },
        '/groups': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          bypass: htmlBypass,
        },
        '/images': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
    },
    envPrefix: ['VITE_', 'REACT_APP_'],
    define: {
      'process.env': {
        NODE_ENV: JSON.stringify(mode),
        REACT_APP_BACKEND_URL: JSON.stringify(env.REACT_APP_BACKEND_URL || 'http://localhost:5000'),
        REACT_APP_PUBLIC_FOLDER: JSON.stringify(env.REACT_APP_PUBLIC_FOLDER || 'http://localhost:5000/images/'),
        REACT_APP_SOCKET_URL: JSON.stringify(env.REACT_APP_SOCKET_URL || 'http://localhost:8800'),
        ...Object.keys(env)
          .filter((k) => k.startsWith('REACT_APP_'))
          .reduce((acc, k) => ({ ...acc, [k]: env[k] }), {}),
      },
      global: 'window',
    },
  };
});

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [

      {
        name: 'catch-vite-websocket-rejection',
        transformIndexHtml: {
          order: 'pre',
          handler() {
            return [
              {
                tag: 'script',
                attrs: { type: 'text/javascript' },
                injectTo: 'head-prepend',
                children: `
                  window.addEventListener('unhandledrejection', function(event) {
                    var reason = event.reason;
                    var msg = typeof reason === 'string' ? reason : (reason && reason.message) ? reason.message : '';
                    if (msg.includes('WebSocket') || msg.includes('vite')) {
                      event.preventDefault();
                      event.stopImmediatePropagation();
                    }
                  });
                  
                  // Also intercept console.error to avoid spam
                  var oErr = console.error;
                  console.error = function() {
                    if (arguments[0] && typeof arguments[0] === 'string' && arguments[0].includes('WebSocket')) return;
                    oErr.apply(console, arguments);
                  };
                `
              }
            ];
          }
        }
      },

      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "./src"),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) {
              return 'vendor-three';
            }
            if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas') || id.includes('node_modules/jspdf-autotable')) {
              return 'vendor-pdf';
            }
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
              return 'vendor-charts';
            }
            if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
              return 'vendor-maps';
            }
          }
        },
      },
    },
    server: {
      hmr: false,
      ws: false as const,
      watch: null,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        }
      }
    },
  };
});

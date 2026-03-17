import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const outDir = mode === 'app' ? 'dist-app' : mode === 'vitrine' ? 'dist-vitrine' : 'dist';

  return {
    plugins: [
      react(),
      // Bundle analyzer - génère stats.html après build
      visualizer({
        open: false,
        filename: `${outDir}/stats.html`,
        gzipSize: true,
        brotliSize: true,
      }),
      // PWA Configuration
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: mode === 'vitrine' ? 'Immo Showcase' : 'ImmoDash - Gestion Immobilière',
          short_name: mode === 'vitrine' ? 'ImmoShow' : 'ImmoDash',
          description: mode === 'vitrine' ? 'Découvrez nos biens immobiliers d\'exception' : 'Application de gestion immobilière professionnelle',
          theme_color: '#667eea',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          cacheId: 'immodash-v3',
          skipWaiting: true,
          clientsClaim: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              // index.html toujours récupéré depuis le réseau en priorité
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'navigation-cache',
                networkTimeoutSeconds: 5,
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] }
              }
            }
          ]
        }
      })
    ],
    // Supprimer console.log et debugger en production
    esbuild: {
      drop: ['console', 'debugger'],
    },
    build: {
      outDir,
      // Optimisations de build
      target: 'es2015',
      minify: 'esbuild',
      rollupOptions: {
        output: {
          // Code splitting manuel pour optimiser
          manualChunks: {
            // Vendor chunks
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['framer-motion', 'lucide-react'],
            'charts-vendor': ['recharts'],
            'maps-vendor': ['leaflet', 'react-leaflet'],
            'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          },
        },
      },
      // Augmenter la limite d'avertissement de taille de chunk
      chunkSizeWarningLimit: 1000,
    },
    // Optimisations de dev
    server: {
      port: 5173,
      strictPort: false,
      open: false,
    },
    // Optimiser les dépendances
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'framer-motion',
        'lucide-react',
      ],
    },
  };
});

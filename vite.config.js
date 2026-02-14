import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Bundle analyzer - génère stats.html après build
    visualizer({
      open: false,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    })
  ],
  // Supprimer console.log et debugger en production
  esbuild: {
    drop: ['console', 'debugger'],
  },
  build: {
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
});

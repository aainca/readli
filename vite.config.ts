import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'og.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Vowel Mastery',
        short_name: 'Vowels',
        description: 'Reading practice: read the word, earn stars.',
        theme_color: '#fff7ed',
        background_color: '#fff7ed',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // The offline voice engine chunk is about 6 MB; precache it so the app works offline.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,json,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/models\/.*\.tar\.gz$/i,
            handler: 'CacheFirst',
            options: { cacheName: 'voice-model', expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 7000 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

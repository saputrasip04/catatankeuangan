import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'],
      manifest: {
        name: 'Catatan Keuangan',
        short_name: 'Keuangan',
        description: 'Aplikasi Pencatatan Keuangan Pribadi Offline-First',
        lang: 'id',
        display: 'standalone',
        start_url: './',
        scope: './',
        theme_color: '#0f766e',
        background_color: '#ffffff',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: 'index.html',
        // Jangan cache request Apps Script
        navigateFallbackDenylist: [/script\.google\.com/, /script\.googleusercontent\.com/]
      }
    })
  ],
  test: {
    globals: true,
    environment: 'node'
  }
});

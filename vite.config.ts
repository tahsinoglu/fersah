import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  base: mode === 'preview-static' ? './' : '/',
  plugins: [
    react(),
    tailwindcss(),
    mode !== 'preview-static' &&
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.png', 'icons/icon.svg'],
        manifest: {
          name: 'Memleket & Cihan',
          short_name: 'Memleket',
          description: 'Türkiye ve dünya harita bilgisi oyunu',
          lang: 'tr',
          dir: 'ltr',
          start_url: '/memleket',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#f6f4ef',
          theme_color: '#f6f4ef',
          categories: ['education', 'games'],
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
          navigateFallback: '/index.html',
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        },
      }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
}));

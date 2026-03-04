/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'
import path from 'path'

const commitHash = execSync('git rev-parse --short HEAD').toString().trim()
const commitCount = execSync('git rev-list --count HEAD').toString().trim()
const now = new Date()
const appVersion = `${now.getFullYear()}.${now.getMonth() + 1}.${commitCount}`

export default defineConfig({
  base: '/',
  define: {
    __BUILD_HASH__: JSON.stringify(commitHash),
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['**/*.{webp,png,mp3,m4a,json}'],
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: 'Alchemy',
        short_name: 'Alchemy',
        description: 'Elemental card battler',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'landscape',
        theme_color: '#020617',
        background_color: '#020617',
        icons: [
          {
            src: 'pwa-192x192.webp',
            sizes: '192x192',
            type: 'image/webp',
            purpose: 'any maskable',
          },
          {
            src: 'pwa-512x512.webp',
            sizes: '512x512',
            type: 'image/webp',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@engine': path.resolve(__dirname, 'src/engine'),
      '@game': path.resolve(__dirname, 'src/game'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@storage': path.resolve(__dirname, 'src/storage'),
      '@network': path.resolve(__dirname, 'src/network'),
      '@audio': path.resolve(__dirname, 'src/audio'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})

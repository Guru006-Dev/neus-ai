/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API = `http://127.0.0.1:${process.env.NEXUS_API_PORT ?? 3000}`
const proxy = { '/workflows': API, '/system': API, '/api-key': API }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy },
  preview: { proxy },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'e2e/**/*.test.ts'],
    environment: 'node',
  },
})

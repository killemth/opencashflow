import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      reporter: ['text', 'html'],
      thresholds: {
        lines: 75,
        functions: 60,
        branches: 60,
        statements: 75,
      },
      include: [
        'src/lib/**/*.js',
        'src/lib/**/*.jsx',
        'src/pages/DashboardPage.jsx'
      ],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.config.*',
        'postcss.config.js',
        'tailwind.config.js',
      ],
    },
  },
})

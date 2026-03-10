import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// Absolute path to this package's node_modules so that test files
// living outside the package (e.g. ../../test/...) can still resolve
// dependencies like @testing-library/react.
function appModule(pkg: string)
{
  return path.resolve(__dirname, 'node_modules', pkg)
}
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    projects: [
      // ── Node project for server/API tests ─────────────────────────────────
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'src/**/*.test.ts',
            'src/**/*.spec.ts',
            '../../test/Server API Testing/User Server Testing/**/*.test.ts',
          ],
        },
      },

      // ── Component project for React/UI tests ──────────────────────────────
      {
        extends: true,
        plugins: [react()],
        test: {
          name: 'components',
          environment: 'happy-dom',
          pool: 'threads',
          include: [
            'src/**/*.test.tsx',
            '../../test/Component Tests/web-user/**/*.test.ts',
            '../../test/Component Tests/web-user/**/*.test.tsx',
          ],
        },
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './src'),
          },
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@testing-library/react': appModule('@testing-library/react'),
      '@testing-library/jest-dom': appModule('@testing-library/jest-dom'),
      '@testing-library/user-event': appModule('@testing-library/user-event'),
      'react': appModule('react'),
      'react-dom': appModule('react-dom'),
    },
  },
})
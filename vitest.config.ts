import { defineConfig } from 'vitest/config'

// Unit tests only. Kept apart from vite.config.ts: the dev container serves
// the working tree, and editing vite.config.ts restarts its dev server.
// `include` is narrow so Playwright specs (tests/e2e/*.spec.ts) never run here.
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts'],
    environment: 'node',
  },
})

import { defineConfig } from 'vitest/config';

// Tests never touch the network: adapters receive a stubbed fetch.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});

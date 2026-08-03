import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@engine': path.resolve(__dirname, 'src/engine'),
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@content': path.resolve(__dirname, 'src/content')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true
  }
});

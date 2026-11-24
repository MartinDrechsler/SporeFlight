import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  // avatars.html: a page that plays every avatar animation, for checking them by eye.
  build: { target: 'es2022', rollupOptions: { input: { main: 'index.html', avatars: 'avatars.html' } } },
  test: { include: ['tests/**/*.test.ts'] },
});

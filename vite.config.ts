import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// stat-lab.html is served as-is by the dev server (/stat-lab.html). It is not part of
// the production build yet; it uses a classic script that Vite does not bundle.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
  },
});

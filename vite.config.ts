import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Keep the React reader and the standalone character workshop in one static build.
      input: {
        app: 'index.html',
        statLab: 'stat-lab.html',
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});

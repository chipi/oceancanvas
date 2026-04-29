import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/data': 'http://localhost:8080',
      '/renders': 'http://localhost:8080',
      '/api': 'http://localhost:3001',
      '/sketches': 'http://localhost:8080',
      '/recipes': 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
});

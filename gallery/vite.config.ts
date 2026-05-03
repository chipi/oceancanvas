import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    fs: {
      allow: ['..'],  // allow serving audio/ from parent dir
    },
    proxy: {
      '/data': 'http://localhost:8080',
      '/renders': 'http://localhost:8080',
      '/api/export': 'http://localhost:3002',
      '/api': 'http://localhost:3001',
      '/sketches': 'http://localhost:8080',
      '/audio': 'http://localhost:8080',
      // Only proxy .yaml file requests, not React Router /recipes/:id routes
      '^/recipes/.+\\.yaml$': 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
});

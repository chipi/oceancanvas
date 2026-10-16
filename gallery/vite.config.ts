import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Model-B workspace ports come from the generated, git-ignored compose/.env
// (.config/workspace/README.md); a value set in the shell wins. Without the
// file, the repository defaults apply. When a workspace Vite port is set the
// server must not drift to another port, or the checkout's identity breaks.
const workspaceEnvDir = fileURLToPath(new URL('../compose', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, workspaceEnvDir, 'OC_');
  const port = (key: string, fallback: number) => Number(env[key] || fallback);
  const gallery = `http://localhost:${port('OC_GALLERY_PORT', 8080)}`;
  const recipeApi = `http://localhost:${port('OC_RECIPE_PORT', 3001)}`;
  const exportApi = `http://localhost:${port('OC_EXPORT_PORT', 3002)}`;

  return {
    plugins: [react()],
    server: {
      port: port('OC_VITE_PORT', 5173),
      strictPort: Boolean(env.OC_VITE_PORT),
      fs: {
        allow: ['..'],  // allow serving audio/ from parent dir
      },
      proxy: {
        '/data': gallery,
        '/renders': gallery,
        '/api/export': exportApi,
        '/api': recipeApi,
        '/sketches': gallery,
        '/audio': gallery,
        // Only proxy .yaml file requests, not React Router /recipes/:id routes
        '^/recipes/.+\\.yaml$': gallery,
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test-setup.ts',
    },
  };
});

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/dti-api': {
          target: `${env.VITE_SUPABASE_URL}/functions/v1`,
          changeOrigin: true,
        },
        '/excel-api': {
          target: `${env.VITE_SUPABASE_URL}/functions/v1`,
          changeOrigin: true,
        },
        '/global-api': {
          target: `${env.VITE_SUPABASE_URL}/functions/v1`,
          changeOrigin: true,
        },
      },
    },
  };
});

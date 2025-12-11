import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Declare process to avoid TypeScript errors when @types/node is missing
declare const process: any;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // This maps the process.env.API_KEY used in the source code
      // to the environment variable provided during build/runtime.
      // Use fallback to empty string to prevent JSON.stringify(undefined) error
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './tests/setup.ts',
    },
  };
});
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: '.',
  publicDir: './public',
  build: {
    outDir: './dist',
    emptyOutDir: true,
    rollupOptions: {
      input: './main.js',
    },
  },
  server: {
    watch: {
      usePolling: true,
      interval: 300,
    },
    host: '0.0.0.0'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './')
    }
  },
  optimizeDeps: {
    include: ['three', 'earcut']
  }
}); 
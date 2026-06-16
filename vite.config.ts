import { defineConfig } from 'vite';

export default defineConfig({
  root: 'client',
  server: {
    port: 41006,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:42006',
        changeOrigin: true
      }
    }
  }
});

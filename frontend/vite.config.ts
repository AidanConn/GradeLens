// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      // If frontend requests /api/*, forward to the FastAPI server
      '/api': {
        target: 'http://127.0.0.1:8000', // or wherever your FastAPI server runs
        changeOrigin: true,
        // (Optional) rewrite /api/* -> /* if your backend doesn’t expect ‘/api’
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});

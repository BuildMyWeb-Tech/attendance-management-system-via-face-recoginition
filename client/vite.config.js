import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  // Ensure sw.js and manifest.json are served at root — not transformed by Vite
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
});
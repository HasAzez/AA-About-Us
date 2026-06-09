import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: '.',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    allowedHosts: true,
  },
  preview: {
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      input: 'index.html',
    },
  },
});

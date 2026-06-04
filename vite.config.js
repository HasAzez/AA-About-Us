import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  preview: {
    // Coolify / sslip.io proxy hostnames (Vite blocks unknown Host headers by default)
    allowedHosts: ['.sslip.io', 'localhost'],
  },
  build: {
    rollupOptions: {
      input: 'index.html',
    },
  },
});

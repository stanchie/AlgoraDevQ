import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/static/dist/' : '/',
  plugins: [tailwindcss()],
  server: { proxy: { '/api': 'http://127.0.0.1:5000' } },
  build: {
    outDir: '../static/dist',
    emptyOutDir: true,
    rollupOptions: { input: { index: 'index.html', admin: 'admin.html' } },
  },
}));

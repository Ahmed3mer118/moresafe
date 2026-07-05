import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'charts';
            if (
              id.includes('react-dom') ||
              id.includes('react-router') ||
              id.includes('/react/') ||
              id.includes('scheduler')
            ) {
              return 'vendor-react';
            }
            if (id.includes('i18next')) return 'vendor-i18n';
            return 'vendor';
          }
          if (id.includes('/pages/admin/')) return 'pages-admin';
          if (id.includes('/pages/finance/')) return 'pages-finance';
          if (id.includes('/pages/project-manager/')) return 'pages-pm';
          if (id.includes('/pages/project-accountant/')) return 'pages-pa';
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});

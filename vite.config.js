import { fileURLToPath, URL } from 'url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

import svgLoader from 'vite-svg-loader';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), svgLoader()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    sourcemap: false,
    target: 'esnext',
    chunkSizeWarningLimit: '10mb',
    rollupOptions: {
      output: {
        manualChunks (id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }

          return null;
        },
      },
      onwarn (warning, warn) {
        // suppress eval warnings
        if (warning.code === 'EVAL') return;
        warn(warning);
      },
    },
  },
});

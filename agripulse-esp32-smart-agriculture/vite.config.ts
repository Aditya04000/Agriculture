import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Disable file watching to prevent HMR on database updates
      watch: {
        ignored: ['**/*.json', '**/sensor_telemetry_db.json'],
      },
      hmr: {
        overlay: false, // Hides error overlay if anything errors
      },
    },
  };
});
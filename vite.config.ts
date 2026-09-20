import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: true, // Listen on all local IPs so iPhone can open http://192.168.x.x:5173
    port: 5173,
  },
});

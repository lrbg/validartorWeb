import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Base path must match the GitHub repository name
  base: '/validartorWeb/',
  server: {
    port: 5173,
  },
});

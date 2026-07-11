import { defineConfig } from 'vite';
import React from '@vitejs/plugin-react';

const getBuildTime = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}${min}`;
};

export default defineConfig({
  server: {
    port: 3002
  },
  plugins: [React()],
  base: './',
  define: {
    __BUILD_TIME__: JSON.stringify(getBuildTime())
  },
  build: {
    outDir: 'dist'
  }
});

import { defineConfig } from 'vite';
import React from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [React()],
  base: './',
  build: {
    outDir: 'dist'
  }
});

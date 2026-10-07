import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// SINGLE=1 npm run build → tek dosyalık HTML (dist-single/index.html)
const single = process.env.SINGLE === '1';

export default defineConfig({
  base: './',               // her alt klasörde çalışır (ör. finvestima.com/valuator/)
  plugins: single ? [react(), viteSingleFile()] : [react()],
  build: single
    ? { outDir: 'dist-single', assetsInlineLimit: 100000000, chunkSizeWarningLimit: 5000 }
    : { outDir: 'dist', chunkSizeWarningLimit: 2500 },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import glsl from 'vite-plugin-glsl';
import path from 'node:path';
import { audioManifest } from './plugins/vite-plugin-audio-manifest';

// `base` lets the same build work on different hosts:
//   - Vercel / Netlify / preview ........... default "/"
//   - GitHub Pages at <user>.github.io/Energetic/ ... set VITE_BASE=/Energetic/
// The Pages workflow exports this env var; Vercel ignores it.
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [react(), glsl(), audioManifest()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});

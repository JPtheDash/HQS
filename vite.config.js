import { defineConfig } from 'vite';

// Minimal Vite setup for a Phaser game. `public/` is served at the web root,
// so anything under public/assets/... is reachable as /assets/... at runtime.
export default defineConfig({
  server: {
    host: true,
    port: 5173
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0
  }
});

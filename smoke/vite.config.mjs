import { defineConfig } from 'vite'

// Temporary config to bundle the logic smoke test for Node.
export default defineConfig({
  build: {
    ssr: 'smoke/smoke.js',
    outDir: 'smoke/dist',
    emptyOutDir: true,
    rollupOptions: { output: { format: 'es', entryFileNames: 'smoke.mjs' } },
  },
})

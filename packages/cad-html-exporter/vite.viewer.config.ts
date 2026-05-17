import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/AcExHtmlViewerRuntime.ts',
      name: 'AcExHtmlViewer',
      formats: ['iife'],
      fileName: () => 'viewer-runtime.iife.js'
    },
    minify: true,
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  }
})

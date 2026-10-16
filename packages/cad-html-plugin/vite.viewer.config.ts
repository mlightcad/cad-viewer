import { resolve } from 'path'
import { defineConfig } from 'vite'

const simpleViewerSrc = resolve(__dirname, '../cad-simple-viewer/src')

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@mlightcad/cad-html-core',
        replacement: resolve(__dirname, '../cad-html-core/src/index.ts')
      },
      {
        // Exact package name only — do not swallow `/icons` subpath imports.
        find: /^@mlightcad\/cad-simple-viewer$/,
        replacement: resolve(simpleViewerSrc, 'ui-html-entry.ts')
      },
      {
        find: '@mlightcad/cad-simple-viewer/icons',
        replacement: resolve(simpleViewerSrc, 'ui/icons.ts')
      }
    ]
  },
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

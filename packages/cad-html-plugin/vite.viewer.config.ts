import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      // Bundle toolbar chrome from source so Rollup tree-shakes dock/plugin code.
      '@mlightcad/cad-simple-ui-plugin/toolbar': resolve(
        __dirname,
        '../cad-simple-ui-plugin/src/toolbar.ts'
      ),
      '@mlightcad/cad-simple-ui-plugin/setup-toolbar': resolve(
        __dirname,
        '../cad-simple-ui-plugin/src/setupToolbar.ts'
      )
    }
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

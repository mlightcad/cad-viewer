import { resolve } from 'path'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig(() => {
  return {
    base: './',
    build: {
      modulePreload: false,
      rollupOptions: {
        // Main entry point for the app
        input: {
          main: resolve(__dirname, 'index.html')
        }
      }
    },
    plugins: [
      viteStaticCopy({
        targets: [
          {
            src: './node_modules/@mlightcad/data-model/dist/dxf-parser-worker.js',
            dest: 'assets'
          },
          {
            src: './node_modules/@mlightcad/cad-simple-viewer/dist/*-worker.js',
            dest: 'assets'
          }
        ]
      })
    ]
  }
})

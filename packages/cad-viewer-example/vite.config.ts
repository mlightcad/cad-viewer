import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { Alias, defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import svgLoader from 'vite-svg-loader'
import { visualizer } from 'rollup-plugin-visualizer'
import vue from '@vitejs/plugin-vue'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VIEWER_RUNTIME_SRC = '../cad-html-exporter/dist/viewer-runtime.iife.js'

export default defineConfig(({ command, mode }) => {
  if (!existsSync(resolve(__dirname, VIEWER_RUNTIME_SRC))) {
    throw new Error(
      'viewer-runtime.iife.js not found. Build @mlightcad/cad-html-exporter before cad-viewer-example.'
    )
  }
  const aliases: Alias[] = []
  if (command === 'serve') {
    aliases.push({
      find: /^@mlightcad\/(svg-renderer|three-renderer|cad-simple-viewer|cad-viewer)$/,
      replacement: resolve(__dirname, '../$1/src')
    })
  }

  const plugins = [
    vue(),
    svgLoader(),
    viteStaticCopy({
      targets: [
        {
          src: './node_modules/@mlightcad/data-model/dist/dxf-parser-worker.js',
          dest: 'assets'
        },
        {
          src: './node_modules/@mlightcad/cad-simple-viewer/dist/*-worker.js',
          dest: 'assets'
        },
        {
          src: VIEWER_RUNTIME_SRC,
          dest: 'assets'
        }
      ]
    })
  ]

  // Add conditional plugins
  if (mode === 'analyze') {
    plugins.push(visualizer())
  }

  return {
    base: './',
    resolve: {
      alias: aliases
    },
    optimizeDeps: {
      force: command === 'serve' // Force re-optimization in dev mode to fix stale cache issues
    },
    build: {
      outDir: 'dist',
      modulePreload: false,
      minify: true,
      rollupOptions: {
        // Main entry point for the app
        input: {
          main: resolve(__dirname, 'index.html')
        }
      }
    },
    plugins: plugins
  }
})

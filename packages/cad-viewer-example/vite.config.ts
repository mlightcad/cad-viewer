import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { Alias, defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import svgLoader from 'vite-svg-loader'
import { visualizer } from 'rollup-plugin-visualizer'
import vue from '@vitejs/plugin-vue'
import { exampleRollupOutput } from '../vite-config/pluginRollupOutput'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VIEWER_RUNTIME_SRC = '../cad-html-plugin/dist/viewer-runtime.iife.js'
const LOCAL_DATA_MODEL_LIB = resolve(
  __dirname,
  '../../../realdwg-web/packages/data-model/lib'
)
const LOCAL_DATA_MODEL_ENTRY = resolve(LOCAL_DATA_MODEL_LIB, 'index.js')

function useLocalDataModel(mode: string): boolean {
  if (mode === 'local-data-model') {
    return true
  }
  const flag = process.env.CAD_VIEWER_USE_LOCAL_DATA_MODEL
  return flag === '1' || flag?.toLowerCase() === 'true'
}

export default defineConfig(({ command, mode }) => {
  if (!existsSync(resolve(__dirname, VIEWER_RUNTIME_SRC))) {
    throw new Error(
      'viewer-runtime.iife.js not found. Build @mlightcad/cad-html-plugin before cad-viewer-example.'
    )
  }
  const aliases: Alias[] = []
  const devSourcePackages = [
    'cad-svg-plugin',
    'three-renderer',
    'cad-simple-viewer',
    'cad-viewer'
  ]
  const linkLocalDataModel =
    command === 'serve' &&
    useLocalDataModel(mode) &&
    existsSync(LOCAL_DATA_MODEL_ENTRY)
  if (command === 'serve') {
    aliases.push({
      find: /^@mlightcad\/(cad-svg-plugin|three-renderer|cad-simple-viewer|cad-viewer)$/,
      replacement: resolve(__dirname, '../$1/src')
    })
    if (linkLocalDataModel) {
      aliases.push({
        find: '@mlightcad/data-model',
        replacement: LOCAL_DATA_MODEL_LIB
      })
    } else if (useLocalDataModel(mode) && !existsSync(LOCAL_DATA_MODEL_ENTRY)) {
      console.warn(
        '[cad-viewer-example] Local data-model alias requested but not found at:',
        LOCAL_DATA_MODEL_ENTRY
      )
    }
  }

  const plugins = [
    vue(),
    svgLoader(),
    viteStaticCopy({
      targets: [
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
      force: command === 'serve', // Force re-optimization in dev mode to fix stale cache issues
      exclude:
        command === 'serve'
          ? [
              ...devSourcePackages.map(name => `@mlightcad/${name}`),
              ...(linkLocalDataModel ? ['@mlightcad/data-model'] : [])
            ]
          : []
    },
    build: {
      outDir: 'dist',
      modulePreload: false,
      minify: true,
      rollupOptions: {
        // Main entry point for the app
        input: {
          main: resolve(__dirname, 'index.html')
        },
        output: exampleRollupOutput
      }
    },
    plugins: plugins
  }
})

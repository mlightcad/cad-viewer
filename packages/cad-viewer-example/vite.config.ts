import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { Alias, defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import svgLoader from 'vite-svg-loader'
import { visualizer } from 'rollup-plugin-visualizer'
import vue from '@vitejs/plugin-vue'
import { exampleRollupOutput } from '../vite-config/pluginRollupOutput'
import {
  LIBREDWG_CONVERTER_PACKAGE,
  LIBREDWG_PARSER_WASM_FILE,
  LIBREDWG_PARSER_WORKER_FILE,
  MTEXT_RENDERER_WORKER_FILE
} from '../../tools/worker-assets.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VIEWER_RUNTIME_SRC = '../cad-html-plugin/dist/viewer-runtime.iife.js'
const LOCAL_DATA_MODEL_LIB = resolve(
  __dirname,
  '../../../realdwg-web/packages/data-model/lib'
)
const LOCAL_DATA_MODEL_ENTRY = resolve(LOCAL_DATA_MODEL_LIB, 'index.js')
const LOCAL_UI_COMPONENTS_SRC = resolve(
  __dirname,
  '../../../ui-components/packages/ui-components/src'
)
const LOCAL_UI_COMPONENTS_ROOT = resolve(
  __dirname,
  '../../../ui-components'
)

function isEnvFlagEnabled(name: string): boolean {
  const flag = process.env[name]
  return flag === '1' || flag?.toLowerCase() === 'true'
}

function useLocalDataModel(mode: string): boolean {
  return (
    mode === 'local-data-model' ||
    isEnvFlagEnabled('CAD_VIEWER_USE_LOCAL_DATA_MODEL')
  )
}

function useLocalUiComponents(mode: string): boolean {
  return (
    mode === 'local-ui-components' ||
    isEnvFlagEnabled('CAD_VIEWER_USE_LOCAL_UI_COMPONENTS')
  )
}

export default defineConfig(({ command, mode }) => {
  const hasViewerRuntime = existsSync(resolve(__dirname, VIEWER_RUNTIME_SRC))
  if (!hasViewerRuntime) {
    console.warn(
      '[cad-viewer-example] viewer-runtime.iife.js not found — HTML export will be unavailable. ' +
        'Build @mlightcad/cad-html-plugin to enable it. Opening DXF/DWG does not require this file.'
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
  const linkLocalUiComponents =
    command === 'serve' &&
    useLocalUiComponents(mode) &&
    existsSync(LOCAL_UI_COMPONENTS_SRC)
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
    if (linkLocalUiComponents) {
      console.info(
        '[cad-viewer-example] Aliasing @mlightcad/ui-components to local source:',
        LOCAL_UI_COMPONENTS_SRC
      )
      aliases.push({
        find: '@mlightcad/ui-components',
        replacement: LOCAL_UI_COMPONENTS_SRC
      })
    } else if (
      useLocalUiComponents(mode) &&
      !existsSync(LOCAL_UI_COMPONENTS_SRC)
    ) {
      console.warn(
        '[cad-viewer-example] Local ui-components alias requested but not found at:',
        LOCAL_UI_COMPONENTS_SRC
      )
    }
  }

  const libredwgDist = `./node_modules/${LIBREDWG_CONVERTER_PACKAGE}/dist`
  const libredwgWasmSrc = resolve(
    __dirname,
    'node_modules',
    LIBREDWG_CONVERTER_PACKAGE,
    'dist',
    LIBREDWG_PARSER_WASM_FILE
  )

  const plugins = [
    vue(),
    svgLoader(),
    viteStaticCopy({
      targets: [
        {
          src: `./node_modules/@mlightcad/cad-simple-viewer/dist/${MTEXT_RENDERER_WORKER_FILE}`,
          dest: 'assets',
          rename: { stripBase: true }
        },
        {
          src: `${libredwgDist}/${LIBREDWG_PARSER_WORKER_FILE}`,
          dest: 'assets',
          rename: { stripBase: true }
        },
        ...(existsSync(libredwgWasmSrc)
          ? [
              {
                src: `${libredwgDist}/${LIBREDWG_PARSER_WASM_FILE}`,
                dest: 'assets',
                rename: { stripBase: true }
              }
            ]
          : []),
        ...(hasViewerRuntime
          ? [
              {
                src: VIEWER_RUNTIME_SRC,
                dest: 'assets',
                rename: { stripBase: true }
              }
            ]
          : [])
      ]
    })
  ]

  if (mode === 'analyze') {
    plugins.push(visualizer())
  }

  return {
    base: './',
    resolve: {
      alias: aliases
    },
    optimizeDeps: {
      force: command === 'serve',
      exclude:
        command === 'serve'
          ? [
              ...devSourcePackages.map(name => `@mlightcad/${name}`),
              ...(linkLocalDataModel ? ['@mlightcad/data-model'] : []),
              ...(linkLocalUiComponents ? ['@mlightcad/ui-components'] : [])
            ]
          : []
    },
    server: {
      fs: {
        allow: [
          resolve(__dirname, '../..'),
          ...(linkLocalUiComponents ? [LOCAL_UI_COMPONENTS_ROOT] : [])
        ]
      }
    },
    build: {
      outDir: 'dist',
      modulePreload: false,
      minify: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        },
        output: exampleRollupOutput
      }
    },
    plugins: plugins
  }
})

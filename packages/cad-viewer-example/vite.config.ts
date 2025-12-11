import { resolve } from 'path'
import { Alias, defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import svgLoader from 'vite-svg-loader'
import { visualizer } from 'rollup-plugin-visualizer'
import vue from '@vitejs/plugin-vue'

import Unocss from 'unocss/vite'
import {
  presetAttributify,
  presetIcons,
  presetUno,
  transformerDirectives,
  transformerVariantGroup
} from 'unocss'

export default defineConfig(({ command, mode }) => {
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
    Unocss({
      presets: [
        presetUno(),
        presetAttributify(),
        presetIcons({
          scale: 1.2,
          warn: true
        })
      ],
      transformers: [transformerDirectives(), transformerVariantGroup()]
    }),
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

  // Add conditional plugins
  if (mode === 'analyze') {
    plugins.push(visualizer())
  }

  return {
    base: './',
    resolve: {
      alias: aliases
    },
    build: {
      outDir: 'dist',
      modulePreload: false,
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

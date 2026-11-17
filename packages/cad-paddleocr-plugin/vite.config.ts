import { resolve } from 'path'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import { defineConfig, PluginOption } from 'vite'

import {
  createLibChunkFileName,
  createLibEntryFileName
} from '../vite-config/pluginRollupOutput'

const packageName = '@mlightcad/cad-paddleocr-plugin'
const pluginId = 'cad-paddleocr-plugin'

/**
 * Modules the `/register` entry imports statically. Keeping them in the
 * register chunk stops it from importing the main chunk (and PaddleOCR.js)
 * at application start.
 */
const REGISTER_MODULE =
  /[\\/]src[\\/](register|constants|AcApPaddleOcrConfig)\.ts$|[\\/]src[\\/]i18n[\\/]/

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        register: resolve(__dirname, 'src/register.ts')
      },
      name: pluginId,
      fileName: (format, entryName) =>
        createLibEntryFileName(pluginId, format, entryName)
    },
    minify: true,
    rollupOptions: {
      // Self-import for lazy main load; keep the heavy OCR SDK out of our
      // published chunks so its worker/WASM URLs stay package-relative.
      external: [
        packageName,
        '@paddleocr/paddleocr-js',
        /^@paddleocr\/paddleocr-js\//,
        'onnxruntime-web',
        /^onnxruntime-web\//,
        '@techstark/opencv-js'
      ],
      output: {
        manualChunks: id =>
          REGISTER_MODULE.test(id) ? `${pluginId}-register` : pluginId,
        chunkFileNames: createLibChunkFileName(pluginId)
      }
    }
  },
  plugins: [peerDepsExternal() as PluginOption]
})

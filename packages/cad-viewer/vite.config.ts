import {
  defineConfig,
  type ConfigEnv,
  type LibraryFormats,
  PluginOption
} from 'vite'
import svgLoader from 'vite-svg-loader'
import { visualizer } from 'rollup-plugin-visualizer'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { libInjectCss } from 'vite-plugin-lib-inject-css'

export default defineConfig(({ mode }: ConfigEnv) => {
  const plugins: PluginOption[] = [
    vue() as PluginOption,
    svgLoader(),
    libInjectCss() as PluginOption,
    peerDepsExternal() as PluginOption,
    dts({
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts']
    }) as PluginOption
  ]

  if (mode === 'analyze') {
    plugins.push(visualizer())
  }

  return {
    outDir: 'dist',
    build: {
      lib: {
        entry: 'src/index.ts',
        name: 'cad-viewer',
        fileName: 'index',
        formats: ['es'] as LibraryFormats[]
      },
      minify: true
    },
    plugins
  }
})

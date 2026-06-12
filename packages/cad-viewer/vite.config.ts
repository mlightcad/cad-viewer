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
import { createLibEntryFileName } from '../vite-config/pluginRollupOutput'

const packageId = 'cad-viewer'

export default defineConfig(({ mode }: ConfigEnv) => {
  const plugins: PluginOption[] = [
    vue() as PluginOption,
    svgLoader(),
    libInjectCss() as PluginOption,
    peerDepsExternal() as PluginOption,
    dts({
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
      beforeWriteFile: (filePath, content) => {
        const normalized = filePath.replace(/\\/g, '/')
        if (normalized.endsWith('/dist/index.d.ts')) {
          return {
            filePath: filePath.replace(/index\.d\.ts$/, `${packageId}.d.ts`),
            content: content.replace(
              '//# sourceMappingURL=index.d.ts.map',
              `//# sourceMappingURL=${packageId}.d.ts.map`
            )
          }
        }
      }
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
        name: packageId,
        fileName: format => createLibEntryFileName(packageId, format),
        formats: ['es'] as LibraryFormats[]
      },
      minify: true,
      rollupOptions: {
        // PDF/HTML plugins are peers; loaded at runtime via dynamic import in registerLazyPlugins
        external: [
          '@mlightcad/cad-pdf-plugin',
          '@mlightcad/cad-html-plugin',
          '@mlightcad/cad-svg-plugin'
        ],
        output: {
          chunkFileNames: `${packageId}-[name]-[hash].js`,
          assetFileNames: `${packageId}[extname]`
        }
      }
    },
    plugins
  }
})

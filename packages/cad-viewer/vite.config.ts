import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
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
const require = createRequire(import.meta.url)
/** Prefer package sources so unused exports (e.g. MlToolBar) can tree-shake. */
const uiComponentsSrc = resolve(
  dirname(require.resolve('@mlightcad/ui-components/package.json')),
  'src/index.ts'
)

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
    resolve: {
      alias: [
        {
          // ui-components' published `module` is a single prebundled file that
          // always injects MlToolBar CSS. Point at sources so Rollup can drop it.
          find: /^@mlightcad\/ui-components$/,
          replacement: uiComponentsSrc
        }
      ]
    },
    build: {
      lib: {
        entry: 'src/index.ts',
        name: packageId,
        fileName: format => createLibEntryFileName(packageId, format),
        formats: ['es'] as LibraryFormats[]
      },
      minify: true,
      rollupOptions: {
        // PDF/HTML/SVG/Agent plugins are peers; loaded at runtime via dynamic import
        external: [
          '@mlightcad/cad-pdf-plugin',
          '@mlightcad/cad-html-plugin',
          '@mlightcad/cad-svg-plugin',
          '@mlightcad/cad-agent-plugin',
          '@mlightcad/cad-agent-plugin/register',
          '@mlightcad/cad-agent-plugin/style.css'
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

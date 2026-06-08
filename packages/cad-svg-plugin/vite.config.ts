import { resolve } from 'path'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import { defineConfig, PluginOption } from 'vite'

const packageName = '@mlightcad/cad-svg-plugin'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        register: resolve(__dirname, 'src/register.ts')
      },
      name: 'cad-svg-plugin',
      fileName: (format, entryName) =>
        format === 'es' ? `${entryName}.js` : `${entryName}.umd.cjs`
    },
    minify: true,
    rollupOptions: {
      external: [packageName]
    }
  },
  plugins: [peerDepsExternal() as PluginOption]
})

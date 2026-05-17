import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import { defineConfig, PluginOption } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: 'src/index.ts',
      name: 'cad-html-exporter',
      fileName: 'index'
    },
    minify: true
  },
  plugins: [peerDepsExternal() as PluginOption]
})

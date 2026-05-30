import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import { defineConfig, PluginOption } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    // Keep false so parallel builds (nx run-many + example prebuild) do not
    // delete viewer-runtime.iife.js produced by a concurrent viewer build.
    emptyOutDir: false,
    lib: {
      entry: 'src/index.ts',
      name: 'cad-html-plugin',
      fileName: 'index'
    },
    minify: true
  },
  plugins: [peerDepsExternal() as PluginOption]
})

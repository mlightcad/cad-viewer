import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/index.ts',
      name: 'libdxfrw-converter',
      fileName: 'libdxfrw-converter'
    }
  },
  plugins: [peerDepsExternal()]
})

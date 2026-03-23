import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/index.ts',
      name: 'geometry-engine',
      fileName: 'geometry-engine'
    }
  },
  plugins: [peerDepsExternal()]
})

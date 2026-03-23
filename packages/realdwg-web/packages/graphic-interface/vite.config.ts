import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true,
    lib: {
      entry: 'src/index.ts',
      name: 'graphic-interface',
      fileName: 'graphic-interface'
    }
  },
  plugins: [peerDepsExternal()]
})

import { resolve } from 'path'
import { existsSync } from 'fs'
import { Alias, defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import svgLoader from 'vite-svg-loader'
import { visualizer } from 'rollup-plugin-visualizer'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ command, mode }) => {
  const aliases: Alias[] = []
  if (command === 'serve') {
    aliases.push({
      find: /^@mlightcad\/(svg-renderer|three-renderer|cad-simple-viewer|cad-viewer)$/,
      replacement: resolve(__dirname, '../$1/src')
    })
    // Map realdew-web/realdwg-web packages to source for debugging
    const realdewWebPath = resolve(__dirname, '../../../realdew-web')
    const realdwgWebPath = resolve(__dirname, '../../../realdwg-web')
    
    // Try realdew-web first, then fallback to realdwg-web
    if (existsSync(realdewWebPath)) {
      aliases.push({
        find: /^@mlightcad\/libredwg-converter$/,
        replacement: resolve(realdewWebPath, 'packages/libredwg-converter/src')
      })
    } else if (existsSync(realdwgWebPath)) {
      aliases.push({
        find: /^@mlightcad\/libredwg-converter$/,
        replacement: resolve(realdwgWebPath, 'packages/libredwg-converter/src')
      })
    }
  }

  const plugins = [
    vue(),
    svgLoader(),
    viteStaticCopy({
      targets: [
        {
          src: './node_modules/@mlightcad/data-model/dist/dxf-parser-worker.js',
          dest: 'assets'
        },
        {
          src: './node_modules/@mlightcad/cad-simple-viewer/dist/*-worker.js',
          dest: 'assets'
        }
      ]
    })
  ]

  // Add conditional plugins
  if (mode === 'analyze') {
    plugins.push(visualizer())
  }

  return {
    base: './',
    resolve: {
      alias: aliases
    },
    build: {
      outDir: 'dist',
      modulePreload: false,
      sourcemap: true, // Enable source maps for debugging
      rollupOptions: {
        // Main entry point for the app
        input: {
          main: resolve(__dirname, 'index.html')
        }
      }
    },
    server: {
      sourcemapIgnoreList: false // Don't ignore source maps from node_modules
    },
    plugins: plugins
  }
})

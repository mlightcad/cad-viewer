import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

declare global {
  interface Window {
    exportCadToHtml: (
      fileName: string,
      bytes: Uint8Array,
      options?: {
        locale?: string
        title?: string
        exportInvisibleLayers?: boolean
        initialView?: 'fit' | 'current'
      }
    ) => Promise<string>
  }
}

export interface ExportToHtmlOptions {
  outputPath?: string
  locale?: string
  title?: string
  exportInvisibleLayers?: boolean
  initialView?: 'fit' | 'current'
}

function runnerDistDir(): string {
  const packageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..'
  )
  return path.join(packageRoot, 'dist-runner')
}

function startStaticServer(root: string): Promise<{
  url: string
  close: () => Promise<void>
}> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0])
        const relative =
          urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '')
        const filePath = path.join(root, relative)

        if (!filePath.startsWith(root)) {
          res.writeHead(403)
          res.end()
          return
        }

        if (!existsSync(filePath)) {
          res.writeHead(404)
          res.end()
          return
        }

        const ext = path.extname(filePath).toLowerCase()
        const types: Record<string, string> = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'text/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.json': 'application/json',
          '.wasm': 'application/wasm'
        }
        res.setHeader('Content-Type', types[ext] ?? 'application/octet-stream')
        void readFile(filePath).then(body => {
          res.writeHead(200)
          res.end(body)
        })
      } catch (error) {
        res.writeHead(500)
        res.end(String(error))
      }
    })

    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to start static server for export runner.'))
        return
      }
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close(err => (err ? closeReject(err) : closeResolve()))
          })
      })
    })
  })
}

/**
 * Opens a DXF/DWG in headless Chromium and writes offline HTML (same pipeline as the browser).
 */
export async function exportToHtml(
  inputPath: string,
  options: ExportToHtmlOptions = {}
): Promise<string> {
  const absoluteInput = path.resolve(inputPath)
  const ext = path.extname(absoluteInput).toLowerCase()
  if (ext !== '.dxf' && ext !== '.dwg') {
    throw new Error(
      `Unsupported file type "${ext}". Only .dxf and .dwg are supported.`
    )
  }

  const outputPath =
    options.outputPath ?? absoluteInput.replace(/\.(dwg|dxf)$/i, '.html')

  const runnerDir = runnerDistDir()
  if (!existsSync(path.join(runnerDir, 'index.html'))) {
    throw new Error(
      'Export runner is not built. Run "pnpm --filter @mlightcad/cad-html-exporter-cli build".'
    )
  }

  const fileName = path.basename(absoluteInput)
  const fileBytes = await readFile(absoluteInput)
  const base64 = fileBytes.toString('base64')

  const server = await startStaticServer(runnerDir)
  const browser = await chromium.launch({ headless: true })

  try {
    const page = await browser.newPage()
    await page.goto(`${server.url}/index.html`, { waitUntil: 'networkidle' })

    const html = await page.evaluate(
      async ({
        name,
        data,
        locale,
        title,
        exportInvisibleLayers,
        initialView
      }) => {
        const binary = atob(data)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i)
        }
        return window.exportCadToHtml(name, bytes, {
          locale,
          title,
          exportInvisibleLayers,
          initialView
        })
      },
      {
        name: fileName,
        data: base64,
        locale: options.locale,
        title: options.title ?? fileName,
        exportInvisibleLayers: options.exportInvisibleLayers,
        initialView: options.initialView
      }
    )

    await writeFile(outputPath, html, 'utf8')
    return outputPath
  } finally {
    await browser.close()
    await server.close()
  }
}

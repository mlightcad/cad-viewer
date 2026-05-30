import { packHtml, AcApHtmlSnapshotBuilder } from '@mlightcad/cad-html-plugin'
import { AcApDocManager, AcEdOpenMode } from '@mlightcad/cad-simple-viewer'

declare global {
  interface Window {
    exportCadToHtml: (
      fileName: string,
      bytes: Uint8Array,
      options?: { locale?: string; title?: string }
    ) => Promise<string>
  }
}

let ready = false

async function ensureViewer(): Promise<void> {
  if (ready) {
    return
  }
  const container = document.getElementById('cad-root') as HTMLDivElement
  AcApDocManager.createInstance({
    container,
    width: 1280,
    height: 720,
    autoResize: false,
    baseUrl: 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/',
    useMainThreadDraw: true,
    webworkerFileUrls: {
      dxfParser: './workers/dxf-parser-worker.js',
      dwgParser: './workers/libredwg-parser-worker.js',
      mtextRender: './workers/mtext-renderer-worker.js'
    }
  })
  ready = true
}

window.exportCadToHtml = async (fileName, bytes, options = {}) => {
  await ensureViewer()
  const docManager = AcApDocManager.instance
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  )

  const opened = await docManager.openDocument(fileName, buffer, {
    mode: AcEdOpenMode.Read
  })
  if (!opened) {
    throw new Error(`Failed to open "${fileName}".`)
  }

  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

  const view = docManager.curView
  const snapshot = await new AcApHtmlSnapshotBuilder().buildAsync(
    view.cadScene,
    docManager.curDocument.database,
    {
      title: options.title ?? fileName,
      background: view.backgroundColor,
      locale: options.locale
    }
  )

  const runtimeResponse = await fetch('./viewer-runtime.iife.js')
  if (!runtimeResponse.ok) {
    throw new Error(
      'viewer-runtime.iife.js is missing from the export runner build.'
    )
  }
  const viewerRuntime = await runtimeResponse.text()

  return packHtml(snapshot, {
    title: snapshot.meta.title,
    viewerRuntime
  })
}

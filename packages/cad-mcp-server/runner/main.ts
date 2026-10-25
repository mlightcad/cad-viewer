import {
  createCadToolCatalog,
  createDocManagerSession,
  type ToolResult
} from '@mlightcad/cad-agent-core'
import {
  AcApDocManager,
  AcApOpenViewMode,
  AcEdOpenMode,
  AcTrView2d,
  LIBREDWG_PARSER_WORKER_FILE,
  MTEXT_RENDERER_WORKER_FILE
} from '@mlightcad/cad-simple-viewer'
import {
  accmYieldForPaint,
  AcDbDatabaseConverterManager,
  AcDbFileType
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'

/** Max time to wait for convert + deferred font/text geometry after open. */
const SCENE_IDLE_TIMEOUT_MS = 120_000

export type CadMcpOpenMode = 'read' | 'write'

export interface CadMcpOpenDrawingArgs {
  fileName?: string | null
  drawingUrl?: string | null
  mode?: CadMcpOpenMode
  startBlank?: boolean
  baseUrl?: string
}

export interface CadMcpOpenDrawingResult {
  ok: true
  title: string
  mode: CadMcpOpenMode
}

export interface CadMcpExecuteScriptArgs {
  code: string
  intent?: string
}

declare global {
  interface Window {
    __cadMcp: {
      ensureReady: (options?: { baseUrl?: string }) => Promise<void>
      openDrawing: (
        args: CadMcpOpenDrawingArgs
      ) => Promise<CadMcpOpenDrawingResult>
      executeCadScript: (args: CadMcpExecuteScriptArgs) => Promise<ToolResult>
    }
  }
}

let ready = false

/**
 * Waits until the active view finishes entity conversion and glyph geometry.
 */
async function waitForSceneIdle(timeoutMs = SCENE_IDLE_TIMEOUT_MS) {
  const view = AcApDocManager.instance.curView
  if (!(view instanceof AcTrView2d)) {
    return
  }
  const idle = await view.waitUntilIdle(timeoutMs)
  if (!idle) {
    console.warn(
      '[cad-mcp-server] Timed out waiting for scene idle; continuing'
    )
  }
  await accmYieldForPaint()
}

async function ensureViewer(options: { baseUrl?: string } = {}): Promise<void> {
  if (ready) {
    return
  }

  const container = document.getElementById('cad-root') as HTMLDivElement
  const dwgParserUrl = `./workers/${LIBREDWG_PARSER_WORKER_FILE}`
  AcDbDatabaseConverterManager.instance.register(
    AcDbFileType.DWG,
    new AcDbLibreDwgConverter({
      convertByEntityType: false,
      useWorker: true,
      parserWorkerUrl: dwgParserUrl
    })
  )
  AcApDocManager.createInstance({
    container,
    width: container.clientWidth || 1280,
    height: container.clientHeight || 720,
    autoResize: true,
    ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
    useMainThreadDraw: true,
    webworkerFileUrls: {
      dwgParser: dwgParserUrl,
      mtextRender: `./workers/${MTEXT_RENDERER_WORKER_FILE}`
    }
  })

  ready = true
  console.log('[cad-mcp-server] viewer ready')
}

function resolveOpenMode(mode?: CadMcpOpenMode): AcEdOpenMode {
  return mode === 'read' ? AcEdOpenMode.Read : AcEdOpenMode.Write
}

window.__cadMcp = {
  ensureReady: ensureViewer,

  async openDrawing(args) {
    await ensureViewer({ baseUrl: args.baseUrl })
    const docManager = AcApDocManager.instance
    const mode = args.mode ?? (args.drawingUrl ? 'read' : 'write')
    const openOptions = {
      mode: resolveOpenMode(mode),
      openViewMode: AcApOpenViewMode.Extents,
      progressiveRendering: false,
      convertInvisibleLayers: true,
      convertAllLayouts: true,
      skipSpatialIndex: true,
      cooperativeYield: false
    }

    const hasDrawing = !!(args.drawingUrl && args.fileName)
    if (hasDrawing) {
      const response = await fetch(args.drawingUrl!)
      if (!response.ok) {
        throw new Error(
          `Failed to fetch drawing "${args.fileName}" (${response.status}).`
        )
      }
      const buffer = await response.arrayBuffer()
      const opened = await docManager.openDocument(
        args.fileName!,
        buffer,
        openOptions
      )
      if (!opened) {
        throw new Error(`Failed to open "${args.fileName}".`)
      }
    } else if (args.startBlank !== false) {
      const created = await docManager.newDocument({
        ...openOptions,
        mode: AcEdOpenMode.Write
      })
      if (!created) {
        throw new Error('Failed to create a blank drawing.')
      }
    } else {
      throw new Error('open_drawing requires a path or startBlank.')
    }

    await waitForSceneIdle()
    const doc = docManager.curDocument
    const title = doc?.docTitle || doc?.fileName || args.fileName || 'untitled'
    return { ok: true, title: String(title), mode }
  },

  async executeCadScript(args) {
    await ensureViewer()
    if (!AcApDocManager.instance?.curDocument) {
      // Start a blank write drawing so agents can draw without an explicit open.
      await window.__cadMcp.openDrawing({ startBlank: true, mode: 'write' })
    }
    const catalog = createCadToolCatalog(createDocManagerSession(), {
      allowPreviewCapture: true,
      // Large DWGs need more than the default 2s / 100k-tick budget.
      scriptLimits: { maxTicks: 10_000_000, maxMilliseconds: 600_000 }
    })
    const tool = catalog.find(t => t.name === 'execute_cad_script')
    if (!tool) {
      throw new Error('execute_cad_script missing from cad-agent-core catalog')
    }
    return (await tool.execute(args)) as ToolResult
  }
}

void ensureViewer().catch(error => {
  console.error('[cad-mcp-server] failed to boot viewer', error)
})

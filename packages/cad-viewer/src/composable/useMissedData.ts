import {
  AcApDocManager,
  AcApSettingManager,
  eventBus
} from '@mlightcad/cad-simple-viewer'
import { AcDbObjectId } from '@mlightcad/data-model'
import { reactive } from 'vue'

/**
 * Missed Data Composable
 *
 * Tracks fonts, raster images, and unresolved xrefs that the current drawing
 * references but that are missing. State is shared module-wide so every caller
 * sees the same reactive maps (status-bar warning, Resources palette).
 */

/**
 * One unresolved external reference reported by the viewer.
 */
export interface MissedXrefInfo {
  name: string
  pathName: string
  isOverlay: boolean
}

/**
 * One row in the missed-image replacement table.
 */
export interface ImageMappingData {
  /** File name reported by the viewer for the missing image resource. */
  fileName: string
  /**
   * User-selected replacement file, set by the replacement dialog before confirm.
   * Undefined until the user picks a file.
   */
  file?: File
  /**
   * File name of the replacement {@link file} (browsers do not expose absolute paths).
   */
  filePath?: string
  /** Entity object IDs whose raster image reference resolves to {@link fileName}. */
  ids: Set<AcDbObjectId>
}

/**
 * Loaded overlay state keyed by xref block name.
 */
export interface XrefOverlayState {
  overlayId: string
  visible: boolean
  /** File name of the loaded source. */
  sourceName: string
}

/**
 * Reactive state returned by {@link useMissedData}.
 */
export interface UseMissedDataReturn {
  fonts: Map<string, string>
  images: Map<string, ImageMappingData>
  /** Unresolved xrefs from the active drawing */
  xrefs: MissedXrefInfo[]
  /** Overlay load state per xref block name */
  xrefOverlays: Map<string, XrefOverlayState>
}

const fontMapping = reactive(new Map<string, string>())
const imageData = reactive(new Map<string, ImageMappingData>())
const xrefList = reactive<MissedXrefInfo[]>([])
const xrefOverlays = reactive(new Map<string, XrefOverlayState>())

let initialized = false

function buildImageMapping(
  missedImages: Map<AcDbObjectId, string>,
  previousImages?: Map<string, ImageMappingData>
): Map<string, ImageMappingData> {
  const next = new Map<string, ImageMappingData>()
  const previousById = new Map<AcDbObjectId, ImageMappingData>()
  if (previousImages) {
    for (const row of previousImages.values()) {
      for (const id of row.ids) {
        previousById.set(id, row)
      }
    }
  }

  for (const [objectId, fileName] of missedImages) {
    const existing = next.get(fileName)
    if (existing) {
      existing.ids.add(objectId)
      // Prefer a previously captured replacement path if this row lacks one.
      if (!existing.file) {
        const previous = previousById.get(objectId)
        if (previous?.file) {
          existing.file = previous.file
          existing.filePath = previous.filePath
        }
      }
    } else {
      // Keep a previously picked replacement across missed-data syncs.
      // Match by original fileName first, then by entity id (name may change
      // after updating image-def sourceFileName).
      const previous =
        previousImages?.get(fileName) ?? previousById.get(objectId)
      next.set(fileName, {
        fileName,
        file: previous?.file,
        filePath: previous?.filePath,
        ids: new Set([objectId])
      })
    }
  }

  return next
}

function readMissedXrefs(missedData: {
  fonts: Record<string, number>
  images: Map<string, string>
  xrefs?: MissedXrefInfo[]
}): MissedXrefInfo[] {
  return missedData.xrefs ?? []
}

function syncFromCurrentView(): void {
  try {
    const view = AcApDocManager.instance?.curView
    if (!view) return

    const missedData = view.missedData as {
      fonts: Record<string, number>
      images: Map<string, string>
      xrefs?: MissedXrefInfo[]
    }
    const storedFontMapping = AcApSettingManager.instance.fontMapping

    fontMapping.clear()
    for (const missedFont of Object.keys(missedData.fonts ?? {})) {
      fontMapping.set(missedFont, storedFontMapping[missedFont] ?? '')
    }

    const previousImages = new Map(imageData)
    imageData.clear()
    const grouped = buildImageMapping(
      missedData.images ?? new Map(),
      previousImages
    )
    for (const [fileName, row] of grouped) {
      imageData.set(fileName, row)
    }

    const nextXrefs = readMissedXrefs(missedData)
    xrefList.splice(0, xrefList.length, ...nextXrefs)

    // Drop overlay geometry + state for xrefs that no longer exist in the drawing
    const names = new Set(nextXrefs.map(x => x.name))
    const docManager = AcApDocManager.instance
    for (const name of [...xrefOverlays.keys()]) {
      if (names.has(name)) continue
      const state = xrefOverlays.get(name)
      if (state?.overlayId) {
        docManager.removeOverlay(state.overlayId)
      }
      xrefOverlays.delete(name)
    }
  } catch {
    // Viewer may not be fully initialized yet; keep previous state.
  }
}

function ensureInitialized(): void {
  if (initialized) return
  initialized = true

  AcApDocManager.instance.events.documentActivated.addEventListener(() => {
    xrefOverlays.clear()
    imageData.clear()
    syncFromCurrentView()
  })

  eventBus.on('font-not-found', () => {
    syncFromCurrentView()
  })

  eventBus.on('missed-data-changed', () => {
    syncFromCurrentView()
  })

  syncFromCurrentView()
}

/**
 * Access shared reactive state for missing fonts, images, and xrefs.
 */
export function useMissedData(): UseMissedDataReturn {
  ensureInitialized()

  return {
    fonts: fontMapping,
    images: imageData,
    xrefs: xrefList,
    xrefOverlays
  }
}

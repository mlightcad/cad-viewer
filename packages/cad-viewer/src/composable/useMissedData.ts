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
 * Tracks fonts and raster images that the current drawing references but that are
 * missing on disk or unavailable to the renderer. State is shared module-wide so
 * every caller sees the same reactive maps (for example the status-bar warning
 * button and the replacement dialog).
 *
 * Data is synchronized from {@link AcApDocManager.instance.curView.missedData}
 * and persisted font substitutions from
 * {@link AcApSettingManager.instance.fontMapping}. Consumers may mutate the
 * returned maps (choose replacement fonts, attach image files) before applying
 * changes through the replacement dialog.
 *
 * @example
 * ```typescript
 * import { useMissedData } from '@mlightcad/cad-viewer'
 *
 * const { fonts, images } = useMissedData()
 *
 * if (fonts.size > 0) {
 *   console.log('Missing fonts:', [...fonts.keys()])
 * }
 *
 * images.forEach((row, fileName) => {
 *   console.log(fileName, 'affects', row.ids.size, 'entities')
 * })
 * ```
 */

/**
 * One row in the missed-image replacement table.
 *
 * Multiple drawing entities can reference the same missing image file; they are
 * grouped under a single row keyed by {@link fileName}.
 */
export interface ImageMappingData {
  /** File name reported by the viewer for the missing image resource. */
  fileName: string
  /**
   * User-selected replacement file, set by the replacement dialog before confirm.
   * Undefined until the user picks a file.
   */
  file?: File
  /** Entity object IDs whose raster image reference resolves to {@link fileName}. */
  ids: Set<AcDbObjectId>
}

/**
 * Reactive state returned by {@link useMissedData}.
 */
export interface UseMissedDataReturn {
  /**
   * Missed font name → replacement font name.
   *
   * Keys come from the active view's missed-font list. Values are initialized from
   * application settings; an empty string means no replacement has been chosen yet.
   */
  fonts: Map<string, string>
  /**
   * Missed image file name → grouped mapping row.
   *
   * Keys are image resource names from the drawing. Values aggregate all entities
   * that reference that resource.
   */
  images: Map<string, ImageMappingData>
}

/** Shared reactive font substitutions (missed name → replacement name). */
const fontMapping = reactive(new Map<string, string>())

/** Shared reactive missed-image rows keyed by file name. */
const imageData = reactive(new Map<string, ImageMappingData>())

/** Whether document and event-bus listeners have been registered. */
let initialized = false

/**
 * Builds image table rows from the view's missed-image map.
 *
 * @param missedImages - Map from entity object id to image file name (as reported by the renderer).
 * @returns New map keyed by file name with entity ids grouped per file.
 */
function buildImageMapping(
  missedImages: Map<AcDbObjectId, string>
): Map<string, ImageMappingData> {
  const next = new Map<string, ImageMappingData>()

  for (const [objectId, fileName] of missedImages) {
    const existing = next.get(fileName)
    if (existing) {
      existing.ids.add(objectId)
    } else {
      next.set(fileName, {
        fileName,
        ids: new Set([objectId])
      })
    }
  }

  return next
}

/**
 * Replaces module state with missed data from the active document view.
 *
 * Clears and repopulates {@link fontMapping} and {@link imageData}. Font values
 * prefer entries in {@link AcApSettingManager.instance.fontMapping}; otherwise
 * they default to an empty string.
 */
function syncFromCurrentView(): void {
  const missedData = AcApDocManager.instance.curView.missedData
  const storedFontMapping = AcApSettingManager.instance.fontMapping

  fontMapping.clear()
  for (const missedFont of Object.keys(missedData.fonts)) {
    fontMapping.set(missedFont, storedFontMapping[missedFont] ?? '')
  }

  imageData.clear()
  const grouped = buildImageMapping(missedData.images)
  for (const [fileName, row] of grouped) {
    imageData.set(fileName, row)
  }
}

/**
 * Registers one-time listeners and performs the initial sync.
 *
 * Listens for document activation, {@link eventBus} `font-not-found`, and
 * `missed-data-changed` so UI stays aligned with the renderer and user replacements.
 */
function ensureInitialized(): void {
  if (initialized) return
  initialized = true

  AcApDocManager.instance.events.documentActivated.addEventListener(() => {
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
 * Access shared reactive state for missing fonts and images in the current drawing.
 *
 * Safe to call from multiple components; initialization and event wiring run once.
 *
 * @returns Reactive maps for the replacement dialog and warning affordances.
 */
export function useMissedData(): UseMissedDataReturn {
  ensureInitialized()

  return {
    fonts: fontMapping,
    images: imageData
  }
}

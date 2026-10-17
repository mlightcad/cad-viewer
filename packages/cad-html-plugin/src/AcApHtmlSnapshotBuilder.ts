import {
  type AcExBuildSnapshotOptions,
  type AcExExportSceneInput,
  acexGetDocsBaseUrl,
  type AcExInitialViewMode,
  acexSetDocsBaseUrl,
  type AcExSnapshot,
  type AcExViewerMode,
  type AcExViewState,
  buildSnapshotFromExportScene,
  buildSnapshotFromExportSceneAsync,
  listDatabaseLayouts} from '@mlightcad/cad-html-core'
import {
  acapGetDocsBaseUrl,
  AcApI18n,
  type AcTrScene
} from '@mlightcad/cad-simple-viewer'
import { accmYieldForPaint, type AcDbDatabase } from '@mlightcad/data-model'

/**
 * Optional overrides applied when constructing an HTML export snapshot.
 */
export interface AcApHtmlSnapshotBuilderOptions {
  /**
   * Human-readable drawing title stored in snapshot metadata and used as the
   * HTML document title when not overridden by the packager.
   */
  title?: string
  /**
   * Canvas background color as a 24-bit RGB integer (e.g. `0x000000`).
   * Defaults to the value from viewer metadata when omitted.
   */
  background?: number
  /**
   * UI locale embedded in the exported HTML for i18n (`en`, `zh`, etc.).
   * Defaults to {@link AcApI18n.currentLocale} when omitted.
   */
  locale?: string
  /**
   * When `false`, geometry and layer-table entries for off/frozen layers are
   * omitted from the snapshot. Defaults to `true`.
   */
  exportInvisibleLayers?: boolean
  /**
   * When `false`, only model space is written into the snapshot. Defaults to
   * `true`.
   */
  exportLayouts?: boolean
  /**
   * Initial framing when the exported HTML is opened. Defaults to `'fit'`.
   */
  initialView?: AcExInitialViewMode
  /**
   * Saved view center and zoom when {@link AcApHtmlSnapshotBuilderOptions.initialView}
   * is `'current'`.
   */
  viewState?: AcExViewState
  /**
   * Offline viewer capability profile. When `'view'`, OSNAP catalogs are omitted.
   */
  viewerMode?: AcExViewerMode
  /**
   * Canvas width/height used when resolving model-space VPORT `*ACTIVE` into
   * layout `savedView`. Defaults to 16:9 when omitted.
   */
  canvasAspectRatio?: number
}

export { listDatabaseLayouts }

/**
 * Serializes the live Three.js scene into a versioned {@link AcExSnapshot}.
 *
 * Maps {@link AcTrScene} into the scene-agnostic core builder so packing stays
 * shared with the headless exporter.
 */
export class AcApHtmlSnapshotBuilder {
  /**
   * Builds a snapshot synchronously in one pass.
   *
   * Prefer {@link buildAsync} for interactive export so the UI can stay responsive.
   */
  build(
    scene: AcTrScene,
    database: AcDbDatabase,
    options: AcApHtmlSnapshotBuilderOptions = {}
  ): AcExSnapshot {
    return buildSnapshotFromExportScene(
      database,
      mapAcTrSceneToExportInput(scene),
      toCoreOptions(options)
    )
  }

  /**
   * Builds a snapshot incrementally, yielding to the main thread between layouts.
   */
  async buildAsync(
    scene: AcTrScene,
    database: AcDbDatabase,
    options: AcApHtmlSnapshotBuilderOptions = {}
  ): Promise<AcExSnapshot> {
    return buildSnapshotFromExportSceneAsync(
      database,
      mapAcTrSceneToExportInput(scene),
      {
        ...toCoreOptions(options),
        yieldBetweenLayouts: () => accmYieldForPaint()
      }
    )
  }
}

function toCoreOptions(
  options: AcApHtmlSnapshotBuilderOptions
): AcExBuildSnapshotOptions {
  return {
    title: options.title,
    background: options.background,
    locale: options.locale ?? AcApI18n.currentLocale,
    exportInvisibleLayers: options.exportInvisibleLayers,
    exportLayouts: options.exportLayouts,
    initialView: options.initialView,
    viewState: options.viewState,
    viewerMode: options.viewerMode,
    canvasAspectRatio: options.canvasAspectRatio,
    docsBaseUrl: resolveDocsBaseUrlForExport()
  }
}

/**
 * Prefer the live viewer's configured docs root when exporting HTML.
 * Falls back to the offline-viewer default when unavailable.
 */
function resolveDocsBaseUrlForExport(): string {
  try {
    acexSetDocsBaseUrl(acapGetDocsBaseUrl())
  } catch {
    // Live viewer docs helper unavailable — keep Acex default.
  }
  return acexGetDocsBaseUrl()
}

function mapAcTrSceneToExportInput(scene: AcTrScene): AcExExportSceneInput {
  const layers = [...scene.layers.values()].map(layer => ({
    name: layer.name,
    color: layer.color.RGB ?? 0xffffff,
    visible: !layer.isOff && !layer.isFrozen
  }))

  const layouts = [...scene.layouts.entries()].map(([btrId, layout]) => ({
    btrId,
    isModelSpace: btrId === scene.modelSpaceBtrId,
    layers: [...layout.layers.values()].map(layer => ({
      name: layer.name,
      root: layer.internalObject
    }))
  }))

  return {
    layers,
    layouts,
    activeLayoutBtrId: scene.activeLayoutBtrId || scene.modelSpaceBtrId,
    modelSpaceBtrId: scene.modelSpaceBtrId
  }
}

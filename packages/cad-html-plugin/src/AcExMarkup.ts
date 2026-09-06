/**
 * Markup annotation tools for the offline HTML viewer.
 *
 * Creates Design Review–style overlays (cloud, callout, text, rect, circle,
 * arrow, stamp) with sidecar JSON import/export compatible with cad-simple-viewer.
 *
 * @module acexMarkup
 * @packageDocumentation
 */

import * as THREE from 'three'

import type { AcExCommandSessionUiState } from './AcExCommandSessionPanel'
import { AcExConfirmedPointMarks } from './AcExConfirmedPointMarks'
import type { AcExHtmlI18n } from './AcExHtmlI18n'
import { AcExHtmlIcons } from './AcExHtmlIcons'
import {
  ACEX_OVERLAY_ARROW_SIZE_PX,
  acexPositionWcsOverlay,
  acexScaledCanvasLineWidth,
  acexScaledOverlayArrowSize,
  acexScreenPxToWcs,
  acexSeedOverlaySizesFromWcs,
  acexSyncLiveOverlayTextHeight
} from './AcExHtmlOverlayDom'
import {
  acexComputeLeaderTipOnShape,
  acexDrawMarkupArrowHead,
  acexDrawMarkupLeader,
  acexFitMarkupCanvas,
  acexHitTestMarkup,
  acexHitTestMarkupShapeOutline,
  acexIsAttachableShapeMarkup,
  acexMarkupBounds,
  acexMarkupCanvasLineWidth,
  acexMarkupCenter,
  acexMarkupFocusExtents,
  type AcExMarkupShapeOutline,
  acexMarkupShapeOutlineFromGeometry,
  acexOverlayArrowSize,
  acexStrokeMarkupCloud,
  acexTranslateMarkupGeometry
} from './AcExMarkupGeometry'
import { acexBindMarkupPointerDrag } from './AcExMarkupGripDrag'
import {
  acexMarkupSidecarFileName,
  parseAcExMarkupSidecar,
  stringifyAcExMarkupSidecar
} from './AcExMarkupSidecar'
import {
  editAcExMarkupHtmlText,
  isAcExMarkupDoublePointer,
  isAcExMarkupHtmlTextEditing
} from './AcExMarkupTextEdit'
import type {
  AcExMarkupAttachedCallout,
  AcExMarkupGeometry,
  AcExMarkupMode,
  AcExMarkupPoint2d,
  AcExMarkupRecord,
  AcExMarkupSidecarFile,
  AcExMarkupStatus,
  AcExMarkupStyle
} from './AcExMarkupTypes'
import type { AcExTrackingOptions } from './AcExMeasureTracking'
import { constrainToAcExTracking } from './AcExMeasureTracking'
import type { AcExOsnapPoint } from './AcExOsnap'
import { acexOverlayGripClassName } from './AcExOverlayGrip'
import { acexExtentsMatchBox, type AcExSelectionMode } from './AcExSelectionBox'
import type { AcExSessionHistory } from './AcExSessionHistory'
import type { AcExExtents } from './AcExSnapshotTypes'

export type { AcExMarkupMode } from './AcExMarkupTypes'

/** Default markup stroke color (ACI red). */
export const ACEX_MARKUP_COLOR = '#e53935'

/** @deprecated Selection uses CSS glow; original stroke color is preserved. */
export const ACEX_MARKUP_SELECT_COLOR = '#ffd54f'

/** Default overlay line weight: hairline (1 CSS px, not zoom-scaled). */
const ACEX_MARKUP_LINE_WEIGHT = 0

/** Default font size for text / callout badges (CSS px). */
const ACEX_MARKUP_FONT_SIZE = 12

/** Screen-pixel tolerance for picking a committed markup. */
const MARKUP_HIT_THRESHOLD_PX = 10

/** Built-in stamp ids (caption defaults). */
const BUILTIN_STAMPS = [
  'approved',
  'rejected',
  'revised',
  'for-review'
] as const

type AcExBuiltinStampId = (typeof BUILTIN_STAMPS)[number]

const STAMP_LABELS: Record<AcExBuiltinStampId, string> = {
  approved: 'APPROVED',
  rejected: 'REJECTED',
  revised: 'REVISED',
  'for-review': 'FOR REVIEW'
}

interface AcExResolvedPoint {
  point: THREE.Vector2
  snap: AcExOsnapPoint | null
}

/**
 * View/camera callbacks supplied by {@link acexHtmlViewerRuntime}.
 */
export interface AcExMarkupViewApi {
  screenToWcs: (clientX: number, clientY: number) => THREE.Vector2
  wcsToScreen: (wcs: THREE.Vector2) => { x: number; y: number }
  render: () => void
  getSnapCacheKey: () => number
  /** Current orthographic camera zoom (used to scale DOM overlays). */
  getCameraZoom: () => number
  resolvePoint: (clientX: number, clientY: number) => AcExResolvedPoint
  /** Frames the camera on world XY extents (review-panel zoom-to). */
  zoomToExtents: (extents: AcExExtents) => void
}

export interface AcExMarkupControllerOptions {
  root: HTMLElement
  i18n: AcExHtmlI18n
  view: AcExMarkupViewApi
  statusEl: HTMLElement
  getReadyStatus: () => string
  drawingName?: string
  onOsnapMarker: (
    snap: AcExOsnapPoint | null,
    screen: { x: number; y: number } | null
  ) => void
  onActiveChange?: (active: boolean) => void
  /** Called when selection or session draw style changes (session accessory). */
  onStyleChange?: () => void
  /** Called when a markup tool starts so the runtime can cancel measure mode. */
  onBeforeActivate?: () => void
  /** Ortho/polar tracking from the shared settings panel. */
  getTrackingOptions?: () => AcExTrackingOptions | null
  /** Active layout BTR id; used to stamp and filter markup overlays. */
  getActiveLayoutId?: () => string
  /**
   * Updates the touch session panel. Pass `null` when no markup tool is active.
   */
  onSessionUi?: (state: AcExCommandSessionUiState | null) => void
  /**
   * Optional session undo/redo coordinator (markup + measure).
   * When set, create/delete/style/import edits are recorded.
   */
  sessionHistory?: AcExSessionHistory
}

type AcExMarkupCleanup = () => void

interface AcExMarkupParts {
  id: string
  dom: HTMLElement[]
  canvases: HTMLCanvasElement[]
  cleanups: AcExMarkupCleanup[]
}

interface AcExCommittedMarkup {
  record: AcExMarkupRecord
  parts: AcExMarkupParts
}

/** After cloud/rect/circle is drawn, or while attaching to an existing shape. */
interface AcExPlacingShapeCallout {
  outline: AcExMarkupShapeOutline
  tip: AcExMarkupPoint2d
  anchor: AcExMarkupPoint2d
  badge: HTMLElement
  tipDot: HTMLElement
  /** When set, attach the callout to this existing markup instead of creating one. */
  existingId?: string
}

function createMarkupId(prefix = 'markup'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function markupNow(): string {
  return new Date().toISOString()
}

function defaultStyle(
  color = ACEX_MARKUP_COLOR,
  lineWeight = ACEX_MARKUP_LINE_WEIGHT,
  fontSize = ACEX_MARKUP_FONT_SIZE
): AcExMarkupStyle {
  return {
    color,
    lineWeight,
    fontSize
  }
}

function point2(v: THREE.Vector2): AcExMarkupPoint2d {
  return { x: v.x, y: v.y }
}

function toVector2(p: AcExMarkupPoint2d): THREE.Vector2 {
  return new THREE.Vector2(p.x, p.y)
}

function isMarkupOnLayout(
  recordLayoutId: string | undefined,
  activeLayoutId: string | undefined
): boolean {
  if (activeLayoutId == null) return true
  return recordLayoutId == null || recordLayoutId === activeLayoutId
}

/**
 * Manages markup annotation tools for the offline HTML viewer.
 */
export class AcExMarkupController {
  private readonly _root: HTMLElement
  private readonly _i18n: AcExHtmlI18n
  private readonly _view: AcExMarkupViewApi
  private readonly _statusEl: HTMLElement
  private readonly _getReadyStatus: () => string
  private readonly _drawingName: string | undefined
  private readonly _onOsnapMarker: AcExMarkupControllerOptions['onOsnapMarker']
  private readonly _onActiveChange: ((active: boolean) => void) | null
  private readonly _onSessionUi:
    | ((state: AcExCommandSessionUiState | null) => void)
    | null
  private readonly _onStyleChange: (() => void) | null
  private readonly _onBeforeActivate: (() => void) | null
  private readonly _getTrackingOptions:
    | (() => AcExTrackingOptions | null)
    | null
  private readonly _getActiveLayoutId: (() => string) | null
  private readonly _sessionHistory: AcExSessionHistory | null
  /** True while {@link restoreRecords} rebuilds visuals (skip nested history). */
  private _restoring = false

  private readonly _overlayLayer: HTMLDivElement
  private readonly _previewCanvas: HTMLCanvasElement
  private readonly _fileInput: HTMLInputElement

  private readonly _committed: AcExCommittedMarkup[] = []
  private readonly _redrawListeners: AcExMarkupCleanup[] = []
  private readonly _selectedIds = new Set<string>()
  private readonly _recordListeners = new Set<() => void>()

  private _mode: AcExMarkupMode | null = null
  private _points: THREE.Vector2[] = []
  private _lastPointer: { x: number; y: number } | null = null
  /**
   * True while a live cursor sample should drive callout-anchor preview
   * (mouse hover, or touch loupe). After the shape’s second point, the text
   * capsule stays hidden until this is true again.
   */
  private _livePointer = false
  private _visible = true
  private _stampIndex = 0
  private _inOverlaySync = false
  private _lastOverlaySyncKey = -1
  private _overlayRootRect: DOMRect | null = null
  private _osnapCache: {
    clientX: number
    clientY: number
    cacheKey: number
    point: THREE.Vector2
    snap: AcExOsnapPoint | null
  } | null = null
  private _drawColor = ACEX_MARKUP_COLOR
  private _drawFontSize = ACEX_MARKUP_FONT_SIZE
  private _drawTextHeightMode: 'adaptive' | 'custom' = 'adaptive'
  private _drawCustomTextHeightWcs: number | undefined
  private _placingShapeCallout: AcExPlacingShapeCallout | null = null
  /** Blocks canvas placement while an inline text session is open. */
  private _awaitingInlineText = false
  private _inlineAbort: AbortController | null = null
  /** True while a peer create tool (e.g. measure) is armed. */
  private _peerToolActive = false
  private _lastSelectPointer:
    | { t: number; x: number; y: number; id: string }
    | undefined
  /** Phone/pad plus marks at confirmed in-progress pick points. */
  private readonly _confirmedPointMarks: AcExConfirmedPointMarks

  constructor(options: AcExMarkupControllerOptions) {
    this._root = options.root
    this._i18n = options.i18n
    this._view = options.view
    this._statusEl = options.statusEl
    this._getReadyStatus = options.getReadyStatus
    this._drawingName = options.drawingName
    this._onOsnapMarker = options.onOsnapMarker
    this._onActiveChange = options.onActiveChange ?? null
    this._onSessionUi = options.onSessionUi ?? null
    this._onStyleChange = options.onStyleChange ?? null
    this._onBeforeActivate = options.onBeforeActivate ?? null
    this._getTrackingOptions = options.getTrackingOptions ?? null
    this._getActiveLayoutId = options.getActiveLayoutId ?? null
    this._sessionHistory = options.sessionHistory ?? null

    this._overlayLayer = document.createElement('div')
    this._overlayLayer.id = 'mlcad-markup-overlays'
    this._root.appendChild(this._overlayLayer)

    this._previewCanvas = document.createElement('canvas')
    this._previewCanvas.className =
      'mlcad-markup-canvas mlcad-markup-canvas--preview'
    this._overlayLayer.appendChild(this._previewCanvas)

    this._fileInput = document.createElement('input')
    this._fileInput.type = 'file'
    this._fileInput.accept = '.json,application/json'
    this._fileInput.style.display = 'none'
    this._fileInput.addEventListener('change', () => {
      void this._handleImportFile()
    })
    this._root.appendChild(this._fileInput)

    this._confirmedPointMarks = new AcExConfirmedPointMarks(this._root, pos =>
      this._confirmedPointMarkScreen(pos)
    )
    this._updateVisibilityToolbar()

    this._sessionHistory?.attachMarkup({
      snapshot: () => this.snapshotRecords(),
      restore: records => this.restoreRecords(records)
    })
  }

  /**
   * Deep-cloned committed markup records (all layouts) for undo snapshots.
   */
  snapshotRecords(): AcExMarkupRecord[] {
    return structuredClone(this._committed.map(item => item.record))
  }

  /**
   * Replace all committed markups from a history snapshot.
   * Does not itself push a history entry.
   *
   * @param records - Markup sidecar records to restore.
   */
  restoreRecords(records: AcExMarkupRecord[]): void {
    this._restoring = true
    try {
      this.cancelMode()
      this._deselect(false)
      for (const item of [...this._committed]) {
        this._removeCommitted(item.record.id, false)
      }
      for (const record of records) {
        this._publishRecord(structuredClone(record))
      }
      this._updateIdleStatus()
      this._view.render()
      this._onStyleChange?.()
    } finally {
      this._restoring = false
    }
  }

  /** Record an undoable markup mutation when session history is bound. */
  private _edit(label: string, mutate: () => void): void {
    if (this._restoring || !this._sessionHistory) {
      mutate()
      return
    }
    this._sessionHistory.runMarkup(label, mutate)
  }

  get isActive(): boolean {
    return this._mode !== null
  }

  /** Whether one or more committed markups are selected. */
  get hasSelection(): boolean {
    return this._selectedIds.size > 0
  }

  /** Clears the current markup selection (if any). */
  clearSelection(): void {
    this._deselect(true)
  }

  /**
   * Suspends markup grip/badge pointer hit-testing while a peer create tool
   * (e.g. measure) is armed, so overlay DOM cannot steal OSNAP placement clicks.
   */
  setPeerToolActive(active: boolean): void {
    if (this._peerToolActive === active) return
    this._peerToolActive = active
    this._syncGripPointerEvents()
  }

  get mode(): AcExMarkupMode | null {
    return this._mode
  }

  get visible(): boolean {
    return this._visible
  }

  /** Updates the default stroke/fill color for newly created markups. */
  setMarkupColor(css: string): void {
    this.setDrawStyle({ color: css })
  }

  /** Current session draw style (and selected markup style when applicable). */
  getDrawStyle(): {
    color: string
    lineWeight: number
    fontSize: number
    textHeightMode: 'adaptive' | 'custom'
    textHeightWcs?: number
  } {
    const selectedId =
      this._selectedIds.size === 1 ? [...this._selectedIds][0] : undefined
    if (selectedId) {
      const record = this._findRecord(selectedId)
      if (record) {
        const fontSize = record.style.fontSize ?? this._drawFontSize
        const wcsToScreen = (p: { x: number; y: number }) =>
          this._wcsToScreenPoint(p)
        const textHeightWcs =
          record.style.textHeightWcs != null && record.style.textHeightWcs > 0
            ? record.style.textHeightWcs
            : acexScreenPxToWcs(fontSize, wcsToScreen)
        return {
          color: record.style.color || this._drawColor,
          lineWeight: ACEX_MARKUP_LINE_WEIGHT,
          fontSize,
          // Editing a committed overlay always presents Custom + world height.
          textHeightMode: 'custom',
          textHeightWcs
        }
      }
    }
    return {
      color: this._drawColor,
      lineWeight: ACEX_MARKUP_LINE_WEIGHT,
      fontSize: this._drawFontSize,
      textHeightMode: this._drawTextHeightMode,
      ...(this._drawTextHeightMode === 'custom' &&
      this._drawCustomTextHeightWcs != null &&
      this._drawCustomTextHeightWcs > 0
        ? { textHeightWcs: this._drawCustomTextHeightWcs }
        : {})
    }
  }

  /**
   * Updates session defaults and applies the same patch to the current selection.
   */
  setDrawStyle(patch: {
    color?: string
    lineWeight?: number
    fontSize?: number
    textHeightMode?: 'adaptive' | 'custom'
    textHeightWcs?: number
  }): void {
    this._edit('Edit Markup Style', () => {
      if (patch.color) this._drawColor = patch.color
      if (patch.fontSize != null && patch.fontSize > 0) {
        this._drawFontSize = patch.fontSize
      }
      if (patch.textHeightMode === 'adaptive') {
        this._drawTextHeightMode = 'adaptive'
        this._drawCustomTextHeightWcs = undefined
      } else if (
        patch.textHeightMode === 'custom' ||
        (patch.textHeightWcs != null && patch.textHeightWcs > 0)
      ) {
        this._drawTextHeightMode = 'custom'
        if (patch.textHeightWcs != null && patch.textHeightWcs > 0) {
          this._drawCustomTextHeightWcs = patch.textHeightWcs
        }
      }
      this._applyStyleToSelection({
        color: patch.color,
        fontSize: patch.fontSize,
        textHeightMode: patch.textHeightMode,
        textHeightWcs: patch.textHeightWcs
      })
      this._refreshActivePreview()
      this._syncPlacingStyle()
      this._onStyleChange?.()
      this._view.render()
    })
  }

  private _sessionStyle(): AcExMarkupStyle {
    const base = defaultStyle(
      this._drawColor,
      ACEX_MARKUP_LINE_WEIGHT,
      this._drawFontSize
    )
    return this._styleWithWcs({
      ...base,
      textHeightMode: this._drawTextHeightMode,
      ...(this._drawTextHeightMode === 'custom' &&
      this._drawCustomTextHeightWcs != null &&
      this._drawCustomTextHeightWcs > 0
        ? { textHeightWcs: this._drawCustomTextHeightWcs }
        : {})
    })
  }

  /** Attach world-space text height and arrow length from the current view. */
  private _styleWithWcs(style: AcExMarkupStyle): AcExMarkupStyle {
    const fontSize =
      style.fontSize != null && style.fontSize > 0
        ? style.fontSize
        : ACEX_MARKUP_FONT_SIZE
    const wcsToScreen = (p: { x: number; y: number }) =>
      this._wcsToScreenPoint(p)
    const { strokeWidthWcs: _omit, ...rest } = style
    const arrowSizeWcs =
      style.arrowSizeWcs != null && style.arrowSizeWcs > 0
        ? style.arrowSizeWcs
        : acexScreenPxToWcs(ACEX_OVERLAY_ARROW_SIZE_PX, wcsToScreen)
    let textHeightWcs: number
    if (
      style.textHeightMode === 'custom' &&
      style.textHeightWcs != null &&
      style.textHeightWcs > 0
    ) {
      textHeightWcs = style.textHeightWcs
    } else if (style.textHeightMode === 'adaptive') {
      textHeightWcs = acexScreenPxToWcs(fontSize, wcsToScreen)
    } else if (style.textHeightWcs != null && style.textHeightWcs > 0) {
      textHeightWcs = style.textHeightWcs
    } else {
      textHeightWcs = acexScreenPxToWcs(fontSize, wcsToScreen)
    }
    return {
      ...rest,
      lineWeight: ACEX_MARKUP_LINE_WEIGHT,
      textHeightWcs,
      arrowSizeWcs
    }
  }

  private _wcsToScreenPoint(p: { x: number; y: number }): {
    x: number
    y: number
  } {
    const s = this._view.wcsToScreen(new THREE.Vector2(p.x, p.y))
    return { x: s.x, y: s.y }
  }

  /**
   * Host-relative CSS pixels for a confirmed-point plus mark.
   */
  private _confirmedPointMarkScreen(p: { x: number; y: number }): {
    x: number
    y: number
  } {
    const screen = this._wcsToScreenPoint(p)
    const rootRect = this._overlayRootRect ?? this._root.getBoundingClientRect()
    return { x: screen.x - rootRect.left, y: screen.y - rootRect.top }
  }

  /**
   * Shows or clears phone/pad plus marks for in-progress `_points`.
   */
  private _syncConfirmedPointMarks(): void {
    if (!this._mode || this._points.length === 0) {
      this._confirmedPointMarks.clear()
      return
    }
    this._confirmedPointMarks.setWorldPoints(this._points)
  }

  private _scaledCanvasLineWidth(
    baseLineWidth: number,
    canvas: HTMLCanvasElement,
    strokeWidthWcs?: number
  ): number {
    return acexScaledCanvasLineWidth(
      baseLineWidth,
      canvas,
      this._view.getCameraZoom(),
      {
        strokeWidthWcs,
        wcsToScreen: p => this._wcsToScreenPoint(p)
      }
    )
  }

  private _applyStyleToSelection(patch: {
    color?: string
    fontSize?: number
    textHeightMode?: 'adaptive' | 'custom'
    textHeightWcs?: number
  }): void {
    if (this._selectedIds.size === 0) return
    const wcsToScreen = (p: { x: number; y: number }) =>
      this._wcsToScreenPoint(p)
    for (const id of this._selectedIds) {
      const item = this._committed.find(c => c.record.id === id)
      if (!item) continue
      const style = item.record.style
      if (patch.color) style.color = patch.color
      style.lineWeight = ACEX_MARKUP_LINE_WEIGHT
      style.strokeWidthWcs = undefined

      const mode =
        patch.textHeightMode ?? style.textHeightMode ?? 'adaptive'
      let fontSizeChanged = false

      if (
        mode === 'custom' &&
        patch.textHeightWcs != null &&
        patch.textHeightWcs > 0
      ) {
        style.textHeightMode = 'custom'
        style.textHeightWcs = patch.textHeightWcs
        if (patch.fontSize != null && patch.fontSize > 0) {
          style.fontSize = patch.fontSize
        } else {
          const perPx = acexScreenPxToWcs(1, wcsToScreen)
          if (perPx > 0) {
            style.fontSize = Math.max(
              1,
              Math.round(patch.textHeightWcs / perPx)
            )
          }
        }
        fontSizeChanged = true
      } else if (mode === 'adaptive' && patch.textHeightMode === 'adaptive') {
        style.textHeightMode = 'adaptive'
        if (patch.fontSize != null && patch.fontSize > 0) {
          style.fontSize = patch.fontSize
        }
        const font =
          style.fontSize != null && style.fontSize > 0
            ? style.fontSize
            : ACEX_MARKUP_FONT_SIZE
        style.textHeightWcs = acexScreenPxToWcs(font, wcsToScreen)
        fontSizeChanged = true
      } else if (patch.fontSize != null && patch.fontSize > 0) {
        const prevFont =
          style.fontSize != null && style.fontSize > 0
            ? style.fontSize
            : ACEX_MARKUP_FONT_SIZE
        if (
          style.textHeightWcs != null &&
          style.textHeightWcs > 0 &&
          prevFont > 0
        ) {
          style.textHeightWcs =
            style.textHeightWcs * (patch.fontSize / prevFont)
        } else {
          style.textHeightWcs = acexScreenPxToWcs(patch.fontSize, wcsToScreen)
        }
        style.fontSize = patch.fontSize
        fontSizeChanged = true
      }

      if (fontSizeChanged) {
        acexSeedOverlaySizesFromWcs(this._view.getCameraZoom(), wcsToScreen, {
          textHeightWcs: style.textHeightWcs,
          fontSizePx: style.fontSize ?? ACEX_MARKUP_FONT_SIZE,
          strokeScreenPx: acexMarkupCanvasLineWidth(ACEX_MARKUP_LINE_WEIGHT),
          elements: item.parts.dom,
          canvases: item.parts.canvases
        })
      }
      item.record.updatedAt = markupNow()
      const color = style.color || ACEX_MARKUP_COLOR
      for (const el of item.parts.dom) {
        if (
          el.classList.contains('mlcad-markup-badge') ||
          el.classList.contains('mlcad-markup-stamp')
        ) {
          el.style.color = color
          el.style.borderColor = color
          if (style.fontSize) {
            el.style.fontSize = `${style.fontSize}px`
          }
        } else if (el.classList.contains('mlcad-markup-dot')) {
          el.style.background = color
        }
      }
    }
    this._positionDomOverlays()
    this._applySelectionStyles()
  }

  private _syncPlacingStyle(): void {
    const placing = this._placingShapeCallout
    if (!placing) return
    placing.badge.style.color = this._drawColor
    placing.badge.style.borderColor = this._drawColor
    placing.badge.style.fontSize = `${this._drawFontSize}px`
    placing.tipDot.style.background = this._drawColor
    this._syncLiveDomTextHeight(placing.badge)
  }

  setMode(mode: AcExMarkupMode | null, toggleOff = true): void {
    if (mode === this._mode && toggleOff) {
      this.cancelMode()
      return
    }
    this.cancelMode()
    this._deselect(false)
    if (mode === null) return
    this._onBeforeActivate?.()
    this._mode = mode
    this._points = []
    this._updateToolbarActive()
    this._syncGripPointerEvents()
    this._statusEl.textContent = this._hintForMode(mode)
    this._onActiveChange?.(true)
    this._syncSessionUi()
  }

  cancelMode(): void {
    const wasActive = this._mode !== null || this._placingShapeCallout !== null
    this._abortInlineText()
    this._finishPlacingShapeCallout(false)
    this._mode = null
    this._points = []
    this._lastPointer = null
    this._livePointer = false
    this._osnapCache = null
    this._awaitingInlineText = false
    this._clearPreview()
    this._onOsnapMarker(null, null)
    this._confirmedPointMarks.clear()
    this._updateToolbarActive()
    this._syncGripPointerEvents()
    this._updateIdleStatus()
    this._view.render()
    if (wasActive) this._onActiveChange?.(false)
    this._syncSessionUi()
  }

  /** Escape equivalent for the session panel × button. */
  cancelSession(): boolean {
    return this.handleKeyDown('Escape')
  }

  private _syncSessionUi(): void {
    if (!this._onSessionUi) return
    if (!this._mode) {
      this._onSessionUi(null)
      return
    }
    this._onSessionUi({
      prompt: this._hintForMode(this._mode),
      confirmEnabled: false,
      metrics: {
        hasBasePoint: false,
        lengthText: '0',
        angleText: '0',
        dxText: '0',
        dyText: '0',
        xText: '0',
        yText: '0'
      },
      chips: []
    })
  }

  private _abortInlineText(): void {
    this._inlineAbort?.abort()
    this._inlineAbort = null
    this._awaitingInlineText = false
  }

  private _beginInlineText(
    options: Parameters<typeof editAcExMarkupHtmlText>[0]
  ): Promise<string | undefined> {
    this._abortInlineText()
    const abort = new AbortController()
    this._inlineAbort = abort
    this._awaitingInlineText = true
    this._syncGripPointerEvents()
    return editAcExMarkupHtmlText({ ...options, signal: abort.signal }).finally(
      () => {
        if (this._inlineAbort === abort) {
          this._inlineAbort = null
          this._awaitingInlineText = false
          this._syncGripPointerEvents()
        }
      }
    )
  }

  refreshIdleStatus(): void {
    this._updateIdleStatus()
  }

  clearAll(): void {
    this._edit('Clear Markups', () => {
      this.cancelMode()
      this._deselect(false)
      for (const item of [...this._committed]) {
        this._removeCommitted(item.record.id, false)
      }
      this._updateIdleStatus()
      this._view.render()
      this._notifyRecordsChanged()
    })
  }

  setVisible(visible: boolean): void {
    this._visible = visible
    this._overlayLayer.style.display = visible ? '' : 'none'
    this._updateVisibilityToolbar()
    this._view.render()
  }

  toggleVisible(): void {
    this.setVisible(!this._visible)
  }

  /**
   * Shows or hides committed overlays according to the active layout.
   * Records without `layoutId` remain visible on every layout.
   */
  syncLayoutVisibility(): void {
    const activeId = this._getActiveLayoutId?.()
    let selectionChanged = false
    for (const item of this._committed) {
      const onLayout = isMarkupOnLayout(item.record.layoutId, activeId)
      const show = this._visible && onLayout
      for (const el of item.parts.dom) el.hidden = !show
      for (const canvas of item.parts.canvases) canvas.hidden = !show
      if (!onLayout && this._selectedIds.has(item.record.id)) {
        this._selectedIds.delete(item.record.id)
        selectionChanged = true
      }
    }
    if (selectionChanged) {
      this._applySelectionStyles()
      this._onStyleChange?.()
      this._notifyRecordsChanged()
    }
  }

  syncOverlays(): void {
    if (!this._visible) return
    this._inOverlaySync = true
    try {
      this._overlayRootRect = this._root.getBoundingClientRect()
      const overlayKey = this._view.getSnapCacheKey()
      const cameraChanged = overlayKey !== this._lastOverlaySyncKey
      if (cameraChanged) {
        for (const fn of this._redrawListeners) fn()
        this._positionDomOverlays()
        this._lastOverlaySyncKey = overlayKey
      }
      this._refreshActivePreview()
      this._syncConfirmedPointMarks()
    } finally {
      this._inOverlaySync = false
      this._overlayRootRect = null
    }
  }

  handlePointerDown(clientX: number, clientY: number): boolean {
    if (this._awaitingInlineText || isAcExMarkupHtmlTextEditing()) {
      return true
    }
    // End live preview before resolving so a nested render cannot revive the
    // OSNAP glyph; confirmed picks show the plus mark only.
    this._livePointer = false
    if (this._placingShapeCallout) {
      this._lastPointer = { x: clientX, y: clientY }
      const point = this._resolvePointerWithOsnap(clientX, clientY, false)
      this._completeShapeCalloutAnchor(point)
      this._onOsnapMarker(null, null)
      return true
    }
    // While a markup tool is armed, never select/highlight committed overlays —
    // grip/badge DOM and stroke hits coincide with CAD grips/OSNAP and would
    // steal placement clicks. Idle selection uses {@link handleSelectionPointerDown}.
    if (!this._mode) return false
    this._lastPointer = { x: clientX, y: clientY }
    const point = this._resolvePointerWithOsnap(clientX, clientY, false)

    let handled = false
    switch (this._mode) {
      case 'arrow':
        handled = this._pointerTwoPoint(point, 'arrow')
        break
      case 'rect':
        handled = this._pointerTwoPoint(point, 'rect')
        break
      case 'cloud':
        handled = this._pointerTwoPoint(point, 'cloud')
        break
      case 'circle':
        handled = this._pointerCircle(point)
        break
      case 'callout':
        handled = this._pointerCallout(point, clientX, clientY)
        break
      case 'text':
        handled = this._pointerText(point)
        break
      case 'stamp':
        handled = this._pointerStamp(point)
        break
      default:
        handled = false
        break
    }
    this._onOsnapMarker(null, null)
    this._syncConfirmedPointMarks()
    return handled
  }

  handlePointerMove(clientX: number, clientY: number): void {
    if (this._awaitingInlineText || isAcExMarkupHtmlTextEditing()) return
    if (!this._mode && !this._placingShapeCallout) return
    this._livePointer = true
    this._lastPointer = { x: clientX, y: clientY }
    this._resolvePointerWithOsnap(clientX, clientY)
    this._refreshActivePreview()
  }

  handleKeyDown(key: string): boolean {
    if (isAcExMarkupHtmlTextEditing() || this._awaitingInlineText) {
      return key === 'Escape'
    }
    if (this._placingShapeCallout) {
      if (key === 'Escape') {
        if (this._placingShapeCallout.existingId) {
          // Cancel attaching; leave the existing shape unchanged.
          this._finishPlacingShapeCallout(true)
          if (this._mode) {
            this._statusEl.textContent = this._hintForMode(this._mode)
          }
          this._view.render()
        } else {
          // Cancel leader + text box; keep the newly drawn shape.
          this._commitPlacingShapeWithoutCallout()
        }
        return true
      }
      return false
    }
    if (!this._mode) return false
    if (key === 'Escape') {
      this.cancelMode()
      return true
    }
    return false
  }

  handleSelectionKeyDown(key: string, event: KeyboardEvent): boolean {
    // Allow delete while a create tool is still armed; only block during
    // in-progress placement / inline text editing.
    if (
      this._placingShapeCallout ||
      isAcExMarkupHtmlTextEditing() ||
      this._awaitingInlineText
    ) {
      return false
    }
    const isDelete =
      key === 'Delete' ||
      key === 'Backspace' ||
      event.code === 'Delete' ||
      event.code === 'Backspace'
    if (isDelete && this._selectedIds.size > 0) {
      event.preventDefault()
      this.deleteSelected()
      return true
    }
    return false
  }

  handleSelectionPointerDown(clientX: number, clientY: number): boolean {
    if (this._mode) return false
    return this._trySelectCommittedAt(clientX, clientY)
  }

  /**
   * Replaces markup selection with items whose geometry AABB matches `box`.
   *
   * @returns True when selection state changed.
   */
  handleSelectionBox(box: AcExExtents, mode: AcExSelectionMode): boolean {
    if (this._mode || !this._visible) return false
    const next = new Set<string>()
    for (const item of this._committed) {
      if (
        !isMarkupOnLayout(item.record.layoutId, this._getActiveLayoutId?.())
      ) {
        continue
      }
      const bounds = acexMarkupBounds(item.record.geometry)
      if (!bounds) continue
      if (acexExtentsMatchBox(bounds, box, mode)) {
        next.add(item.record.id)
      }
    }
    return this._replaceSelection(next)
  }

  deleteSelected(): void {
    if (this._selectedIds.size === 0) return
    this._edit('Delete Markup', () => {
      for (const id of [...this._selectedIds]) {
        this._removeCommitted(id, false)
      }
      this._selectedIds.clear()
      this._onStyleChange?.()
      this._updateIdleStatus()
      this._view.render()
      this._notifyRecordsChanged()
    })
  }

  /** Committed markup records on the current drawing (all layouts). */
  list(): AcExMarkupRecord[] {
    return this._committed.map(item => item.record)
  }

  /** Currently selected markup id when exactly one item is selected. */
  get selectedId(): string | undefined {
    if (this._selectedIds.size !== 1) return undefined
    return [...this._selectedIds][0]
  }

  /**
   * Subscribe to list / selection changes for the review panel.
   *
   * @returns Unsubscriber.
   */
  subscribe(listener: () => void): () => void {
    this._recordListeners.add(listener)
    return () => {
      this._recordListeners.delete(listener)
    }
  }

  /**
   * Select a markup from the review panel (replaces the current selection).
   */
  selectFromPanel(id: string): void {
    this._selectOnly(id)
  }

  /**
   * Zoom to the combined AABB of a markup (shape, leader, and HTML text box).
   *
   * @returns `true` when extents were applied.
   */
  focus(id: string): boolean {
    const item = this._committed.find(entry => entry.record.id === id)
    if (!item) return false
    const rects = item.parts.dom
      .filter(el => !el.classList.contains('mlcad-markup-dot') && !el.hidden)
      .map(el => el.getBoundingClientRect())
      .filter(rect => rect.width > 0 || rect.height > 0)
    const extents = acexMarkupFocusExtents(
      item.record.geometry,
      rects,
      (clientX, clientY) => this._clientToWorld(clientX, clientY)
    )
    if (!extents) return false
    this._view.zoomToExtents(extents)
    this._selectOnly(id)
    return true
  }

  /**
   * Patch review metadata (status / label / comment) for one markup.
   */
  updateMeta(
    id: string,
    patch: Partial<Pick<AcExMarkupRecord, 'comment' | 'status' | 'text'>>
  ): void {
    const item = this._committed.find(entry => entry.record.id === id)
    if (!item) return
    this._edit('Edit Markup', () => {
      const next: AcExMarkupRecord = {
        ...item.record,
        ...patch,
        updatedAt: markupNow()
      }
      if (patch.text !== undefined) {
        this._rebuildRecord(next)
      } else {
        item.record.comment = next.comment
        item.record.status = next.status as AcExMarkupStatus
        item.record.updatedAt = next.updatedAt
      }
      this._notifyRecordsChanged()
    })
  }

  /** Remove one committed markup. */
  removeMarkup(id: string): void {
    this._edit('Delete Markup', () => {
      this._removeCommitted(id, true)
      this._onStyleChange?.()
      this._view.render()
      this._notifyRecordsChanged()
    })
  }

  private _notifyRecordsChanged(): void {
    for (const listener of this._recordListeners) listener()
  }

  exportSidecar(): void {
    const file: AcExMarkupSidecarFile = {
      version: 1,
      drawingName: this._drawingName,
      markups: this._committed.map(c => c.record)
    }
    const text = stringifyAcExMarkupSidecar(file)
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = acexMarkupSidecarFileName(this._drawingName)
    a.click()
    URL.revokeObjectURL(url)
    this._statusEl.textContent = this._i18n.t('status.markupExported', {
      count: String(file.markups.length)
    })
  }

  importSidecar(): void {
    this._fileInput.value = ''
    this._fileInput.click()
  }

  /** Replace all markups from a parsed sidecar (used by tests / import). */
  loadSidecar(file: AcExMarkupSidecarFile): void {
    this._edit('Import Markups', () => {
      this.cancelMode()
      this._deselect(false)
      for (const item of [...this._committed]) {
        this._removeCommitted(item.record.id, false)
      }
      for (const record of file.markups) {
        this._publishRecord(record)
      }
      this._updateIdleStatus()
      this._view.render()
      this._notifyRecordsChanged()
    })
  }

  private async _handleImportFile(): Promise<void> {
    const file = this._fileInput.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const sidecar = parseAcExMarkupSidecar(text)
      this.loadSidecar(sidecar)
      this._statusEl.textContent = this._i18n.t('status.markupImported', {
        count: String(sidecar.markups.length)
      })
    } catch (error) {
      this._statusEl.textContent = this._i18n.t('status.markupImportFailed', {
        error: String(error)
      })
    }
  }

  private _pointerTwoPoint(
    point: THREE.Vector2,
    kind: 'arrow' | 'rect' | 'cloud' | 'callout'
  ): boolean {
    this._points.push(point.clone())
    this._syncGripPointerEvents()
    if (this._points.length < 2) {
      this._statusEl.textContent = this._hintForSecondPoint(kind)
      return true
    }
    const a = this._points[0]!
    const b = this._points[1]!
    this._points = []
    this._syncGripPointerEvents()
    this._clearPreview()

    if (kind === 'arrow') {
      this._commitGeometry('arrow', {
        type: 'arrow',
        start: point2(a),
        end: point2(b)
      })
      this.cancelMode()
    } else if (kind === 'rect') {
      this._beginPlacingShapeCallout({
        kind: 'rect',
        corner1: point2(a),
        corner2: point2(b)
      })
    } else if (kind === 'cloud') {
      this._beginPlacingShapeCallout({
        kind: 'cloud',
        corner1: point2(a),
        corner2: point2(b)
      })
    } else {
      this._beginStandaloneCalloutText(point2(a), point2(b))
    }
    return true
  }

  private _pointerCallout(
    point: THREE.Vector2,
    clientX: number,
    clientY: number
  ): boolean {
    if (this._points.length === 0) {
      const hit = this._pickAttachableShapeAt(clientX, clientY)
      if (hit) {
        const outline = acexMarkupShapeOutlineFromGeometry(hit.record.geometry)
        if (outline) {
          this._beginPlacingShapeCallout(outline, {
            existingId: hit.record.id,
            toward: this._clientToWorld(clientX, clientY)
          })
          return true
        }
      }
    }
    return this._pointerTwoPoint(point, 'callout')
  }

  private _pickAttachableShapeAt(
    clientX: number,
    clientY: number
  ): AcExCommittedMarkup | null {
    if (!this._visible) return null
    const worldToScreen = (p: AcExMarkupPoint2d) =>
      this._view.wcsToScreen(toVector2(p))
    for (let i = this._committed.length - 1; i >= 0; i--) {
      const item = this._committed[i]!
      if (
        !isMarkupOnLayout(item.record.layoutId, this._getActiveLayoutId?.())
      ) {
        continue
      }
      if (!acexIsAttachableShapeMarkup(item.record.geometry)) continue
      if (
        acexHitTestMarkupShapeOutline(
          item.record.geometry,
          clientX,
          clientY,
          MARKUP_HIT_THRESHOLD_PX,
          worldToScreen
        )
      ) {
        return item
      }
    }
    return null
  }

  private _pointerCircle(point: THREE.Vector2): boolean {
    this._points.push(point.clone())
    this._syncGripPointerEvents()
    if (this._points.length < 2) {
      this._statusEl.textContent = this._i18n.t('status.markupCircleRadiusHint')
      return true
    }
    const center = this._points[0]!
    const rim = this._points[1]!
    const radius = center.distanceTo(rim)
    this._points = []
    this._syncGripPointerEvents()
    this._clearPreview()
    if (radius > 1e-9) {
      this._beginPlacingShapeCallout({
        kind: 'circle',
        center: point2(center),
        radius
      })
    } else {
      this._statusEl.textContent = this._hintForMode('circle')
    }
    return true
  }

  private _pointerText(point: THREE.Vector2): boolean {
    if (this._awaitingInlineText) return true
    const defaultLabel = this._i18n.t('status.markupDefaultLabel')
    const badge = this._makeTempBadge(point2(point), '', this._drawColor)
    this._statusEl.textContent = this._i18n.t('status.markupTextEditHint')
    void this._beginInlineText({
      el: badge,
      listenOn: badge,
      multiline: false,
      initialText: ''
    }).then(text => {
      badge.remove()
      if (this._mode !== 'text') return
      // Escape → still commit with default label (matches simple-viewer TEXT cmd).
      const final = (text ?? defaultLabel).trim() || defaultLabel
      this._commitGeometry(
        'text',
        { type: 'text', position: point2(point) },
        final
      )
      this.cancelMode()
      this._view.render()
    })
    return true
  }

  private _pointerStamp(point: THREE.Vector2): boolean {
    const stampId = BUILTIN_STAMPS[this._stampIndex % BUILTIN_STAMPS.length]!
    this._stampIndex = (this._stampIndex + 1) % BUILTIN_STAMPS.length
    this._commitGeometry(
      'stamp',
      {
        type: 'stamp',
        position: point2(point),
        stampId
      },
      STAMP_LABELS[stampId]
    )
    this.cancelMode()
    return true
  }

  private _beginStandaloneCalloutText(
    tip: AcExMarkupPoint2d,
    anchor: AcExMarkupPoint2d
  ): void {
    if (this._awaitingInlineText) return
    const defaultLabel = this._i18n.t('status.markupDefaultLabel')
    const badge = this._makeTempBadge(anchor, '', this._drawColor)
    const tipDot = this._makeTempDot(tip, this._drawColor)
    this._statusEl.textContent = this._i18n.t('status.markupTextEditHint')
    const paintLeader = () => {
      const ctx = acexFitMarkupCanvas(this._previewCanvas, this._root)
      if (!ctx) return
      const tipS = this._worldToOverlay(tip)
      const anchorS = this._worldToOverlay(anchor)
      const baseWidth = acexMarkupCanvasLineWidth(ACEX_MARKUP_LINE_WEIGHT)
      const scaled = this._scaledCanvasLineWidth(baseWidth, ctx.canvas)
      acexDrawMarkupLeader(
        ctx,
        tipS,
        anchorS,
        this._drawColor,
        true,
        scaled,
        acexOverlayArrowSize(scaled, baseWidth)
      )
    }
    paintLeader()
    void this._beginInlineText({
      el: badge,
      listenOn: badge,
      multiline: true,
      initialText: ''
    }).then(text => {
      badge.remove()
      tipDot.remove()
      this._clearPreview()
      if (this._mode !== 'callout') return
      const final = (text ?? '').trim() || defaultLabel
      this._commitGeometry('callout', { type: 'callout', tip, anchor }, final)
      this.cancelMode()
      this._view.render()
    })
  }

  private _beginPlacingShapeCallout(
    outline: AcExMarkupShapeOutline,
    options?: { existingId?: string; toward?: AcExMarkupPoint2d }
  ): void {
    const toward =
      options?.toward ??
      (outline.kind === 'circle'
        ? {
            x: outline.center.x + Math.max(outline.radius, 1),
            y: outline.center.y
          }
        : {
            x: Math.max(outline.corner1.x, outline.corner2.x) + 1,
            y: (outline.corner1.y + outline.corner2.y) / 2
          })
    const tip = acexComputeLeaderTipOnShape(outline, toward)
    const anchor = { ...toward }
    const badge = this._makeTempBadge(anchor, '', this._drawColor)
    const tipDot = this._makeTempDot(tip, this._drawColor)
    this._placingShapeCallout = {
      outline,
      tip,
      anchor,
      badge,
      tipDot,
      existingId: options?.existingId
    }
    // Capsule / tip wait for the next live cursor (3rd-point capture / loupe).
    this._setPlacingCalloutChromeVisible(false)
    this._statusEl.textContent = this._i18n.t('status.markupShapeCalloutHint')
    this._syncGripPointerEvents()
    this._refreshActivePreview()
    this._onActiveChange?.(true)
  }

  private _completeShapeCalloutAnchor(anchorPoint: THREE.Vector2): void {
    const placing = this._placingShapeCallout
    if (!placing || this._awaitingInlineText) return
    const anchor = point2(anchorPoint)
    const tip = acexComputeLeaderTipOnShape(placing.outline, anchor)
    placing.tip = tip
    placing.anchor = anchor
    placing.badge.dataset.wcsX = String(anchor.x)
    placing.badge.dataset.wcsY = String(anchor.y)
    placing.tipDot.dataset.wcsX = String(tip.x)
    placing.tipDot.dataset.wcsY = String(tip.y)
    // Text edit needs the capsule visible even without a live cursor.
    this._setPlacingCalloutChromeVisible(true)
    this._positionTempDom(placing.badge)
    this._positionTempDom(placing.tipDot)
    this._refreshActivePreview()

    this._statusEl.textContent = this._i18n.t('status.markupTextEditHint')
    void this._beginInlineText({
      el: placing.badge,
      listenOn: placing.badge,
      multiline: true,
      initialText: ''
    }).then(text => {
      // Cancelled via tool switch / abort — do not commit.
      if (this._placingShapeCallout !== placing) return
      // Escape during text entry → keep tip/anchor; empty text (simple-viewer).
      // Escape before typing is handled by handleKeyDown (shape only, no callout).
      const callout: AcExMarkupAttachedCallout = {
        tip,
        anchor,
        text: text || undefined
      }
      if (placing.existingId) {
        this._attachCalloutToExisting(
          placing.existingId,
          callout,
          text || undefined
        )
      } else {
        this._commitShapeWithCallout(
          placing.outline,
          callout,
          text || undefined
        )
      }
      this._finishPlacingShapeCallout(false)
      this.cancelMode()
      this._view.render()
    })
  }

  private _commitPlacingShapeWithoutCallout(): void {
    const placing = this._placingShapeCallout
    if (!placing) return
    if (placing.existingId) {
      this._finishPlacingShapeCallout(false)
      if (this._mode) {
        this._statusEl.textContent = this._hintForMode(this._mode)
      }
    } else {
      this._commitShapeWithCallout(placing.outline, undefined, undefined)
      this._finishPlacingShapeCallout(false)
      this.cancelMode()
    }
    this._view.render()
  }

  private _commitShapeWithCallout(
    outline: AcExMarkupShapeOutline,
    callout: AcExMarkupAttachedCallout | undefined,
    text: string | undefined
  ): void {
    if (outline.kind === 'circle') {
      this._commitGeometry(
        'circle',
        {
          type: 'circle',
          center: outline.center,
          radius: outline.radius,
          callout
        },
        text
      )
      return
    }
    this._commitGeometry(
      outline.kind,
      {
        type: outline.kind,
        corner1: outline.corner1,
        corner2: outline.corner2,
        callout
      },
      text
    )
  }

  private _attachCalloutToExisting(
    id: string,
    callout: AcExMarkupAttachedCallout,
    text: string | undefined
  ): void {
    const item = this._committed.find(c => c.record.id === id)
    if (!item) return
    const g = item.record.geometry
    if (!acexIsAttachableShapeMarkup(g)) return
    if (g.type !== 'cloud' && g.type !== 'rect' && g.type !== 'circle') return
    this._edit('Edit Markup', () => {
      const next: AcExMarkupRecord = {
        ...item.record,
        text,
        updatedAt: markupNow(),
        geometry: { ...g, callout }
      }
      this._rebuildRecord(next)
    })
  }

  /** Replace visuals for an existing markup, preserving z-order. */
  private _rebuildRecord(record: AcExMarkupRecord): void {
    const index = this._committed.findIndex(c => c.record.id === record.id)
    if (index < 0) {
      this._publishRecord(record)
      return
    }
    const item = this._committed[index]!
    for (const cleanup of item.parts.cleanups) cleanup()
    for (const el of item.parts.dom) el.remove()
    for (const canvas of item.parts.canvases) canvas.remove()
    const parts: AcExMarkupParts = {
      id: record.id,
      dom: [],
      canvases: [],
      cleanups: []
    }
    this._committed[index] = { record, parts }
    this._buildVisuals(record, parts)
    this._positionDomOverlays()
    this.syncLayoutVisibility()
    this._notifyRecordsChanged()
  }

  /**
   * @param keepMode - When true, stay in the current markup tool after cleanup.
   */
  private _finishPlacingShapeCallout(keepMode: boolean): void {
    const placing = this._placingShapeCallout
    if (!placing) return
    this._placingShapeCallout = null
    placing.badge.remove()
    placing.tipDot.remove()
    this._clearPreview()
    this._syncGripPointerEvents()
    void keepMode
  }

  private _makeTempBadge(
    wcs: AcExMarkupPoint2d,
    text: string,
    color: string
  ): HTMLElement {
    const badge = document.createElement('div')
    badge.className = 'mlcad-markup-badge mlcad-markup-badge--preview'
    badge.dataset.wcsX = String(wcs.x)
    badge.dataset.wcsY = String(wcs.y)
    badge.textContent = text
    badge.style.color = color
    badge.style.borderColor = color
    badge.style.fontSize = `${this._drawFontSize}px`
    // Must not intercept canvas clicks while placing the leader anchor.
    badge.style.pointerEvents = 'none'
    this._overlayLayer.appendChild(badge)
    this._syncLiveDomTextHeight(badge)
    this._positionTempDom(badge)
    return badge
  }

  private _makeTempDot(wcs: AcExMarkupPoint2d, color: string): HTMLElement {
    const dot = document.createElement('div')
    dot.className = 'mlcad-markup-preview-dot'
    dot.dataset.wcsX = String(wcs.x)
    dot.dataset.wcsY = String(wcs.y)
    dot.style.background = color
    dot.style.pointerEvents = 'none'
    this._overlayLayer.appendChild(dot)
    this._positionTempDom(dot)
    return dot
  }

  private _positionTempDom(el: HTMLElement): void {
    const x = Number(el.dataset.wcsX)
    const y = Number(el.dataset.wcsY)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    const rootRect = this._overlayRootRect ?? this._root.getBoundingClientRect()
    const screen = this._view.wcsToScreen(new THREE.Vector2(x, y))
    acexPositionWcsOverlay(el, screen, rootRect, this._view.getCameraZoom())
  }

  private _commitGeometry(
    type: AcExMarkupRecord['type'],
    geometry: AcExMarkupGeometry,
    text?: string
  ): void {
    this._edit('Add Markup', () => {
      const now = markupNow()
      const record: AcExMarkupRecord = {
        id: createMarkupId(),
        type,
        layoutId: this._getActiveLayoutId?.(),
        style: this._sessionStyle(),
        text,
        comment: '',
        status: 'open',
        author: '',
        createdAt: now,
        updatedAt: now,
        geometry
      }
      this._publishRecord(record)
      this._view.render()
    })
  }

  private _publishRecord(record: AcExMarkupRecord): void {
    const parts: AcExMarkupParts = {
      id: record.id,
      dom: [],
      canvases: [],
      cleanups: []
    }
    // Push before building visuals so the initial redraw can resolve the record.
    this._committed.push({ record, parts })
    this._buildVisuals(record, parts)
    acexSeedOverlaySizesFromWcs(
      this._view.getCameraZoom(),
      p => this._wcsToScreenPoint(p),
      {
        textHeightWcs: record.style.textHeightWcs,
        arrowSizeWcs: record.style.arrowSizeWcs,
        fontSizePx: record.style.fontSize ?? ACEX_MARKUP_FONT_SIZE,
        strokeScreenPx: acexMarkupCanvasLineWidth(ACEX_MARKUP_LINE_WEIGHT),
        elements: parts.dom,
        canvases: parts.canvases
      }
    )
    this._positionDomOverlays()
    this.syncLayoutVisibility()
    this._notifyRecordsChanged()
  }

  private _buildVisuals(
    record: AcExMarkupRecord,
    parts: AcExMarkupParts
  ): void {
    const color = record.style.color || ACEX_MARKUP_COLOR
    const markupId = record.id

    const canvas = document.createElement('canvas')
    canvas.className = 'mlcad-markup-canvas'
    canvas.dataset.markupId = markupId
    this._overlayLayer.appendChild(canvas)
    parts.canvases.push(canvas)

    const redraw = () => {
      const live = this._findRecord(markupId) ?? record
      const ctx = acexFitMarkupCanvas(canvas, this._root)
      if (!ctx) return
      this._strokeGeometry(
        ctx,
        live.geometry,
        live.style.color || ACEX_MARKUP_COLOR,
        acexMarkupCanvasLineWidth(ACEX_MARKUP_LINE_WEIGHT),
        undefined,
        true,
        live.style.arrowSizeWcs
      )
    }
    this._redrawListeners.push(redraw)
    parts.cleanups.push(() => {
      const idx = this._redrawListeners.indexOf(redraw)
      if (idx >= 0) this._redrawListeners.splice(idx, 1)
    })
    redraw()

    const g = record.geometry
    const attached =
      (g.type === 'cloud' || g.type === 'rect' || g.type === 'circle') &&
      g.callout
        ? g.callout
        : null

    let badge: HTMLElement | null = null
    if (
      g.type === 'text' ||
      g.type === 'callout' ||
      g.type === 'stamp' ||
      attached
    ) {
      badge = document.createElement('div')
      badge.className =
        g.type === 'stamp' ? 'mlcad-markup-stamp' : 'mlcad-markup-badge'
      badge.dataset.markupId = markupId
      const anchorPos =
        g.type === 'text' || g.type === 'stamp'
          ? g.position
          : g.type === 'callout'
            ? g.anchor
            : attached!.anchor
      badge.dataset.wcsX = String(anchorPos.x)
      badge.dataset.wcsY = String(anchorPos.y)
      const label =
        (attached ? attached.text : undefined) ||
        record.text?.trim() ||
        (g.type === 'stamp' && 'stampId' in g
          ? (STAMP_LABELS[g.stampId as AcExBuiltinStampId] ?? g.stampId)
          : this._i18n.t('status.markupDefaultLabel'))
      badge.textContent = label
      badge.style.color = color
      badge.style.borderColor = color
      if (record.style.fontSize) {
        badge.style.fontSize = `${record.style.fontSize}px`
      }
      this._overlayLayer.appendChild(badge)
      parts.dom.push(badge)

      if (g.type !== 'stamp') {
        badge.addEventListener('dblclick', event => {
          event.stopPropagation()
          event.preventDefault()
          this._editText(markupId, badge!)
        })
      }
    }

    let tipDot: HTMLElement | null = null
    let startDot: HTMLElement | null = null
    let endDot: HTMLElement | null = null
    let centerDot: HTMLElement | null = null

    if (g.type === 'arrow' || g.type === 'line') {
      startDot = this._makeDot(g.start, color, markupId)
      endDot = this._makeDot(g.end, color, markupId)
      parts.dom.push(startDot, endDot)
    } else if (g.type === 'callout') {
      tipDot = this._makeDot(g.tip, color, markupId)
      parts.dom.push(tipDot)
    } else if (attached) {
      tipDot = this._makeDot(attached.tip, color, markupId)
      parts.dom.push(tipDot)
    }

    if (
      g.type === 'callout' ||
      g.type === 'cloud' ||
      g.type === 'rect' ||
      g.type === 'circle'
    ) {
      const center = acexMarkupCenter(record)
      if (center) {
        centerDot = this._makeDot(center, color, markupId)
        parts.dom.push(centerDot)
      }
    }

    parts.cleanups.push(
      this._bindGrips({
        id: markupId,
        geometryType: g.type,
        hasAttachedCallout: !!attached,
        badge,
        tipDot,
        startDot,
        endDot,
        centerDot,
        redraw
      })
    )
    this._syncGripPointerEvents()
  }

  private _findRecord(id: string): AcExMarkupRecord | undefined {
    return this._committed.find(c => c.record.id === id)?.record
  }

  private _gripsEnabled(): boolean {
    // Match live viewer: while any create tool is armed (own or peer), do not
    // let committed markup grips/badges receive pointer events.
    return (
      !this._peerToolActive &&
      this._mode === null &&
      !this._placingShapeCallout &&
      !this._awaitingInlineText &&
      !isAcExMarkupHtmlTextEditing() &&
      this._points.length === 0
    )
  }

  private _syncGripPointerEvents(): void {
    const enable = this._gripsEnabled()
    for (const item of this._committed) {
      const selected = this._selectedIds.has(item.record.id)
      for (const el of item.parts.dom) {
        if (el.classList.contains('mlcad-markup-dot')) {
          el.style.pointerEvents = enable && selected ? 'auto' : 'none'
        } else {
          el.style.pointerEvents = enable ? 'auto' : 'none'
        }
      }
    }
  }

  private _clientToWorld(clientX: number, clientY: number): AcExMarkupPoint2d {
    return point2(this._view.screenToWcs(clientX, clientY))
  }

  private _clientToWorldWithOsnap(
    clientX: number,
    clientY: number
  ): AcExMarkupPoint2d {
    return point2(this._resolvePointerWithOsnap(clientX, clientY))
  }

  private _hideOsnapMarker(): void {
    this._osnapCache = null
    this._onOsnapMarker(null, null)
  }

  private _placeDomAt(el: HTMLElement, wcs: AcExMarkupPoint2d): void {
    el.dataset.wcsX = String(wcs.x)
    el.dataset.wcsY = String(wcs.y)
    if (el.classList.contains('mlcad-markup-badge--preview')) {
      this._syncLiveDomTextHeight(el)
    }
    this._positionTempDom(el)
  }

  /** Apply session text-height mode to a live preview badge. */
  private _syncLiveDomTextHeight(el: HTMLElement): void {
    acexSyncLiveOverlayTextHeight(
      this._view.getCameraZoom(),
      p => this._wcsToScreenPoint(p),
      el,
      {
        fontSize: this._drawFontSize,
        textHeightMode: this._drawTextHeightMode,
        textHeightWcs: this._drawCustomTextHeightWcs
      }
    )
  }

  /**
   * Replaces the selection with only `id` (used when starting a grip edit so
   * delete/style/status target the gripped markup).
   */
  private _selectOnly(id: string): void {
    if (!(this._selectedIds.size === 1 && this._selectedIds.has(id))) {
      this._selectedIds.clear()
    }
    this._select(id)
  }

  /** Adds `id` to the selection (multi-select, same as measurements). */
  private _select(id: string): void {
    if (!this._selectedIds.has(id)) {
      this._selectedIds.add(id)
      this._applySelectionStyles()
      this._onStyleChange?.()
    } else {
      this._applySelectionStyles()
    }
    this._statusEl.textContent =
      this._selectedIds.size > 1
        ? this._i18n.t('status.markupSelectedCount', {
            count: String(this._selectedIds.size)
          })
        : this._i18n.t('status.markupSelected', {
            type: this._findRecord(id)?.type ?? 'markup'
          })
    this._view.render()
    this._notifyRecordsChanged()
  }

  private _touchRecord(id: string): void {
    this._hideOsnapMarker()
    const record = this._findRecord(id)
    if (!record) return
    record.updatedAt = markupNow()
    this._sessionHistory?.commitMarkupCapture('Edit Markup')
  }

  private _bindGrips(options: {
    id: string
    geometryType: AcExMarkupRecord['type']
    hasAttachedCallout: boolean
    badge: HTMLElement | null
    tipDot: HTMLElement | null
    startDot: HTMLElement | null
    endDot: HTMLElement | null
    centerDot: HTMLElement | null
    redraw: () => void
  }): () => void {
    const {
      id,
      geometryType,
      hasAttachedCallout,
      badge,
      tipDot,
      startDot,
      endDot,
      centerDot,
      redraw
    } = options
    const cleanups: Array<() => void> = []
    const isEnabled = () => this._gripsEnabled()
    const clientToWorld = (x: number, y: number) => this._clientToWorld(x, y)
    const clientToWorldOsnap = (x: number, y: number) =>
      this._clientToWorldWithOsnap(x, y)
    const onSelect = () => this._selectOnly(id)
    const onGripDragStart = () => this._sessionHistory?.beginMarkupCapture()

    const shapeOutline = (): AcExMarkupShapeOutline | null => {
      const record = this._findRecord(id)
      if (!record) return null
      const g = record.geometry
      if (g.type === 'cloud' || g.type === 'rect') {
        return { kind: g.type, corner1: g.corner1, corner2: g.corner2 }
      }
      if (g.type === 'circle') {
        return { kind: 'circle', center: g.center, radius: g.radius }
      }
      return null
    }

    const syncCenterDot = () => {
      if (!centerDot) return
      const record = this._findRecord(id)
      if (!record) return
      const center = acexMarkupCenter(record)
      if (center) this._placeDomAt(centerDot, center)
    }

    const syncAttachedDom = (g: AcExMarkupGeometry) => {
      if (g.type === 'callout') {
        if (tipDot) this._placeDomAt(tipDot, g.tip)
        if (badge) this._placeDomAt(badge, g.anchor)
      } else if (
        (g.type === 'cloud' || g.type === 'rect' || g.type === 'circle') &&
        g.callout
      ) {
        if (tipDot) this._placeDomAt(tipDot, g.callout.tip)
        if (badge) this._placeDomAt(badge, g.callout.anchor)
      }
      syncCenterDot()
    }

    // Text / stamp: drag badge to move position.
    if (badge && (geometryType === 'text' || geometryType === 'stamp')) {
      cleanups.push(
        acexBindMarkupPointerDrag({
          el: badge,
          clientToWorld,
          showSnapLoupe: false,
          isEnabled,
          cursor: 'move',
          onPointerDown: onSelect,
          onDragStart: onGripDragStart,
          onMove: world => {
            const record = this._findRecord(id)
            if (!record) return
            if (
              record.geometry.type !== 'text' &&
              record.geometry.type !== 'stamp'
            ) {
              return
            }
            record.geometry.position.x = world.x
            record.geometry.position.y = world.y
            this._placeDomAt(badge, world)
          },
          onCommit: () => this._touchRecord(id)
        })
      )
    }

    // Standalone callout or shape-attached callout: tip + bubble.
    if (badge && tipDot && (geometryType === 'callout' || hasAttachedCallout)) {
      cleanups.push(
        acexBindMarkupPointerDrag({
          el: tipDot,
          clientToWorld: clientToWorldOsnap,
          isEnabled,
          onPointerDown: onSelect,
          onDragStart: onGripDragStart,
          onMove: world => {
            const record = this._findRecord(id)
            if (!record) return
            const g = record.geometry
            let tip = world
            if (
              g.type === 'cloud' ||
              g.type === 'rect' ||
              g.type === 'circle'
            ) {
              const outline = shapeOutline()
              if (!outline || !g.callout) return
              tip = acexComputeLeaderTipOnShape(outline, world)
              g.callout.tip.x = tip.x
              g.callout.tip.y = tip.y
            } else if (g.type === 'callout') {
              g.tip.x = tip.x
              g.tip.y = tip.y
            } else {
              return
            }
            this._placeDomAt(tipDot, tip)
            if (geometryType === 'callout') syncCenterDot()
            redraw()
          },
          onCommit: () => this._touchRecord(id)
        })
      )
      cleanups.push(
        acexBindMarkupPointerDrag({
          el: badge,
          clientToWorld,
          showSnapLoupe: false,
          isEnabled,
          cursor: 'move',
          onPointerDown: onSelect,
          onDragStart: onGripDragStart,
          onMove: world => {
            const record = this._findRecord(id)
            if (!record) return
            const g = record.geometry
            if (g.type === 'callout') {
              g.anchor.x = world.x
              g.anchor.y = world.y
            } else if (
              (g.type === 'cloud' ||
                g.type === 'rect' ||
                g.type === 'circle') &&
              g.callout
            ) {
              g.callout.anchor.x = world.x
              g.callout.anchor.y = world.y
            } else {
              return
            }
            this._placeDomAt(badge, world)
            if (geometryType === 'callout') syncCenterDot()
            redraw()
          },
          onCommit: () => this._touchRecord(id)
        })
      )
    }

    // Arrow / line endpoints.
    if (
      startDot &&
      endDot &&
      (geometryType === 'arrow' || geometryType === 'line')
    ) {
      cleanups.push(
        acexBindMarkupPointerDrag({
          el: startDot,
          clientToWorld: clientToWorldOsnap,
          isEnabled,
          onPointerDown: onSelect,
          onDragStart: onGripDragStart,
          onMove: world => {
            const record = this._findRecord(id)
            if (!record) return
            const g = record.geometry
            if (g.type !== 'arrow' && g.type !== 'line') return
            g.start.x = world.x
            g.start.y = world.y
            this._placeDomAt(startDot, world)
            redraw()
          },
          onCommit: () => this._touchRecord(id)
        })
      )
      cleanups.push(
        acexBindMarkupPointerDrag({
          el: endDot,
          clientToWorld: clientToWorldOsnap,
          isEnabled,
          onPointerDown: onSelect,
          onDragStart: onGripDragStart,
          onMove: world => {
            const record = this._findRecord(id)
            if (!record) return
            const g = record.geometry
            if (g.type !== 'arrow' && g.type !== 'line') return
            g.end.x = world.x
            g.end.y = world.y
            this._placeDomAt(endDot, world)
            redraw()
          },
          onCommit: () => this._touchRecord(id)
        })
      )
    }

    // Center grip: move whole callout / cloud / rect / circle (+ attached callout).
    if (
      centerDot &&
      (geometryType === 'callout' ||
        geometryType === 'cloud' ||
        geometryType === 'rect' ||
        geometryType === 'circle')
    ) {
      const snapCenter =
        geometryType === 'cloud' ||
        geometryType === 'rect' ||
        geometryType === 'circle'
      let originGeom: AcExMarkupGeometry | null = null
      let originCenter: AcExMarkupPoint2d | null = null
      cleanups.push(
        acexBindMarkupPointerDrag({
          el: centerDot,
          clientToWorld: snapCenter ? clientToWorldOsnap : clientToWorld,
          showSnapLoupe: snapCenter,
          isEnabled,
          cursor: 'move',
          onPointerDown: onSelect,
          onDragStart: () => {
            onGripDragStart()
            const record = this._findRecord(id)
            if (!record) return
            originGeom = structuredClone(record.geometry)
            originCenter = acexMarkupCenter(record)
          },
          onMove: world => {
            const record = this._findRecord(id)
            if (!record || !originGeom || !originCenter) return
            const dx = world.x - originCenter.x
            const dy = world.y - originCenter.y
            record.geometry = acexTranslateMarkupGeometry(originGeom, dx, dy)
            syncAttachedDom(record.geometry)
            this._placeDomAt(centerDot, world)
            redraw()
          },
          onCommit: () => {
            originGeom = null
            originCenter = null
            this._touchRecord(id)
          }
        })
      )
    }

    return () => {
      for (const fn of cleanups) fn()
    }
  }

  private _makeDot(
    wcs: AcExMarkupPoint2d,
    color: string,
    id: string
  ): HTMLElement {
    const dot = document.createElement('div')
    dot.className = acexOverlayGripClassName('markup')
    dot.dataset.markupId = id
    dot.dataset.wcsX = String(wcs.x)
    dot.dataset.wcsY = String(wcs.y)
    dot.style.background = color
    this._overlayLayer.appendChild(dot)
    return dot
  }

  private _worldToOverlay(p: AcExMarkupPoint2d): { x: number; y: number } {
    const rootRect = this._overlayRootRect ?? this._root.getBoundingClientRect()
    const screen = this._view.wcsToScreen(toVector2(p))
    return { x: screen.x - rootRect.left, y: screen.y - rootRect.top }
  }

  private _overlayToWorld(s: { x: number; y: number }): AcExMarkupPoint2d {
    const rootRect = this._overlayRootRect ?? this._root.getBoundingClientRect()
    return point2(
      this._view.screenToWcs(rootRect.left + s.x, rootRect.top + s.y)
    )
  }

  private _strokeGeometry(
    ctx: CanvasRenderingContext2D,
    g: AcExMarkupGeometry,
    color: string,
    lineWidth: number,
    strokeWidthWcs?: number,
    scaleArrowsWithView = false,
    arrowSizeWcs?: number
  ): void {
    const strokeWidth = this._scaledCanvasLineWidth(
      lineWidth,
      ctx.canvas,
      strokeWidthWcs
    )
    const worldToScreen = (p: AcExMarkupPoint2d) => this._worldToOverlay(p)
    const screenToWorld = (s: { x: number; y: number }) =>
      this._overlayToWorld(s)

    switch (g.type) {
      case 'arrow':
      case 'line': {
        const a = worldToScreen(g.start)
        const b = worldToScreen(g.end)
        ctx.strokeStyle = color
        ctx.lineWidth = strokeWidth
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
        if (g.type === 'arrow') {
          acexDrawMarkupArrowHead(
            ctx,
            a,
            b,
            color,
            scaleArrowsWithView
              ? acexScaledOverlayArrowSize(
                  ctx.canvas,
                  worldToScreen,
                  arrowSizeWcs
                )
              : acexOverlayArrowSize(strokeWidth, lineWidth)
          )
        }
        break
      }
      case 'rect': {
        const a = worldToScreen(g.corner1)
        const b = worldToScreen(g.corner2)
        ctx.strokeStyle = color
        ctx.lineWidth = strokeWidth
        ctx.strokeRect(
          Math.min(a.x, b.x),
          Math.min(a.y, b.y),
          Math.abs(b.x - a.x),
          Math.abs(b.y - a.y)
        )
        this._strokeAttachedCallout(ctx, g.callout, color, strokeWidth)
        break
      }
      case 'highlight': {
        const a = worldToScreen(g.corner1)
        const b = worldToScreen(g.corner2)
        const x = Math.min(a.x, b.x)
        const y = Math.min(a.y, b.y)
        const w = Math.abs(b.x - a.x)
        const h = Math.abs(b.y - a.y)
        ctx.fillStyle = color
        ctx.globalAlpha = 0.28
        ctx.fillRect(x, y, w, h)
        ctx.globalAlpha = 1
        ctx.strokeStyle = color
        ctx.lineWidth = strokeWidth
        ctx.strokeRect(x, y, w, h)
        break
      }
      case 'circle': {
        const c = worldToScreen(g.center)
        const rim = worldToScreen({
          x: g.center.x + g.radius,
          y: g.center.y
        })
        const r = Math.hypot(rim.x - c.x, rim.y - c.y)
        ctx.strokeStyle = color
        ctx.lineWidth = strokeWidth
        ctx.beginPath()
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2)
        ctx.stroke()
        this._strokeAttachedCallout(ctx, g.callout, color, strokeWidth)
        break
      }
      case 'cloud': {
        acexStrokeMarkupCloud(
          ctx,
          g.corner1,
          g.corner2,
          worldToScreen,
          screenToWorld,
          color,
          strokeWidth
        )
        this._strokeAttachedCallout(ctx, g.callout, color, strokeWidth)
        break
      }
      case 'callout': {
        const tip = worldToScreen(g.tip)
        const anchor = worldToScreen(g.anchor)
        acexDrawMarkupLeader(
          ctx,
          tip,
          anchor,
          color,
          true,
          strokeWidth,
          scaleArrowsWithView
            ? acexScaledOverlayArrowSize(
                ctx.canvas,
                worldToScreen,
                arrowSizeWcs
              )
            : acexOverlayArrowSize(strokeWidth, lineWidth)
        )
        break
      }
      default:
        break
    }
  }

  private _strokeAttachedCallout(
    ctx: CanvasRenderingContext2D,
    callout: AcExMarkupAttachedCallout | undefined,
    color: string,
    lineWidth: number
  ): void {
    if (!callout) return
    const tip = this._worldToOverlay(callout.tip)
    const anchor = this._worldToOverlay(callout.anchor)
    // Shape-attached leaders have no arrowhead (Design Review).
    acexDrawMarkupLeader(ctx, tip, anchor, color, false, lineWidth)
  }

  private _editText(id: string, badge: HTMLElement): void {
    if (this._awaitingInlineText || isAcExMarkupHtmlTextEditing()) return
    const item = this._committed.find(c => c.record.id === id)
    if (!item) return
    const g = item.record.geometry
    const attached =
      (g.type === 'cloud' || g.type === 'rect' || g.type === 'circle') &&
      g.callout
        ? g.callout
        : null
    const current = (
      attached?.text ??
      item.record.text ??
      badge.textContent ??
      ''
    ).trim()
    const multiline = item.record.type !== 'text'
    this._syncGripPointerEvents()
    void this._beginInlineText({
      el: badge,
      listenOn: badge,
      multiline,
      initialText: current
    }).then(next => {
      this._syncGripPointerEvents()
      if (next === undefined || next === current) return
      this._sessionHistory?.beginMarkupCapture()
      item.record.updatedAt = markupNow()
      if (attached) {
        attached.text = next || undefined
        item.record.text = next || undefined
      } else {
        item.record.text = next
      }
      badge.textContent =
        next.trim() || this._i18n.t('status.markupDefaultLabel')
      this._view.render()
      this._notifyRecordsChanged()
      this._sessionHistory?.commitMarkupCapture('Edit Markup')
    })
  }

  private _removeCommitted(id: string, updateStatus: boolean): void {
    const index = this._committed.findIndex(c => c.record.id === id)
    if (index < 0) return
    const item = this._committed[index]!
    for (const cleanup of item.parts.cleanups) cleanup()
    for (const el of item.parts.dom) el.remove()
    for (const canvas of item.parts.canvases) canvas.remove()
    this._committed.splice(index, 1)
    this._selectedIds.delete(id)
    if (updateStatus) this._updateIdleStatus()
  }

  private _trySelectCommittedAt(clientX: number, clientY: number): boolean {
    if (!this._visible) return false
    const hit = this._pickCommitted(clientX, clientY)
    if (!hit) {
      this._lastSelectPointer = undefined
      if (this._selectedIds.size > 0) {
        this._deselect(true)
        return true
      }
      return false
    }
    const next = {
      t: performance.now(),
      x: clientX,
      y: clientY,
      id: hit.record.id
    }
    const isDouble =
      this._lastSelectPointer?.id === hit.record.id &&
      isAcExMarkupDoublePointer(this._lastSelectPointer, next)
    this._lastSelectPointer = next

    this._select(hit.record.id)

    if (isDouble && hit.record.type !== 'stamp') {
      const badge = hit.parts.dom.find(el =>
        el.classList.contains('mlcad-markup-badge')
      )
      if (badge) {
        this._editText(hit.record.id, badge)
      }
    }

    return true
  }

  private _pickCommitted(
    clientX: number,
    clientY: number
  ): AcExCommittedMarkup | null {
    const worldToScreen = (p: AcExMarkupPoint2d) => {
      const s = this._view.wcsToScreen(toVector2(p))
      return s
    }
    for (let i = this._committed.length - 1; i >= 0; i--) {
      const item = this._committed[i]!
      if (
        !isMarkupOnLayout(item.record.layoutId, this._getActiveLayoutId?.())
      ) {
        continue
      }
      // Prefer text-box / stamp hit so labels are easy to select.
      for (const el of item.parts.dom) {
        if (
          !el.classList.contains('mlcad-markup-badge') &&
          !el.classList.contains('mlcad-markup-stamp')
        ) {
          continue
        }
        const rect = el.getBoundingClientRect()
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          return item
        }
      }
      // Endpoint grips are only hittable after the overlay is selected.
      if (this._selectedIds.has(item.record.id)) {
        for (const el of item.parts.dom) {
          if (!el.classList.contains('mlcad-markup-dot')) continue
          const rect = el.getBoundingClientRect()
          if (
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom
          ) {
            return item
          }
        }
      }
      if (
        acexHitTestMarkup(
          item.record,
          clientX,
          clientY,
          MARKUP_HIT_THRESHOLD_PX,
          worldToScreen
        )
      ) {
        return item
      }
    }
    return null
  }

  private _deselect(render: boolean): void {
    if (this._selectedIds.size === 0) return
    this._selectedIds.clear()
    this._applySelectionStyles()
    this._onStyleChange?.()
    if (render) {
      this._updateIdleStatus()
      this._view.render()
    }
    this._notifyRecordsChanged()
  }

  /**
   * Replaces the current markup selection with `next`.
   *
   * @returns True when the selected id set changed.
   */
  private _replaceSelection(next: Set<string>): boolean {
    if (
      next.size === this._selectedIds.size &&
      [...next].every(id => this._selectedIds.has(id))
    ) {
      return false
    }
    this._selectedIds.clear()
    for (const id of next) this._selectedIds.add(id)
    this._applySelectionStyles()
    this._onStyleChange?.()
    this._updateIdleStatus()
    this._view.render()
    this._notifyRecordsChanged()
    return true
  }

  private _applySelectionStyles(): void {
    for (const item of this._committed) {
      const selected = this._selectedIds.has(item.record.id)
      const baseColor = item.record.style.color || ACEX_MARKUP_COLOR
      for (const el of item.parts.dom) {
        el.classList.toggle('mlcad-markup-selected', selected)
        // Keep original colors; selection is shown via CSS glow only.
        if (
          el.classList.contains('mlcad-markup-badge') ||
          el.classList.contains('mlcad-markup-stamp')
        ) {
          el.style.color = baseColor
          el.style.borderColor = baseColor
        } else if (el.classList.contains('mlcad-markup-dot')) {
          el.style.background = baseColor
        }
      }
      for (const canvas of item.parts.canvases) {
        canvas.classList.toggle('mlcad-markup-selected', selected)
      }
    }
    for (const fn of this._redrawListeners) fn()
    this._syncGripPointerEvents()
  }

  private _positionDomOverlays(): void {
    const rootRect = this._overlayRootRect ?? this._root.getBoundingClientRect()
    const zoom = this._view.getCameraZoom()
    for (const item of this._committed) {
      for (const el of item.parts.dom) {
        const x = Number(el.dataset.wcsX)
        const y = Number(el.dataset.wcsY)
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue
        const screen = this._view.wcsToScreen(new THREE.Vector2(x, y))
        acexPositionWcsOverlay(el, screen, rootRect, zoom)
      }
    }
    const placing = this._placingShapeCallout
    if (placing) {
      this._positionTempDom(placing.badge)
      this._positionTempDom(placing.tipDot)
    }
  }

  private _resolvePointerWithOsnap(
    clientX: number,
    clientY: number,
    showMarker: boolean = true
  ): THREE.Vector2 {
    const cacheKey = this._view.getSnapCacheKey()
    if (
      this._osnapCache &&
      this._osnapCache.clientX === clientX &&
      this._osnapCache.clientY === clientY &&
      this._osnapCache.cacheKey === cacheKey
    ) {
      if (showMarker) {
        const snap = this._osnapCache.snap
        if (snap) {
          this._onOsnapMarker(
            snap,
            this._view.wcsToScreen(this._osnapCache.point)
          )
        } else {
          this._onOsnapMarker(null, null)
        }
      }
      return this._osnapCache.point
    }
    const resolved = this._view.resolvePoint(clientX, clientY)
    let point = resolved.point
    const tracking = this._getTrackingOptions?.()
    const reference =
      this._mode && this._points.length > 0
        ? this._points[this._points.length - 1]!
        : null
    if (tracking && reference && (tracking.ortho || tracking.polar)) {
      const constrained = constrainToAcExTracking(point, reference, tracking)
      point = new THREE.Vector2(constrained.x, constrained.y)
    }
    this._osnapCache = {
      clientX,
      clientY,
      cacheKey,
      point: point.clone(),
      snap: resolved.snap
    }
    if (showMarker) {
      if (resolved.snap) {
        this._onOsnapMarker(resolved.snap, this._view.wcsToScreen(point))
      } else {
        this._onOsnapMarker(null, null)
      }
    }
    return point
  }

  private _refreshActivePreview(): void {
    if (this._awaitingInlineText || isAcExMarkupHtmlTextEditing()) {
      // Keep frozen shape+leader visible while typing after anchor is placed.
      if (this._placingShapeCallout) {
        this._setPlacingCalloutChromeVisible(true)
        this._paintPlacingShapeCalloutPreview(this._placingShapeCallout, true)
      }
      return
    }
    if (
      (!this._mode && !this._placingShapeCallout) ||
      !this._lastPointer ||
      this._inOverlaySync
    ) {
      if (!this._mode && !this._placingShapeCallout) this._clearPreview()
      return
    }

    if (this._placingShapeCallout) {
      const placing = this._placingShapeCallout
      if (!this._livePointer) {
        // After the shape’s second point: keep the outline, hide capsule/leader
        // until the callout anchor is being captured.
        this._onOsnapMarker(null, null)
        this._setPlacingCalloutChromeVisible(false)
        this._paintPlacingShapeCalloutPreview(placing, false)
        return
      }
      const cursor = this._resolvePointerWithOsnap(
        this._lastPointer.x,
        this._lastPointer.y
      )
      const anchor = point2(cursor)
      const tip = acexComputeLeaderTipOnShape(placing.outline, anchor)
      placing.tip = tip
      placing.anchor = anchor
      placing.badge.dataset.wcsX = String(anchor.x)
      placing.badge.dataset.wcsY = String(anchor.y)
      placing.tipDot.dataset.wcsX = String(tip.x)
      placing.tipDot.dataset.wcsY = String(tip.y)
      this._setPlacingCalloutChromeVisible(true)
      this._positionTempDom(placing.badge)
      this._positionTempDom(placing.tipDot)
      this._paintPlacingShapeCalloutPreview(placing, true)
      return
    }

    // Rubber-band only while the pointer is live (no preview glued to the
    // last committed vertex after finger/button up). Drop the OSNAP glyph so
    // only confirmed plus marks remain until the next live sample.
    if (!this._livePointer) {
      this._onOsnapMarker(null, null)
      this._clearPreview()
      return
    }

    const cursor = this._resolvePointerWithOsnap(
      this._lastPointer.x,
      this._lastPointer.y
    )
    const ctx = acexFitMarkupCanvas(this._previewCanvas, this._root)
    if (!ctx) return
    const color = this._drawColor
    const lineWidth = acexMarkupCanvasLineWidth(ACEX_MARKUP_LINE_WEIGHT)

    if (this._points.length === 0) return
    const a = this._points[0]!
    const b = cursor

    if (this._mode === 'arrow') {
      this._strokeGeometry(
        ctx,
        { type: 'arrow', start: point2(a), end: point2(b) },
        color,
        lineWidth
      )
    } else if (this._mode === 'rect') {
      this._strokeGeometry(
        ctx,
        { type: 'rect', corner1: point2(a), corner2: point2(b) },
        color,
        lineWidth
      )
    } else if (this._mode === 'cloud') {
      acexStrokeMarkupCloud(
        ctx,
        point2(a),
        point2(b),
        p => this._worldToOverlay(p),
        s => this._overlayToWorld(s),
        color,
        this._scaledCanvasLineWidth(lineWidth, ctx.canvas)
      )
    } else if (this._mode === 'circle') {
      const radius = a.distanceTo(b)
      this._strokeGeometry(
        ctx,
        { type: 'circle', center: point2(a), radius },
        color,
        lineWidth
      )
    } else if (this._mode === 'callout') {
      const tip = this._worldToOverlay(point2(a))
      const anchor = this._worldToOverlay(point2(b))
      const scaled = this._scaledCanvasLineWidth(lineWidth, ctx.canvas)
      acexDrawMarkupLeader(
        ctx,
        tip,
        anchor,
        color,
        true,
        scaled,
        acexOverlayArrowSize(scaled, lineWidth)
      )
    }
  }

  private _paintPlacingShapeCalloutPreview(
    placing: AcExPlacingShapeCallout,
    withLeader: boolean
  ): void {
    const ctx = acexFitMarkupCanvas(this._previewCanvas, this._root)
    if (!ctx) return
    const color = this._drawColor
    const lineWidth = acexMarkupCanvasLineWidth(ACEX_MARKUP_LINE_WEIGHT)
    const outline = placing.outline
    // Existing shape is already committed; only preview the new leader.
    if (!placing.existingId) {
      if (outline.kind === 'circle') {
        this._strokeGeometry(
          ctx,
          {
            type: 'circle',
            center: outline.center,
            radius: outline.radius
          },
          color,
          lineWidth
        )
      } else if (outline.kind === 'cloud') {
        acexStrokeMarkupCloud(
          ctx,
          outline.corner1,
          outline.corner2,
          p => this._worldToOverlay(p),
          s => this._overlayToWorld(s),
          color,
          this._scaledCanvasLineWidth(lineWidth, ctx.canvas)
        )
      } else {
        this._strokeGeometry(
          ctx,
          {
            type: 'rect',
            corner1: outline.corner1,
            corner2: outline.corner2
          },
          color,
          lineWidth
        )
      }
    }
    if (!withLeader) return
    const tip = this._worldToOverlay(placing.tip)
    const anchor = this._worldToOverlay(placing.anchor)
    acexDrawMarkupLeader(
      ctx,
      tip,
      anchor,
      color,
      false,
      this._scaledCanvasLineWidth(lineWidth, ctx.canvas)
    )
  }

  /** Shows or hides the temporary callout capsule / tip while placing. */
  private _setPlacingCalloutChromeVisible(visible: boolean): void {
    const placing = this._placingShapeCallout
    if (!placing) return
    const value = visible ? 'visible' : 'hidden'
    placing.badge.style.visibility = value
    placing.tipDot.style.visibility = value
  }

  private _clearPreview(): void {
    const ctx = acexFitMarkupCanvas(this._previewCanvas, this._root)
    if (ctx) {
      // already cleared by fit
    }
  }

  private _hintForMode(mode: AcExMarkupMode): string {
    switch (mode) {
      case 'cloud':
        return this._i18n.t('status.markupCloudHint')
      case 'callout':
        return this._i18n.t('status.markupCalloutHint')
      case 'text':
        return this._i18n.t('status.markupTextHint')
      case 'rect':
        return this._i18n.t('status.markupRectHint')
      case 'circle':
        return this._i18n.t('status.markupCircleHint')
      case 'arrow':
        return this._i18n.t('status.markupArrowHint')
      case 'stamp':
        return this._i18n.t('status.markupStampHint')
      default:
        return this._getReadyStatus()
    }
  }

  private _hintForSecondPoint(
    kind: 'arrow' | 'rect' | 'cloud' | 'callout'
  ): string {
    switch (kind) {
      case 'arrow':
        return this._i18n.t('status.markupArrowEndHint')
      case 'rect':
        return this._i18n.t('status.markupRectCornerHint')
      case 'cloud':
        return this._i18n.t('status.markupCloudCornerHint')
      case 'callout':
        return this._i18n.t('status.markupCalloutAnchorHint')
    }
  }

  private _updateToolbarActive(): void {
    document.querySelectorAll('[data-markup-mode]').forEach(btn => {
      const mode = btn.getAttribute('data-markup-mode')
      btn.classList.toggle('active', mode === this._mode)
    })
    document
      .getElementById('mlcad-markup-menu-btn')
      ?.classList.toggle('active', this._mode !== null)
  }

  private _updateVisibilityToolbar(): void {
    const buttons = document.querySelectorAll(
      '[data-action="markup-visibility"]'
    )
    if (buttons.length === 0) return
    // State-oriented icon: open eye while visible, slashed eye while hidden.
    // Tooltip stays action-oriented (click to hide / show).
    const titleKey = this._visible ? 'toolbar.markupHide' : 'toolbar.markupShow'
    const icon = this._visible
      ? AcExHtmlIcons.markupShow
      : AcExHtmlIcons.markupHide
    const label = this._i18n.t(titleKey)
    buttons.forEach(btn => {
      btn.classList.toggle('active', this._visible)
      btn.classList.toggle('is-toggled', this._visible)
      btn.setAttribute('data-i18n-key', titleKey)
      btn.setAttribute('title', label)
      btn.setAttribute('aria-label', label)
      const labelEl =
        btn.querySelector('.mlcad-tool-btn-label') ??
        btn.querySelector('.mlcad-dropdown-label')
      if (labelEl) {
        labelEl.setAttribute('data-i18n-key', titleKey)
        labelEl.textContent = label
      }
      const iconHost =
        btn.querySelector('.mlcad-tool-btn-icon') ??
        btn.querySelector('.mlcad-dropdown-icon')
      if (iconHost) {
        iconHost.innerHTML = icon
      } else if (!labelEl) {
        btn.innerHTML = icon
      }
    })
  }

  private _updateIdleStatus(): void {
    if (this._mode) return
    if (this._selectedIds.size > 1) {
      this._statusEl.textContent = this._i18n.t('status.markupSelectedCount', {
        count: String(this._selectedIds.size)
      })
      return
    }
    if (this._selectedIds.size === 1) {
      const id = [...this._selectedIds][0]
      this._statusEl.textContent = this._i18n.t('status.markupSelected', {
        type: this._findRecord(id!)?.type ?? 'markup'
      })
      return
    }
    if (this._committed.length > 0) {
      this._statusEl.textContent = this._i18n.t('status.markupCount', {
        count: String(this._committed.length)
      })
      return
    }
    this._statusEl.textContent = this._getReadyStatus()
  }
}

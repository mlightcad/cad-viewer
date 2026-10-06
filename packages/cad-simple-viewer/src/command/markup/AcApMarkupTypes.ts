/**
 * Design Review–style markup domain types.
 *
 * Geometry is view-local (HTML / CAD transients), not DWG entities.
 * Persistence is via sidecar JSON ({@link AcApMarkupSidecarFile}).
 */

/** Review workflow status for a markup. */
export type AcApMarkupStatus = 'open' | 'question' | 'answered' | 'closed'

/** Visual markup kinds supported by the HTML markup system. */
export type AcApMarkupType =
  | 'text'
  | 'line'
  | 'arrow'
  | 'cloud'
  | 'rect'
  | 'circle'
  | 'highlight'
  | 'callout'
  | 'stamp'
  | 'symbol'

/** 2D world point used in markup geometry. */
export interface AcApMarkupPoint2d {
  x: number
  y: number
}

/** Drawing style stored in the sidecar (CSS-friendly). */
export interface AcApMarkupStyle {
  /** CSS color string, e.g. `#ff0000` or `rgb(255,0,0)`. */
  color: string
  /** Always hairline (`0`) on write; legacy non-zero values are ignored on parse. */
  lineWeight?: number
  /** Authoring font size in CSS pixels for text / callout bubbles (legacy / UI). */
  fontSize?: number
  /**
   * Text / callout height in world units. Prefer this over {@link fontSize}
   * when restoring overlays so size is independent of camera zoom.
   */
  textHeightWcs?: number
  /** Authoring mode; omitted means adaptive (legacy). */
  textHeightMode?: 'adaptive' | 'custom'
  /**
   * Arrow-head length in world units (arrow / callout markups). Prefer this
   * when restoring overlays so arrow size is independent of camera zoom.
   */
  arrowSizeWcs?: number
  /**
   * Legacy canvas stroke width in world units. Ignored on parse; never written.
   */
  strokeWidthWcs?: number
}

/** Shared metadata on every markup record. */
export interface AcApMarkupMeta {
  id: string
  type: AcApMarkupType
  /** Layout block-table-record id; omitted = visible on every layout. */
  layoutId?: string
  style: AcApMarkupStyle
  /** Optional on-drawing label (text / callout / stamp caption). */
  text?: string
  comment: string
  status: AcApMarkupStatus
  author: string
  createdAt: string
  updatedAt: string
}

/**
 * Optional leader + text attached to a shape markup (cloud / rect / circle).
 * Leaders for shape callouts do **not** use an arrowhead (Design Review style).
 */
export interface AcApMarkupAttachedCallout {
  tip: AcApMarkupPoint2d
  anchor: AcApMarkupPoint2d
  text?: string
}

export interface AcApMarkupTextGeometry {
  type: 'text'
  position: AcApMarkupPoint2d
}

export interface AcApMarkupLineGeometry {
  type: 'line'
  start: AcApMarkupPoint2d
  end: AcApMarkupPoint2d
}

export interface AcApMarkupArrowGeometry {
  type: 'arrow'
  start: AcApMarkupPoint2d
  end: AcApMarkupPoint2d
}

export interface AcApMarkupCloudGeometry {
  type: 'cloud'
  corner1: AcApMarkupPoint2d
  corner2: AcApMarkupPoint2d
  callout?: AcApMarkupAttachedCallout
}

export interface AcApMarkupRectGeometry {
  type: 'rect'
  corner1: AcApMarkupPoint2d
  corner2: AcApMarkupPoint2d
  callout?: AcApMarkupAttachedCallout
}

export interface AcApMarkupCircleGeometry {
  type: 'circle'
  center: AcApMarkupPoint2d
  radius: number
  callout?: AcApMarkupAttachedCallout
}

export interface AcApMarkupHighlightGeometry {
  type: 'highlight'
  corner1: AcApMarkupPoint2d
  corner2: AcApMarkupPoint2d
}

export interface AcApMarkupCalloutGeometry {
  type: 'callout'
  /** Leader tip (arrow end). */
  tip: AcApMarkupPoint2d
  /** Text bubble anchor. */
  anchor: AcApMarkupPoint2d
}

export interface AcApMarkupStampGeometry {
  type: 'stamp'
  position: AcApMarkupPoint2d
  stampId: string
  imageUrl?: string
}

export interface AcApMarkupSymbolGeometry {
  type: 'symbol'
  position: AcApMarkupPoint2d
  symbolId: string
  imageUrl?: string
}

export type AcApMarkupGeometry =
  | AcApMarkupTextGeometry
  | AcApMarkupLineGeometry
  | AcApMarkupArrowGeometry
  | AcApMarkupCloudGeometry
  | AcApMarkupRectGeometry
  | AcApMarkupCircleGeometry
  | AcApMarkupHighlightGeometry
  | AcApMarkupCalloutGeometry
  | AcApMarkupStampGeometry
  | AcApMarkupSymbolGeometry

/** One persisted markup item. */
export type AcApMarkupRecord = AcApMarkupMeta & {
  geometry: AcApMarkupGeometry
}

/** Sidecar JSON root (versioned). */
export interface AcApMarkupSidecarFile {
  version: 1
  drawingName?: string
  markups: AcApMarkupRecord[]
}

/** Listener payload for store change events. */
export type AcApMarkupStoreListener = () => void

/**
 * Design Review–style markup types for the offline HTML viewer.
 *
 * Schema matches `@mlightcad/cad-simple-viewer` sidecar JSON so markups can be
 * exchanged between the full CAD app and exported HTML files.
 *
 * @module AcExMarkupTypes
 * @packageDocumentation
 */

/** Review workflow status for a markup. */
export type AcExMarkupStatus = 'open' | 'question' | 'answered' | 'closed'

/** Visual markup kinds supported by the offline HTML markup system. */
export type AcExMarkupType =
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
export interface AcExMarkupPoint2d {
  x: number
  y: number
}

/** Drawing style stored in the sidecar (CSS-friendly). */
export interface AcExMarkupStyle {
  /** CSS color string, e.g. `#ff0000` or `rgb(255,0,0)`. */
  color: string
  /** Always hairline (`0`) on write; legacy non-zero values are ignored on parse. */
  lineWeight?: number
  /** Authoring font size in CSS pixels for text / callout bubbles (legacy / UI). */
  fontSize?: number
  /** Authoring mode; omitted means adaptive (legacy). */
  textHeightMode?: 'adaptive' | 'custom'
  /** Text / callout height in world units (preferred when restoring overlays). */
  textHeightWcs?: number
  /**
   * Arrow-head length in world units (arrow / callout markups). Preferred
   * when restoring overlays.
   */
  arrowSizeWcs?: number
  /** Legacy canvas stroke width in world units. Ignored on parse; never written. */
  strokeWidthWcs?: number
}

/** Shared metadata on every markup record. */
export interface AcExMarkupMeta {
  id: string
  type: AcExMarkupType
  /** Layout block-table-record id; omitted = visible on every layout. */
  layoutId?: string
  style: AcExMarkupStyle
  /** Optional on-drawing label (text / callout / stamp caption). */
  text?: string
  comment: string
  status: AcExMarkupStatus
  author: string
  createdAt: string
  updatedAt: string
}

/**
 * Optional leader + text attached to a shape markup (cloud / rect / circle).
 * Leaders for shape callouts do **not** use an arrowhead (Design Review style).
 */
export interface AcExMarkupAttachedCallout {
  tip: AcExMarkupPoint2d
  anchor: AcExMarkupPoint2d
  text?: string
}

export interface AcExMarkupTextGeometry {
  type: 'text'
  position: AcExMarkupPoint2d
}

export interface AcExMarkupLineGeometry {
  type: 'line'
  start: AcExMarkupPoint2d
  end: AcExMarkupPoint2d
}

export interface AcExMarkupArrowGeometry {
  type: 'arrow'
  start: AcExMarkupPoint2d
  end: AcExMarkupPoint2d
}

export interface AcExMarkupCloudGeometry {
  type: 'cloud'
  corner1: AcExMarkupPoint2d
  corner2: AcExMarkupPoint2d
  callout?: AcExMarkupAttachedCallout
}

export interface AcExMarkupRectGeometry {
  type: 'rect'
  corner1: AcExMarkupPoint2d
  corner2: AcExMarkupPoint2d
  callout?: AcExMarkupAttachedCallout
}

export interface AcExMarkupCircleGeometry {
  type: 'circle'
  center: AcExMarkupPoint2d
  radius: number
  callout?: AcExMarkupAttachedCallout
}

export interface AcExMarkupHighlightGeometry {
  type: 'highlight'
  corner1: AcExMarkupPoint2d
  corner2: AcExMarkupPoint2d
}

export interface AcExMarkupCalloutGeometry {
  type: 'callout'
  /** Leader tip (arrow end). */
  tip: AcExMarkupPoint2d
  /** Text bubble anchor. */
  anchor: AcExMarkupPoint2d
}

export interface AcExMarkupStampGeometry {
  type: 'stamp'
  position: AcExMarkupPoint2d
  stampId: string
  imageUrl?: string
}

export interface AcExMarkupSymbolGeometry {
  type: 'symbol'
  position: AcExMarkupPoint2d
  symbolId: string
  imageUrl?: string
}

export type AcExMarkupGeometry =
  | AcExMarkupTextGeometry
  | AcExMarkupLineGeometry
  | AcExMarkupArrowGeometry
  | AcExMarkupCloudGeometry
  | AcExMarkupRectGeometry
  | AcExMarkupCircleGeometry
  | AcExMarkupHighlightGeometry
  | AcExMarkupCalloutGeometry
  | AcExMarkupStampGeometry
  | AcExMarkupSymbolGeometry

/** One persisted markup item. */
export type AcExMarkupRecord = AcExMarkupMeta & {
  geometry: AcExMarkupGeometry
}

/** Sidecar JSON root (versioned). */
export interface AcExMarkupSidecarFile {
  version: 1
  drawingName?: string
  markups: AcExMarkupRecord[]
}

/** Toolbar / interactive create modes (subset of {@link AcExMarkupType}). */
export type AcExMarkupMode =
  | 'cloud'
  | 'callout'
  | 'text'
  | 'rect'
  | 'circle'
  | 'arrow'
  | 'stamp'

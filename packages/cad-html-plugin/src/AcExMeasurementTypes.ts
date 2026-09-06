/**
 * Measurement sidecar types for the offline HTML viewer.
 *
 * Schema matches `@mlightcad/cad-simple-viewer` measurement sidecar JSON so
 * measurements can be exchanged between the full CAD app and exported HTML.
 *
 * @module AcExMeasurementTypes
 * @packageDocumentation
 */

/** Measurement kinds that can be persisted in a sidecar JSON file. */
export type AcExMeasurementType =
  | 'distance'
  | 'angle'
  | 'area'
  | 'arc'
  | 'point'

/** 2D world point stored in a measurement sidecar. */
export interface AcExMeasurementPoint2d {
  x: number
  y: number
}

/** Drawing style stored in the sidecar (CSS-friendly + world-space sizes). */
export interface AcExMeasurementSidecarStyle {
  color: string
  /** Always hairline (`0`) on write; legacy non-zero values are ignored on parse. */
  lineWeight: number
  /** Authoring badge font size in CSS pixels (legacy / UI). */
  fontSize: number
  /** Authoring mode; omitted means adaptive (legacy). */
  textHeightMode?: 'adaptive' | 'custom'
  /** Badge text height in world units (preferred when restoring overlays). */
  textHeightWcs?: number
  /**
   * Distance-measurement arrow-head length in world units (preferred when
   * restoring overlays).
   */
  arrowSizeWcs?: number
  /** Legacy canvas stroke width in world units. Ignored on parse; never written. */
  strokeWidthWcs?: number
}

export interface AcExMeasurementDistanceGeometry {
  type: 'distance'
  start: AcExMeasurementPoint2d
  end: AcExMeasurementPoint2d
}

export interface AcExMeasurementAngleGeometry {
  type: 'angle'
  vertex: AcExMeasurementPoint2d
  arm1: AcExMeasurementPoint2d
  arm2: AcExMeasurementPoint2d
}

export interface AcExMeasurementAreaGeometry {
  type: 'area'
  points: AcExMeasurementPoint2d[]
}

export interface AcExMeasurementArcGeometry {
  type: 'arc'
  center: AcExMeasurementPoint2d
  radius: number
  start: AcExMeasurementPoint2d
  end: AcExMeasurementPoint2d
  /**
   * Point on the measured sweep. Distinguishes the major arc from the
   * complementary minor arc after a JSON round-trip. Omitted in legacy
   * sidecars, which always restore the shorter arc.
   */
  through?: AcExMeasurementPoint2d
}

export interface AcExMeasurementPointGeometry {
  type: 'point'
  position: AcExMeasurementPoint2d
}

export type AcExMeasurementGeometry =
  | AcExMeasurementDistanceGeometry
  | AcExMeasurementAngleGeometry
  | AcExMeasurementAreaGeometry
  | AcExMeasurementArcGeometry
  | AcExMeasurementPointGeometry

/** One committed measurement in a sidecar file. */
export interface AcExMeasurementRecord {
  id: string
  type: AcExMeasurementType
  layoutId?: string
  style: AcExMeasurementSidecarStyle
  geometry: AcExMeasurementGeometry
}

/** Sidecar JSON document for measurement overlays. */
export interface AcExMeasurementSidecarFile {
  version: 1
  drawingName?: string
  measurements: AcExMeasurementRecord[]
}

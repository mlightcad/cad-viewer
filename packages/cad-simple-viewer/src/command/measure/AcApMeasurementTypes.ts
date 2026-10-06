import type { AcGiLineWeight } from '@mlightcad/data-model'

/** Measurement kinds that can be persisted in a sidecar JSON file. */
export type AcApMeasurementType =
  | 'distance'
  | 'angle'
  | 'area'
  | 'arc'
  | 'point'

/** 2D world point stored in a measurement sidecar. */
export interface AcApMeasurementPoint2d {
  x: number
  y: number
}

/** Drawing style stored in the sidecar (CSS-friendly + world-space sizes). */
export interface AcApMeasurementSidecarStyle {
  color: string
  /** Always hairline (`0`) on write; legacy non-zero values are ignored on parse. */
  lineWeight: AcGiLineWeight
  /** Authoring badge font size in CSS pixels (legacy / UI). */
  fontSize: number
  /**
   * Badge text height in world units. Prefer this over {@link fontSize} when
   * restoring overlays so size is independent of camera zoom.
   */
  textHeightWcs?: number
  /**
   * Distance-measurement arrow-head length in world units. Prefer this when
   * restoring overlays so arrow size is independent of camera zoom.
   */
  arrowSizeWcs?: number
  /**
   * Legacy canvas stroke width in world units. Ignored on parse; never written.
   */
  strokeWidthWcs?: number
}

export interface AcApMeasurementDistanceGeometry {
  type: 'distance'
  start: AcApMeasurementPoint2d
  end: AcApMeasurementPoint2d
}

export interface AcApMeasurementAngleGeometry {
  type: 'angle'
  vertex: AcApMeasurementPoint2d
  arm1: AcApMeasurementPoint2d
  arm2: AcApMeasurementPoint2d
}

export interface AcApMeasurementAreaGeometry {
  type: 'area'
  points: AcApMeasurementPoint2d[]
}

export interface AcApMeasurementArcGeometry {
  type: 'arc'
  center: AcApMeasurementPoint2d
  radius: number
  start: AcApMeasurementPoint2d
  end: AcApMeasurementPoint2d
  /**
   * Point on the measured sweep. Distinguishes the major arc from the
   * complementary minor arc after a JSON round-trip. Omitted in legacy
   * sidecars, which always restore the shorter arc.
   */
  through?: AcApMeasurementPoint2d
}

export interface AcApMeasurementPointGeometry {
  type: 'point'
  position: AcApMeasurementPoint2d
}

export type AcApMeasurementGeometry =
  | AcApMeasurementDistanceGeometry
  | AcApMeasurementAngleGeometry
  | AcApMeasurementAreaGeometry
  | AcApMeasurementArcGeometry
  | AcApMeasurementPointGeometry

/** One committed measurement in a sidecar file. */
export interface AcApMeasurementRecord {
  id: string
  type: AcApMeasurementType
  layoutId?: string
  style: AcApMeasurementSidecarStyle
  geometry: AcApMeasurementGeometry
}

/** Sidecar JSON document for measurement overlays. */
export interface AcApMeasurementSidecarFile {
  version: 1
  drawingName?: string
  measurements: AcApMeasurementRecord[]
}

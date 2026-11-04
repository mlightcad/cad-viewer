import {
  AcCmColor,
  AcCmColorMethod,
  type AcDbDatabase,
  AcDbSystemVariables,
  AcDbSysVarManager
} from '@mlightcad/data-model'

import type {
  AcExHtmlExtents,
  AcExHtmlViewerGripAppearance,
  AcExHtmlViewerUnits
} from './AcExHtmlSnapshotTypes'

const DEFAULT_GRIP: AcExHtmlViewerGripAppearance = {
  size: 8,
  colorCss: '#0080ff',
  hotColorCss: '#ff0000'
}

function aciIndexToCss(index: number): string {
  const color = new AcCmColor(AcCmColorMethod.ByACI, index)
  return color.cssColor ?? `rgb(${color.red}, ${color.green}, ${color.blue})`
}

/**
 * Reads grip appearance from the drawing database for HTML export.
 * Falls back to AutoCAD-like defaults when sysvars are unavailable.
 */
function readExportGripAppearance(
  database: AcDbDatabase
): AcExHtmlViewerGripAppearance {
  try {
    const manager = AcDbSysVarManager.instance()
    const size = manager.getVar(
      AcDbSystemVariables.GRIPSIZE,
      database
    ) as number
    const gripColor = manager.getVar(
      AcDbSystemVariables.GRIPCOLOR,
      database
    ) as number
    const gripHot = manager.getVar(
      AcDbSystemVariables.GRIPHOT,
      database
    ) as number
    if (!(size > 0) || !Number.isFinite(size)) return DEFAULT_GRIP
    return {
      size,
      colorCss: aciIndexToCss(gripColor),
      hotColorCss: aciIndexToCss(gripHot)
    }
  } catch {
    return DEFAULT_GRIP
  }
}

/** Return type of {@link acexHtmlBuildViewerMetadata}. */
export interface AcExHtmlViewerMetadata {
  /** Optional drawing title copied into the snapshot. */
  title?: string
  /** Axis-aligned extents from the database `EXTMIN` / `EXTMAX`. */
  extents: AcExHtmlExtents
  /** Unit and formatting sysvars for the offline viewer. */
  units: AcExHtmlViewerUnits
  /** CAD entity square-grip appearance from `GRIPSIZE` / `GRIPCOLOR` / `GRIPHOT`. */
  grip: AcExHtmlViewerGripAppearance
  /** Canvas background color as 24-bit RGB hex. */
  background: number
}

/**
 * Extracts viewer metadata from an open drawing database (units, extents).
 * Does not serialize entities or DXF/DWG content.
 *
 * Object-snap (OSNAP) curve/point definitions are **not** part of this metadata
 * object. They are stored per layout in {@link AcExHtmlLayoutSnapshot.osnap}
 * (curves/points only; straight lines come from `lineBatches` at runtime).
 *
 * @param database - Open `AcDbDatabase` to read sysvars and extents from.
 * @param options - Optional title override and background color (default `0x000000`).
 * @returns Metadata object suitable for {@link AcExHtmlSnapshot.meta}.
 */
export function acexHtmlBuildViewerMetadata(
  database: AcDbDatabase,
  options?: { title?: string; background?: number }
): AcExHtmlViewerMetadata {
  const extmin = database.extmin
  const extmax = database.extmax
  const grip = readExportGripAppearance(database)
  return {
    title: options?.title,
    extents: {
      minX: extmin.x,
      minY: extmin.y,
      maxX: extmax.x,
      maxY: extmax.y
    },
    units: {
      insunits: database.insunits,
      lunits: database.lunits,
      luprec: database.luprec,
      aunits: database.aunits,
      auprec: database.auprec,
      measurement: database.measurement,
      ltscale: database.ltscale,
      angbase: database.angbase,
      angdir: database.angdir
    },
    grip,
    background: options?.background ?? 0x000000
  }
}

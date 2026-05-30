import type { AcDbDatabase } from '@mlightcad/data-model'

import type { AcExExtents, AcExViewerUnits } from './AcExSnapshotTypes'

/** Return type of {@link buildViewerMetadata}. */
export interface AcExViewerMetadata {
  /** Optional drawing title copied into the snapshot. */
  title?: string
  /** Axis-aligned extents from the database `EXTMIN` / `EXTMAX`. */
  extents: AcExExtents
  /** Unit and formatting sysvars for the offline viewer. */
  units: AcExViewerUnits
  /** Canvas background color as 24-bit RGB hex. */
  background: number
}

/**
 * Extracts viewer metadata from an open drawing database (units, extents).
 * Does not serialize entities or DXF/DWG content.
 *
 * Object-snap (OSNAP) curve and line definitions are **not** part of this
 * metadata object. They are stored per layout in
 * {@link AcExLayoutSnapshot.osnap}, built by {@link buildOsnapCatalog} at export time.
 *
 * @param database - Open `AcDbDatabase` to read sysvars and extents from.
 * @param options - Optional title override and background color (default `0x000000`).
 * @returns Metadata object suitable for {@link AcExSnapshotV1.meta}.
 */
export function buildViewerMetadata(
  database: AcDbDatabase,
  options?: { title?: string; background?: number }
): AcExViewerMetadata {
  const extmin = database.extmin
  const extmax = database.extmax
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
    background: options?.background ?? 0x000000
  }
}

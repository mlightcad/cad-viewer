/**
 * Deprecated aliases kept so existing imports from `@mlightcad/cad-pdf-plugin`
 * keep working. Shape matching moved to `@mlightcad/cad-simple-viewer` where
 * `BSEARCH` / `-BSEARCH` and `pdfblock` share it.
 */

import {
  type AcEdAffine2d,
  acedApplyAffine2d,
  acedEntityToShapeFeature,
  acedFindShapeMatches,
  type AcEdShapeFeature,
  type AcEdShapeMatch,
  type AcEdShapeMatchOptions
} from '@mlightcad/cad-simple-viewer'
import type { AcDbEntity } from '@mlightcad/data-model'

/** @deprecated Use `AcEdShapeFeature` from `@mlightcad/cad-simple-viewer`. */
export type PdfMatchFeature<Id = unknown> = AcEdShapeFeature<Id>
/** @deprecated Use `AcEdAffine2d` from `@mlightcad/cad-simple-viewer`. */
export type PdfAffine = AcEdAffine2d
/** @deprecated Use `AcEdShapeMatch` from `@mlightcad/cad-simple-viewer`. */
export type PdfShapeMatch<Id = unknown> = AcEdShapeMatch<Id>
/** @deprecated Use `AcEdShapeMatchOptions` from `@mlightcad/cad-simple-viewer`. */
export type PdfShapeMatchOptions = AcEdShapeMatchOptions

/** @deprecated Use `acedApplyAffine2d` from `@mlightcad/cad-simple-viewer`. */
export const applyPdfAffine = acedApplyAffine2d
/** @deprecated Use `acedFindShapeMatches` from `@mlightcad/cad-simple-viewer`. */
export const findPdfShapeMatches = acedFindShapeMatches

/**
 * Describes an entity for matching, ignoring its layer (the old behavior).
 *
 * @deprecated Use `acedEntityToShapeFeature` from
 * `@mlightcad/cad-simple-viewer`.
 */
export function pdfEntityToFeature<Id>(
  entity: AcDbEntity,
  id: Id
): AcEdShapeFeature<Id> | undefined {
  return acedEntityToShapeFeature(entity, id, { matchLayer: false })
}

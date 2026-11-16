export * from './app/index.js'
export * from './util/index.js'
export * from './service/index.js'
export * from './command/index.js'
export * from './editor/index.js'
export * from './find/index.js'
export * from './i18n/index.js'
export * from './plugin/index.js'
export * from './smartBlock/index.js'
export * from './view/index.js'
export * from './ui/index.js'
// Public view APIs (e.g. `AcTrLayout.spatialIndexStats`) return these types;
// without a root export, inferred declarations in dependents reference
// `lib/spatialIndex`, which the package `exports` map does not expose.
export type {
  AcTrSpatialIndexBBox,
  AcTrSpatialIndexKind,
  AcTrSpatialIndexStats,
  AcTrSpatialSearchOptions,
  AcTrSpatialSelectionMode
} from './spatialIndex/AcTrSpatialIndex.js'
export {
  MTextColor,
  MTextParagraphAlignment,
  MTextParagraphAlignment as AcGiTextParagraphAlignment
} from '@mlightcad/mtext-parser'
export { type MTextToolbarColorPickerFactory } from '@mlightcad/mtext-input-box'

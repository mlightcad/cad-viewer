/**
 * Re-export the shared dim-style preview builder from cad-simple-viewer so the
 * Dimension Style Manager and framework-free palettes (e.g. `pdfdim`) stay in
 * sync without duplicating the SVG scene logic.
 */
export {
  buildDimStylePreview,
  DIM_PREVIEW_HEIGHT,
  DIM_PREVIEW_WIDTH,
  type DimPreviewCircle,
  type DimPreviewLine,
  type DimPreviewPath,
  type DimPreviewScene,
  type DimPreviewText
} from '@mlightcad/cad-simple-viewer'

/**
 * Minimal UI surface from `cad-simple-viewer` for the offline HTML viewer runtime.
 *
 * Keep imports here so the viewer IIFE only pulls dialog/palette modules via
 * tree-shaking, not the full viewer package.
 *
 * @module AcExHtmlSimpleViewerUi
 * @packageDocumentation
 */

export { AcUiAciColorDialog } from '@mlightcad/cad-simple-viewer'

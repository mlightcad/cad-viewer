/**
 * Re-exports unsupported-drawing analysis from cad-simple-viewer for host apps
 * that previously imported these helpers from cad-viewer.
 */
export {
  acapAnalyzeUnsupportedDrawing as analyzeUnsupportedDrawing,
  acapIsTianzhengClass as isTianzhengClass,
  acapIsTianzhengClassName as isTianzhengClassName,
  type AcApUnsupportedDrawingAnalysis as UnsupportedDrawingAnalysis
} from '@mlightcad/cad-simple-viewer'

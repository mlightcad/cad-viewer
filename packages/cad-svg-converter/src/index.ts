/**
 * SVG → AcDbDatabase converter for MLightCAD File → Open.
 *
 * @packageDocumentation
 */

export { AcDbSvgConverter } from './AcDbSvgConverter'
export { ACDB_SVG_FILE_TYPE, type AcDbSvgFileType } from './AcDbSvgFileType'
export { registerSvgConverter } from './registerSvgConverter'
export { acdbSvgParseDocument } from './svgParse'
export { acdbSvgModelToEntities } from './svgToEntities'
export type {
  AcDbSvgModel,
  AcDbSvgPoint,
  AcDbSvgPrimitive,
  AcDbSvgStyle,
  AcDbSvgViewBox
} from './svgTypes'

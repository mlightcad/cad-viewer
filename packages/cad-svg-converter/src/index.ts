/**
 * SVG → AcDbDatabase converter for MLightCAD File → Open.
 *
 * @packageDocumentation
 */

export { AcDbSvgConverter } from './AcDbSvgConverter.js'
export { ACDB_SVG_FILE_TYPE, type AcDbSvgFileType } from './AcDbSvgFileType.js'
export { registerSvgConverter } from './registerSvgConverter.js'
export { acdbSvgParseDocument } from './svgParse.js'
export { acdbSvgModelToEntities } from './svgToEntities.js'
export type {
  AcDbSvgModel,
  AcDbSvgPoint,
  AcDbSvgPrimitive,
  AcDbSvgStyle,
  AcDbSvgViewBox
} from './svgTypes.js'

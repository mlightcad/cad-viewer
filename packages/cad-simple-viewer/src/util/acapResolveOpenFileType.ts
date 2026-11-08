import {
  type AcDbConverterType,
  AcDbFileType
} from '@mlightcad/data-model'

/**
 * Maps a drawing file name to the converter key used by
 * {@link AcDbDatabase.read}.
 *
 * - `.dwg` → {@link AcDbFileType.DWG}
 * - `.dxf` → {@link AcDbFileType.DXF}
 * - `.svg` → `'svg'` (requires a registered SVG converter)
 * - anything else → {@link AcDbFileType.DXF} (legacy fallback)
 */
export function acapResolveOpenFileType(fileName: string): AcDbConverterType {
  const fileExtension = fileName.split('.').pop()?.toLocaleLowerCase()
  if (fileExtension === 'dwg') return AcDbFileType.DWG
  if (fileExtension === 'dxf') return AcDbFileType.DXF
  if (fileExtension === 'svg') return 'svg'
  return AcDbFileType.DXF
}

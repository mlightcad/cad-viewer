/**
 * Converter key registered with {@link AcDbDatabaseConverterManager} for SVG
 * open. Matches the lowercase file extension used by
 * {@link AcDbDatabase.openUri} for unknown formats.
 */
export const ACDB_SVG_FILE_TYPE = 'svg' as const

export type AcDbSvgFileType = typeof ACDB_SVG_FILE_TYPE

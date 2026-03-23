import { AcDbDatabase } from './AcDbDatabase'
import { AcDbSymbolTable } from './AcDbSymbolTable'
import { AcDbTextStyleTableRecord } from './AcDbTextStyleTableRecord'

/**
 * Symbol table for text style table records.
 *
 * This class manages text style table records which represent text styles
 * within a drawing database. Text styles define the appearance and properties
 * of text entities, including font, size, and other formatting options.
 *
 * @example
 * ```typescript
 * const textStyleTable = new AcDbTextStyleTable(database);
 * const fonts = textStyleTable.fonts;
 * console.log('Available fonts:', fonts);
 * ```
 */
export class AcDbTextStyleTable extends AcDbSymbolTable<AcDbTextStyleTableRecord> {
  /**
   * Creates a new AcDbTextStyleTable instance.
   *
   * @param db - The database this text style table belongs to
   *
   * @example
   * ```typescript
   * const textStyleTable = new AcDbTextStyleTable(database);
   * ```
   */
  constructor(db: AcDbDatabase) {
    super(db)
  }

  /**
   * Gets all fonts used in text styles.
   *
   * This method iterates through all text style table records and extracts
   * the font names from both the primary font file and big font file.
   * Font names are normalized by removing file extensions and converting to lowercase.
   *
   * @returns Array of unique font names used in text styles
   *
   * @example
   * ```typescript
   * const fonts = textStyleTable.fonts;
   * console.log('Available fonts:', fonts);
   * // Output: ['arial', 'times', 'calibri', ...]
   * ```
   */
  get fonts() {
    const fonts = new Set<string>()
    const setFontName = (fontFileName: string) => {
      if (fontFileName) {
        const lastDotIndex = fontFileName.lastIndexOf('.')
        if (lastDotIndex >= 0) {
          const fontName = fontFileName.substring(0, lastDotIndex).toLowerCase()
          fonts.add(fontName)
        } else {
          fonts.add(fontFileName.toLowerCase())
        }
      }
    }

    const iterator = this.newIterator()
    for (const item of iterator) {
      setFontName(item.fileName)
      setFontName(item.bigFontFileName)
    }
    return Array.from(fonts)
  }
}

import { AcDbDxfFiler } from '../base/AcDbDxfFiler'
import { AcDbObject } from '../base/AcDbObject'

/**
 * The AcDbRasterImageDef object (or "image definition object") works with the AcDbRasterImage entity
 * (or "image entity") to implement raster images inside AutoCAD.
 *
 * The relationship between these two classes is much like the relationship between an AutoCAD block
 * definition object and a block insert entity. The image definition object plays a behind-the-scenes
 * role like the block definition, maintaining links to the source image file and managing low-level
 * image processing operations required to display and plot images. Image definition objects are stored
 * in a special AcDbDictionary named ISM_RASTER_IMAGE_DICT.
 *
 * @example
 * ```typescript
 * const imageDef = new AcDbRasterImageDef();
 * imageDef.sourceFileName = '/path/to/image.jpg';
 * ```
 */
export class AcDbRasterImageDef extends AcDbObject {
  /** The path name of the externally referenced image file */
  private _sourceFileName: string

  /**
   * Creates a new AcDbRasterImageDef instance.
   *
   * @example
   * ```typescript
   * const imageDef = new AcDbRasterImageDef();
   * ```
   */
  constructor() {
    super()
    this._sourceFileName = ''
  }

  /**
   * Gets the path name of the externally referenced image file.
   *
   * @returns The source file name/path
   *
   * @example
   * ```typescript
   * const fileName = imageDef.sourceFileName;
   * console.log('Image file:', fileName);
   * ```
   */
  get sourceFileName() {
    return this._sourceFileName
  }

  /**
   * Sets the path name of the externally referenced image file.
   *
   * @param value - The new source file name/path
   *
   * @example
   * ```typescript
   * imageDef.sourceFileName = '/path/to/image.jpg';
   * ```
   */
  set sourceFileName(value: string) {
    this._sourceFileName = value
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbRasterImageDef')
    filer.writeString(1, this.sourceFileName)
    filer.writeInt16(280, 1)
    filer.writeInt16(281, 0)
    return this
  }
}

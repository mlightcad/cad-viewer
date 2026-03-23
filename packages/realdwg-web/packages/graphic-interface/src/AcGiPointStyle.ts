/**
 * Point style
 */
export interface AcGiPointStyle {
  /**
   * Point display mode. Please get more details on value of this property from [this page](https://help.autodesk.com/view/ACDLT/2022/ENU/?guid=GUID-82F9BB52-D026-4D6A-ABA6-BF29641F459B).
   */
  displayMode: number
  /**
   * Point display size.
   * - 0: Creates a point at 5 percent of the drawing area height
   * - > 0: Specifies an absolute size
   * - < 0: Specifies a percentage of the viewport size
   */
  displaySize: number
}

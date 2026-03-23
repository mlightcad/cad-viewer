import {
  AcGeBox3d,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/geometry-engine'
import {
  AcGiEntity,
  AcGiMTextAttachmentPoint,
  AcGiMTextData,
  AcGiMTextFlowDirection,
  AcGiRenderer,
  AcGiTextStyle
} from '@mlightcad/graphic-interface'

import { AcDbDxfFiler } from '../base'
import { AcDbOsnapMode, DEFAULT_TEXT_STYLE } from '../misc'
import { AcDbEntity } from './AcDbEntity'
import { AcDbEntityProperties } from './AcDbEntityProperties'

/**
 * Defines the horizontal alignment mode for text entities.
 */
export enum AcDbTextHorizontalMode {
  /** Left-aligned text */
  LEFT = 0,
  /** Center-aligned text */
  CENTER = 1,
  /** Right-aligned text */
  RIGHT = 2,
  /** Aligned text (fits between two points) */
  ALIGNED = 3,
  /** Middle-aligned text */
  MIDDLE = 4,
  /** Fit text (scales to fit between two points) */
  FIT = 5
}

/**
 * Defines the vertical alignment mode for text entities.
 */
export enum AcDbTextVerticalMode {
  /** Baseline-aligned text */
  BASELINE = 0,
  /** Bottom-aligned text */
  BOTTOM = 1,
  /** Middle-aligned text */
  MIDDLE = 2,
  /** Top-aligned text */
  TOP = 3
}

/**
 * Represents a text entity in AutoCAD.
 *
 * A text entity is a 2D geometric object that displays text strings in drawings.
 * Text entities can have various properties including position, height, rotation,
 * alignment, and style. Text is always drawn in the plane defined by its normal vector.
 *
 * @example
 * ```typescript
 * // Create a text entity
 * const text = new AcDbText();
 * text.textString = "Hello, World!";
 * text.position = new AcGePoint3d(0, 0, 0);
 * text.height = 2.5;
 * text.horizontalMode = AcDbTextHorizontalMode.CENTER;
 * text.verticalMode = AcDbTextVerticalMode.BASELINE;
 *
 * // Access text properties
 * console.log(`Text: ${text.textString}`);
 * console.log(`Position: ${text.position}`);
 * console.log(`Height: ${text.height}`);
 * ```
 */
export class AcDbText extends AcDbEntity {
  /** The entity type name */
  static override typeName: string = 'Text'

  /** The text string content */
  private _textString: string
  /** The thickness (extrusion) of the text */
  private _thickness: number
  /** The height of the text */
  private _height: number
  /** The insertion point of the text */
  private _position: AcGePoint3d
  /** The rotation angle of the text */
  private _rotation: number
  /** The oblique angle of the text */
  private _oblique: number
  /** The horizontal alignment mode */
  private _horizontalMode: AcDbTextHorizontalMode
  /** The vertical alignment mode */
  private _verticalModel: AcDbTextVerticalMode
  /** The text style name */
  private _styleName: string
  /** The width factor (scale) of the text */
  private _widthFactor: number

  /**
   * Creates a new text entity.
   *
   * This constructor initializes a text entity with default values.
   * The text string is empty, height is 0, and position is at the origin.
   *
   * @example
   * ```typescript
   * const text = new AcDbText();
   * text.textString = "Sample Text";
   * text.position = new AcGePoint3d(10, 20, 0);
   * text.height = 3.0;
   * ```
   */
  constructor() {
    super()
    this._textString = ''
    this._height = 0
    this._thickness = 1
    this._position = new AcGePoint3d()
    this._rotation = 0
    this._oblique = 0
    this._horizontalMode = AcDbTextHorizontalMode.LEFT
    this._verticalModel = AcDbTextVerticalMode.MIDDLE
    this._styleName = ''
    this._widthFactor = 1
  }

  /**
   * Gets the text string content of this entity.
   *
   * @returns The text string
   *
   * @example
   * ```typescript
   * const content = text.textString;
   * console.log(`Text content: ${content}`);
   * ```
   */
  get textString() {
    return this._textString
  }

  /**
   * Sets the text string content of this entity.
   *
   * @param value - The new text string
   *
   * @example
   * ```typescript
   * text.textString = "New text content";
   * ```
   */
  set textString(value: string) {
    this._textString = value
  }

  /**
   * Gets the thickness of the text.
   *
   * The thickness is the text's dimension along its normal vector direction
   * (sometimes called the extrusion direction).
   *
   * @returns The thickness value
   *
   * @example
   * ```typescript
   * const thickness = text.thickness;
   * console.log(`Text thickness: ${thickness}`);
   * ```
   */
  get thickness() {
    return this._thickness
  }

  /**
   * Sets the thickness of the text.
   *
   * @param value - The new thickness value
   *
   * @example
   * ```typescript
   * text.thickness = 2.0;
   * ```
   */
  set thickness(value: number) {
    this._thickness = value
  }

  /**
   * Gets the height of the text.
   *
   * The height value is used as a scale factor for both height and width
   * of the text.
   *
   * @returns The height value
   *
   * @example
   * ```typescript
   * const height = text.height;
   * console.log(`Text height: ${height}`);
   * ```
   */
  get height() {
    return this._height
  }

  /**
   * Sets the height of the text.
   *
   * @param value - The new height value
   *
   * @example
   * ```typescript
   * text.height = 5.0;
   * ```
   */
  set height(value: number) {
    this._height = value
  }

  /**
   * Gets the insertion point of the text in WCS coordinates.
   *
   * @returns The insertion point as a 3D point
   *
   * @example
   * ```typescript
   * const position = text.position;
   * console.log(`Text position: ${position.x}, ${position.y}, ${position.z}`);
   * ```
   */
  get position() {
    return this._position
  }

  /**
   * Sets the insertion point of the text in WCS coordinates.
   *
   * @param value - The new insertion point
   *
   * @example
   * ```typescript
   * text.position = new AcGePoint3d(15, 25, 0);
   * ```
   */
  set position(value: AcGePoint3d) {
    this._position.copy(value)
  }

  /**
   * Gets the rotation angle of the text.
   *
   * The rotation angle is relative to the X axis of the text's OCS,
   * with positive angles going counterclockwise when looking down the Z axis
   * toward the origin.
   *
   * @returns The rotation angle in radians
   *
   * @example
   * ```typescript
   * const rotation = text.rotation;
   * console.log(`Text rotation: ${rotation} radians (${rotation * 180 / Math.PI} degrees)`);
   * ```
   */
  get rotation() {
    return this._rotation
  }

  /**
   * Sets the rotation angle of the text.
   *
   * @param value - The new rotation angle in radians
   *
   * @example
   * ```typescript
   * text.rotation = Math.PI / 4; // 45 degrees
   * ```
   */
  set rotation(value: number) {
    this._rotation = value
  }

  /**
   * Gets the oblique angle of the text.
   *
   * The oblique angle is the angle from the text's vertical; that is, the top
   * of the text "slants" relative to the bottom, similar to italic text.
   * Positive angles slant characters forward at their tops.
   *
   * @returns The oblique angle in radians
   *
   * @example
   * ```typescript
   * const oblique = text.oblique;
   * console.log(`Text oblique angle: ${oblique} radians`);
   * ```
   */
  get oblique() {
    return this._oblique
  }

  /**
   * Sets the oblique angle of the text.
   *
   * @param value - The new oblique angle in radians
   *
   * @example
   * ```typescript
   * text.oblique = Math.PI / 6; // 30 degrees
   * ```
   */
  set oblique(value: number) {
    this._oblique = value
  }

  /**
   * Gets the horizontal alignment mode of the text.
   *
   * @returns The horizontal alignment mode
   *
   * @example
   * ```typescript
   * const horizontalMode = text.horizontalMode;
   * console.log(`Horizontal mode: ${horizontalMode}`);
   * ```
   */
  get horizontalMode() {
    return this._horizontalMode
  }

  /**
   * Sets the horizontal alignment mode of the text.
   *
   * @param value - The new horizontal alignment mode
   *
   * @example
   * ```typescript
   * text.horizontalMode = AcDbTextHorizontalMode.CENTER;
   * ```
   */
  set horizontalMode(value: AcDbTextHorizontalMode) {
    this._horizontalMode = value
  }

  /**
   * Gets the vertical alignment mode of the text.
   *
   * @returns The vertical alignment mode
   *
   * @example
   * ```typescript
   * const verticalMode = text.verticalMode;
   * console.log(`Vertical mode: ${verticalMode}`);
   * ```
   */
  get verticalMode() {
    return this._verticalModel
  }

  /**
   * Sets the vertical alignment mode of the text.
   *
   * @param value - The new vertical alignment mode
   *
   * @example
   * ```typescript
   * text.verticalMode = AcDbTextVerticalMode.BASELINE;
   * ```
   */
  set verticalMode(value: AcDbTextVerticalMode) {
    this._verticalModel = value
  }

  /**
   * Gets the style name used by this text entity.
   *
   * @returns The text style name
   *
   * @example
   * ```typescript
   * const styleName = text.styleName;
   * console.log(`Text style: ${styleName}`);
   * ```
   */
  get styleName() {
    return this._styleName
  }

  /**
   * Sets the style name for this text entity.
   *
   * @param value - The new text style name
   *
   * @example
   * ```typescript
   * text.styleName = DEFAULT_TEXT_STYLE;
   * ```
   */
  set styleName(value: string) {
    this._styleName = value
  }

  /**
   * Gets the width factor of the text.
   *
   * The width factor is applied to the text's width to allow the width to be
   * adjusted independently of the height. For example, if the widthFactor value
   * is 0.8, then the text is drawn with a width that is 80% of its normal width.
   *
   * @returns The width factor value
   *
   * @example
   * ```typescript
   * const widthFactor = text.widthFactor;
   * console.log(`Width factor: ${widthFactor}`);
   * ```
   */
  get widthFactor() {
    return this._widthFactor
  }

  /**
   * Sets the width factor of the text.
   *
   * @param value - The new width factor value
   *
   * @example
   * ```typescript
   * text.widthFactor = 0.8; // 80% width
   * ```
   */
  set widthFactor(value: number) {
    this._widthFactor = value
  }

  /**
   * Gets the geometric extents (bounding box) of this text.
   *
   * @returns The bounding box that encompasses the text
   *
   * @example
   * ```typescript
   * const extents = text.geometricExtents;
   * console.log(`Text bounds: ${extents.minPoint} to ${extents.maxPoint}`);
   * ```
   */
  get geometricExtents(): AcGeBox3d {
    // TODO: Implement it correctly
    return new AcGeBox3d()
  }

  /**
   * Gets the object snap points for this text.
   *
   * Object snap points are precise points that can be used for positioning
   * when drawing or editing. This method provides snap points based on the
   * specified snap mode.
   *
   * @param osnapMode - The object snap mode
   * @param _pickPoint - The point where the user picked
   * @param _lastPoint - The last point
   * @param snapPoints - Array to populate with snap points
   */
  subGetOsnapPoints(
    osnapMode: AcDbOsnapMode,
    _pickPoint: AcGePoint3dLike,
    _lastPoint: AcGePoint3dLike,
    snapPoints: AcGePoint3dLike[]
  ) {
    if (AcDbOsnapMode.Insertion === osnapMode) {
      snapPoints.push(this._position)
    }
  }

  /**
   * Returns the full property definition for this text entity, including
   * general group and geometry group.
   *
   * The geometry group exposes editable start/end coordinates via
   * {@link AcDbPropertyAccessor} so the property palette can update
   * the text in real-time.
   *
   * Each property is an {@link AcDbEntityRuntimeProperty}.
   */
  get properties(): AcDbEntityProperties {
    return {
      type: this.type,
      groups: [
        this.getGeneralProperties(),
        {
          groupName: 'text',
          properties: [
            {
              name: 'contents',
              type: 'string',
              editable: true,
              accessor: {
                get: () => this.textString,
                set: (v: string) => {
                  this.textString = v
                }
              }
            },
            {
              name: 'styleName',
              type: 'string',
              editable: true,
              accessor: {
                get: () => this.styleName,
                set: (v: string) => {
                  this.styleName = v
                }
              }
            },
            {
              name: 'textHeight',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.height,
                set: (v: number) => {
                  this.height = v
                }
              }
            },
            {
              name: 'rotation',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.rotation,
                set: (v: number) => {
                  this.rotation = v
                }
              }
            },
            {
              name: 'widthFactor',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.widthFactor,
                set: (v: number) => {
                  this.widthFactor = v
                }
              }
            },
            {
              name: 'oblique',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.oblique,
                set: (v: number) => {
                  this.oblique = v
                }
              }
            }
          ]
        },
        {
          groupName: 'geometry',
          properties: [
            {
              name: 'positionX',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.position.x,
                set: (v: number) => {
                  this.position.x = v
                }
              }
            },
            {
              name: 'positionY',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.position.y,
                set: (v: number) => {
                  this.position.y = v
                }
              }
            },
            {
              name: 'positionZ',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.position.z,
                set: (v: number) => {
                  this.position.z = v
                }
              }
            }
          ]
        }
      ]
    }
  }

  /**
   * Gets the text style for this text entity.
   *
   * This method retrieves the text style from the text style table.
   * If the specified style is not found, it falls back to the 'STANDARD' style.
   *
   * @returns The text style object
   *
   * @example
   * ```typescript
   * const textStyle = text.getTextStyle();
   * ```
   */
  protected getTextStyle(): AcGiTextStyle {
    const textStyleTable = this.database.tables.textStyleTable
    let style = textStyleTable.getAt(this.styleName)
    if (!style) {
      style = (textStyleTable.getAt(DEFAULT_TEXT_STYLE) ||
        textStyleTable.getAt(DEFAULT_TEXT_STYLE))!
    }
    return style.textStyle
  }

  /**
   * Draws this text using the specified renderer.
   *
   * This method renders the text as a multiline text entity using the text's
   * current style properties.
   *
   * @param renderer - The renderer to use for drawing
   * @param delay - The flag to delay creating one rendered entity and just create one dummy
   * entity. Renderer can delay heavy calculation operation to avoid blocking UI when this flag
   * is true.
   * @returns The rendered text entity, or undefined if drawing failed
   */
  subWorldDraw(
    renderer: AcGiRenderer,
    delay?: boolean
  ): AcGiEntity | undefined {
    const mtextData: AcGiMTextData = {
      text: this.textString,
      height: this.height,
      width: Infinity,
      widthFactor: this.widthFactor,
      position: this.position,
      // Please use 'rotation' and do not set value of 'directionVector' because it will overrides
      // rotation value.
      rotation: this.rotation,
      // MText draw text from top to bottom.
      drawingDirection: AcGiMTextFlowDirection.BOTTOM_TO_TOP,
      attachmentPoint: AcGiMTextAttachmentPoint.BottomLeft
    }
    return renderer.mtext(mtextData, this.getTextStyle(), delay)
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbText')
    filer.writePoint3d(10, this.position)
    filer.writeDouble(39, this.thickness)
    filer.writeDouble(40, this.height)
    filer.writeString(1, this.textString)
    filer.writeAngle(50, this.rotation)
    filer.writeDouble(41, this.widthFactor)
    filer.writeAngle(51, this.oblique)
    filer.writeString(7, this.styleName)
    filer.writeInt16(72, this.horizontalMode)
    filer.writeInt16(73, this.verticalMode)
    filer.writePoint3d(11, this.position)
    return this
  }
}

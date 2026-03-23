import { AcGeBox3d, AcGePoint3d } from '@mlightcad/geometry-engine'
import {
  AcGiEntity,
  AcGiRenderer,
  AcGiViewport
} from '@mlightcad/graphic-interface'

import { AcDbDxfFiler } from '../base'
import { AcDbEntity } from './AcDbEntity'

/**
 * Represents a viewport entity in AutoCAD drawings.
 *
 * A viewport is a rectangular window that displays a portion of the drawing model space
 * within paper space layouts. Viewports allow users to create multiple views of the same
 * drawing at different scales and orientations on a single sheet.
 *
 * Key characteristics:
 * - Viewports exist primarily in paper space layouts
 * - Each viewport has a unique ID number (except the default system viewport with ID 1)
 * - Viewports can be active or inactive
 * - The viewport entity itself is drawn as a rectangular border in paper space
 *
 * @example
 * ```typescript
 * const viewport = new AcDbViewport();
 * viewport.centerPoint = new AcGePoint3d(0, 0, 0);
 * viewport.width = 10;
 * viewport.height = 8;
 * viewport.number = 2;
 * ```
 */
export class AcDbViewport extends AcDbEntity {
  /** The entity type name */
  static override typeName: string = 'Viewport'

  private _centerPoint: AcGePoint3d
  private _height: number
  private _width: number
  private _viewCenter: AcGePoint3d
  private _viewHeight: number
  private _number: number

  /**
   * Creates a new AcDbViewport instance.
   *
   * Initializes all properties with default values:
   * - centerPoint: origin (0,0,0)
   * - height: 0
   * - width: 0
   * - viewCenter: origin (0,0,0)
   * - viewHeight: 0
   * - number: -1 (indicating inactive viewport)
   */
  constructor() {
    super()
    this._centerPoint = new AcGePoint3d()
    this._height = 0
    this._width = 0
    this._viewCenter = new AcGePoint3d()
    this._viewHeight = 0
    this._number = -1
  }

  /**
   * Gets or sets the viewport ID number.
   *
   * This is the number that is reported by the AutoCAD CVPORT system variable
   * when the viewport is the current viewport in the AutoCAD editor. If the viewport is inactive, -1
   * is returned.
   *
   * Important notes:
   * - This value is not saved with the drawing, and changes each time the drawing is opened
   * - Viewport ID 1 is reserved for the system-defined default viewport in paper space
   * - Active viewports have IDs greater than 1
   * - Inactive viewports return -1
   *
   * @returns The viewport ID number
   */
  get number() {
    return this._number
  }
  set number(value: number) {
    this._number = value
  }

  /**
   * Gets or sets the center point of the viewport entity in WCS coordinates (within Paper Space).
   *
   * This point represents the geometric center of the viewport's rectangular boundary
   * in paper space coordinates, not the center of the model space view within the viewport.
   *
   * @returns The center point of the viewport entity
   */
  get centerPoint() {
    return this._centerPoint
  }
  set centerPoint(value: AcGePoint3d) {
    this._centerPoint = value
  }

  /**
   * Gets or sets the height of the viewport entity's window in drawing units.
   *
   * This represents the height of the viewport's rectangular boundary in paper space,
   * measured in the current drawing units. It defines the vertical extent of the
   * viewport border, not the height of the model space view within it.
   *
   * @returns The height of the viewport entity in drawing units
   */
  get height() {
    return this._height
  }
  set height(value: number) {
    this._height = value
  }

  /**
   * Gets or sets the width of the viewport entity's window in drawing units.
   *
   * This represents the width of the viewport's rectangular boundary in paper space,
   * measured in the current drawing units. It defines the horizontal extent of the
   * viewport border, not the width of the model space view within the viewport.
   *
   * Note: This is the width in Paper Space of the viewport itself, not the width
   * of the Model Space view within the viewport.
   *
   * @returns The width of the viewport entity in drawing units
   */
  get width() {
    return this._width
  }
  set width(value: number) {
    this._width = value
  }

  /**
   * Gets or sets the view center in display coordinate system coordinates.
   *
   * This point represents the center of the model space view that is displayed
   * within the viewport. It is specified in the display coordinate system and
   * determines what portion of the model space drawing is visible in the viewport.
   *
   * @returns The center point of the model space view within the viewport
   */
  get viewCenter() {
    return this._viewCenter
  }
  set viewCenter(value: AcGePoint3d) {
    this._viewCenter = value
  }

  /**
   * Gets or sets the height of the Model Space view within the viewport.
   *
   * This value represents the height of the model space view that is displayed
   * within the viewport, specified in display coordinate system coordinates.
   *
   * Zoom behavior:
   * - Zooming the view out within the viewport increases this value
   * - Zooming the view in within the viewport decreases this value
   *
   * @returns The height of the model space view in display coordinates
   */
  get viewHeight() {
    return this._viewHeight
  }
  set viewHeight(value: number) {
    this._viewHeight = value
  }

  /**
   * Gets the geometric extents of the viewport entity.
   *
   * This method returns a bounding box that encompasses the entire viewport entity
   * in world coordinate system (WCS) coordinates.
   *
   * @returns A bounding box containing the viewport entity
   * @inheritdoc
   */
  get geometricExtents(): AcGeBox3d {
    // TODO: Implement it correctly
    return new AcGeBox3d()
  }

  /**
   * Renders the viewport entity using the specified renderer.
   *
   * The viewport is drawn as a rectangular border when the following conditions are met:
   * - The viewport entity is not in model space (i.e., it's in paper space)
   * - The viewport ID number is greater than 1 (not the default system viewport)
   *
   * In paper space layouts, there is always a system-defined "default" viewport that exists as
   * the bottom-most item. This viewport doesn't show any entities and is mainly for internal
   * AutoCAD purposes. The viewport ID number of this system-defined "default" viewport is 1.
   *
   * @param renderer - The renderer to use for drawing the viewport
   * @returns A render group containing the viewport border lines, or undefined if not drawn
   */
  subWorldDraw(renderer: AcGiRenderer) {
    // Draw a rectangle if meeting the following conditions:
    // - viewport entity isn't in model space
    // - viewport id number is greater than 1
    //
    // In paper space layouts, there is always a system-defined "default" viewport that exists as
    // the bottom-most item. This viewport doesn't show any entities and is mainly for internal
    // AutoCAD purposes. The viewport id number of this system-defined "default" viewport is 1.
    if (
      this._number > 1 &&
      this.ownerId != this.database.tables.blockTable.modelSpace.objectId
    ) {
      const viewport = this.toGiViewport()
      const group = renderer.group(this.createViewportRect(viewport, renderer))
      return group
    }
    return undefined
  }

  /**
   * Converts this AcDbViewport to an AcGiViewport for rendering purposes.
   *
   * This method creates a graphic interface viewport object that contains all the
   * necessary properties for rendering the viewport in the graphics system.
   *
   * @returns An AcGiViewport instance with all viewport properties copied
   */
  toGiViewport() {
    const viewport = new AcGiViewport()
    viewport.id = this.objectId
    viewport.groupId = this.ownerId
    viewport.number = this.number
    viewport.centerPoint = this.centerPoint
    viewport.width = this.width
    viewport.height = this.height
    viewport.viewHeight = this.viewHeight
    viewport.viewCenter = this.viewCenter
    return viewport
  }

  /**
   * Creates the rectangular border lines for the viewport.
   *
   * This private method generates four line entities that form a rectangle representing
   * the viewport's boundary. The rectangle is centered on the viewport's center point
   * and has dimensions specified by the viewport's width and height.
   *
   * @param viewport - The graphic interface viewport containing rendering properties
   * @param renderer - The renderer to use for creating the line entities
   * @returns An array of line entities forming the viewport border
   * @private
   */
  private createViewportRect(viewport: AcGiViewport, renderer: AcGiRenderer) {
    const lines: AcGiEntity[] = []
    lines.push(
      renderer.lines([
        new AcGePoint3d(
          viewport.centerPoint.x - viewport.width / 2,
          viewport.centerPoint.y - viewport.height / 2,
          0
        ),
        new AcGePoint3d(
          viewport.centerPoint.x + viewport.width / 2,
          viewport.centerPoint.y - viewport.height / 2,
          0
        )
      ])
    )
    lines.push(
      renderer.lines([
        new AcGePoint3d(
          viewport.centerPoint.x + viewport.width / 2,
          viewport.centerPoint.y - viewport.height / 2,
          0
        ),
        new AcGePoint3d(
          viewport.centerPoint.x + viewport.width / 2,
          viewport.centerPoint.y + viewport.height / 2,
          0
        )
      ])
    )
    lines.push(
      renderer.lines([
        new AcGePoint3d(
          viewport.centerPoint.x + viewport.width / 2,
          viewport.centerPoint.y + viewport.height / 2,
          0
        ),
        new AcGePoint3d(
          viewport.centerPoint.x - viewport.width / 2,
          viewport.centerPoint.y + viewport.height / 2,
          0
        )
      ])
    )
    lines.push(
      renderer.lines([
        new AcGePoint3d(
          viewport.centerPoint.x - viewport.width / 2,
          viewport.centerPoint.y + viewport.height / 2,
          0
        ),
        new AcGePoint3d(
          viewport.centerPoint.x - viewport.width / 2,
          viewport.centerPoint.y - viewport.height / 2,
          0
        )
      ])
    )
    return lines
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbViewport')
    filer.writePoint3d(10, this.centerPoint)
    filer.writeDouble(40, this.height)
    filer.writeDouble(41, this.width)
    filer.writePoint3d(12, this.viewCenter)
    filer.writeDouble(45, this.viewHeight)
    filer.writeInt32(69, this.number)
    return this
  }
}

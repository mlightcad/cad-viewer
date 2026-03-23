import { AcCmColor, AcCmTransparency } from '@mlightcad/common'
import {
  AcGeBox3d,
  AcGeMatrix3d,
  AcGePoint3d
} from '@mlightcad/geometry-engine'
import {
  AcGiEntity,
  AcGiLineStyle,
  AcGiLineWeight,
  AcGiRenderer,
  AcGiStyleType
} from '@mlightcad/graphic-interface'

import { AcDbDxfFiler } from '../base'
import { AcDbObject } from '../base/AcDbObject'
import { AcDbOsnapMode, ByBlock, ByLayer, DEFAULT_LINE_TYPE } from '../misc'
import {
  AcDbEntityProperties,
  AcDbEntityPropertyGroup
} from './AcDbEntityProperties'

/**
 * Abstract base class for all drawing entities.
 *
 * This class provides the fundamental functionality for all drawing entities,
 * including layer management, color handling, linetype support, visibility,
 * and geometric operations. All specific entity types (lines, circles, text, etc.)
 * inherit from this class.
 *
 * @example
 * ```typescript
 * class MyEntity extends AcDbEntity {
 *   get geometricExtents(): AcGeBox3d {
 *     // Implementation for geometric extents
 *   }
 *
 *   draw(renderer: AcGiRenderer): AcGiEntity | undefined {
 *     // Implementation for drawing
 *   }
 * }
 * ```
 */
export abstract class AcDbEntity extends AcDbObject {
  /** The entity type name */
  static typeName: string = 'Entity'
  /** The layer name this entity belongs to */
  private _layer?: string
  /** The color of this entity */
  private _color?: AcCmColor
  /** The linetype name for this entity */
  private _lineType: string = ByLayer
  /** The line weight for this entity */
  private _lineWeight?: AcGiLineWeight
  /** The linetype scale factor for this entity */
  private _linetypeScale?: number
  /** Whether this entity is visible */
  private _visibility: boolean = true
  /** The transparency level of this entity (0-1) */
  private _transparency: AcCmTransparency = new AcCmTransparency()

  /**
   * Gets the type name of this entity.
   *
   * This method returns the entity type by removing the "AcDb" prefix
   * from the constructor name.
   *
   * @returns The entity type name
   *
   * @example
   * ```typescript
   * const entity = new AcDbLine();
   * console.log(entity.type); // "Line"
   * ```
   */
  get type() {
    return (this.constructor as typeof AcDbEntity).typeName
  }

  /**
   * DXF entity name written to the file.
   */
  get dxfEntityTypeName() {
    switch (this.type) {
      case 'BlockReference':
        return 'INSERT'
      case 'Polyline':
        return 'LWPOLYLINE'
      case '2dPolyline':
      case '3dPolyline':
        return 'POLYLINE'
      case '2dVertex':
      case '3dVertex':
        return 'VERTEX'
      case 'Face':
        return '3DFACE'
      case 'RasterImage':
        return 'IMAGE'
      case 'Table':
        return 'ACAD_TABLE'
      case 'AlignedDimension':
      case 'RadialDimension':
      case 'DiametricDimension':
      case 'OrdinateDimension':
      case '3PointAngularDimension':
      case 'ArcDimension':
        return 'DIMENSION'
      default:
        return this.type.toUpperCase()
    }
  }

  /**
   * Gets the name of the layer referenced by this entity.
   *
   * @returns The layer name
   *
   * @example
   * ```typescript
   * const layerName = entity.layer;
   * ```
   */
  get layer() {
    if (this._layer == null) {
      this._layer = this.database.clayer ?? '0'
    }
    return this._layer
  }

  /**
   * Sets the name of the layer for this entity.
   *
   * @param value - The new layer name
   *
   * @example
   * ```typescript
   * entity.layer = 'MyLayer';
   * ```
   */
  set layer(value: string) {
    this._layer = value
  }

  /**
   * Gets the color information of this entity.
   *
   * @returns The color object for this entity
   *
   * @example
   * ```typescript
   * const color = entity.color;
   * ```
   */
  get color() {
    if (this._color == null) {
      this._color = new AcCmColor()
      if (this.database.cecolor) {
        this._color.copy(this.database.cecolor)
      }
    }
    return this._color
  }

  /**
   * Sets the color information for this entity.
   *
   * @param value - The new color object
   *
   * @example
   * ```typescript
   * entity.color = new AcCmColor(0xFF0000);
   * ```
   */
  set color(value: AcCmColor) {
    if (this._color == null) this._color = new AcCmColor()
    this._color.copy(value)
  }

  /**
   * Resolved color applied on this entity. It will resolve layer colors and block colors as needed.
   */
  get resolvedColor() {
    let color = this.color
    if (color.isByLayer) {
      const layerColor = this.getLayerColor()
      if (layerColor && layerColor.RGB != null) {
        color = layerColor
      }
    } else if (color.isByBlock) {
      // Do nothing for common entity and just use default color in database
      // Block reference entity need to override this method handle 'byBlock'.
    }
    return color
  }

  /**
   * Gets the RGB color of this entity.
   *
   * This method handles the conversion of color indices (including ByLayer and ByBlock)
   * to actual RGB colors. It resolves layer colors and block colors as needed.
   *
   * @returns The RGB color value as a number
   *
   * @example
   * ```typescript
   * const rgbColor = entity.rgbColor;
   * console.log(`RGB: ${rgbColor.toString(16)}`);
   * ```
   */
  get rgbColor() {
    const color = this.resolvedColor
    const rgb = color.RGB
    return rgb != null ? rgb : 0xffffff
  }

  /**
   * Gets the name of the line type referenced by this entity.
   *
   * @returns The linetype name
   *
   * @example
   * ```typescript
   * const lineType = entity.lineType;
   * ```
   */
  get lineType() {
    return this._lineType
  }

  /**
   * Sets the name of the line type for this entity.
   *
   * @param value - The new linetype name
   *
   * @example
   * ```typescript
   * entity.lineType = 'DASHED';
   * ```
   */
  set lineType(value: string) {
    this._lineType = value || ByLayer
  }

  /**
   * Gets the line weight used by this entity.
   *
   * @returns The line weight value
   */
  get lineWeight() {
    if (this._lineWeight == null) {
      this._lineWeight = this.database.celweight ?? AcGiLineWeight.ByLayer
    }
    return this._lineWeight
  }

  /**
   * Sets the line weight for this entity.
   *
   * @param value - The new line weight value
   */
  set lineWeight(value: AcGiLineWeight) {
    this._lineWeight = value
  }

  /**
   * Gets the line type scale factor of this entity.
   *
   * When an entity is first instantiated, its line type scale is initialized
   * to an invalid value. When the entity is added to the database, if a
   * linetype scale has not been specified for the entity, it is set to the
   * database's current line type scale value.
   *
   * @returns The linetype scale factor
   *
   * @example
   * ```typescript
   * const scale = entity.linetypeScale;
   * ```
   */
  get linetypeScale() {
    if (this._linetypeScale == null) {
      this._linetypeScale = this.database.celtscale ?? -1
    }
    return this._linetypeScale
  }

  /**
   * Sets the line type scale factor for this entity.
   *
   * @param value - The new linetype scale factor
   *
   * @example
   * ```typescript
   * entity.linetypeScale = 2.0;
   * ```
   */
  set linetypeScale(value: number) {
    this._linetypeScale = value
  }

  /**
   * Gets whether this entity is visible.
   *
   * @returns True if the entity is visible, false otherwise
   *
   * @example
   * ```typescript
   * const isVisible = entity.visibility;
   * ```
   */
  get visibility() {
    return this._visibility
  }

  /**
   * Sets whether this entity is visible.
   *
   * @param value - True to make the entity visible, false to hide it
   *
   * @example
   * ```typescript
   * entity.visibility = false; // Hide the entity
   * ```
   */
  set visibility(value: boolean) {
    this._visibility = value
  }

  /**
   * Gets the transparency level of this entity.
   *
   * @returns The transparency value.
   *
   * @example
   * ```typescript
   * const transparency = entity.transparency;
   * ```
   */
  get transparency() {
    return this._transparency
  }

  /**
   * Sets the transparency level of this entity.
   *
   * @param value - The transparency value.
   *
   * @example
   * ```typescript
   * entity.transparency = 0.5; // 50% transparent
   * ```
   */
  set transparency(value: AcCmTransparency) {
    this._transparency = value.clone()
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    // For better downstream compatibility, emit only the entity-level subclass
    // marker here. The object-level marker (AcDbObject) is omitted for entities.
    filer.writeSubclassMarker('AcDbEntity')
    filer.writeString(8, this.layer)
    filer.writeString(6, this.lineType)
    filer.writeDouble(48, this.linetypeScale)
    filer.writeInt16(60, this.visibility ? 0 : 1)
    filer.writeCmColor(this.color)
    filer.writeInt16(370, this.lineWeight)
    filer.writeTransparency(this.transparency)
    const owner = this.database.tables.blockTable.getIdAt(this.ownerId)
    if (owner?.isPaperSapce) {
      filer.writeInt16(67, 1)
    }
    return this
  }

  /**
   * Resolves the effective properties of this entity.
   *
   * This method determines the final, usable values for entity properties such as
   * layer, linetype, lineweight, color, and other display-related attributes.
   * If a property is not explicitly set on the entity (for example, it is undefined
   * or specified as *ByLayer* / *ByBlock*), the value is resolved according to the
   * current AutoCAD system variables and drawing context.
   *
   * Typical system variables involved in the resolution process include, but are
   * not limited to:
   * - `CLAYER`    – Current layer
   * - `CELTYPE`   – Current linetype
   * - `CELWEIGHT` – Current lineweight
   * - `CECOLOR`   – Current color
   *
   * The resolution follows AutoCAD semantics:
   * - Explicitly assigned entity properties take precedence
   * - *ByLayer* properties are inherited from the entity’s layer
   * - *ByBlock* properties are inherited from the owning block reference
   * - If no explicit value can be determined, the corresponding system variable
   *   or default drawing value is used
   *
   * This method does not change user-defined property settings; it only computes
   * and applies the final effective values used for display, selection, and
   * downstream processing.
   */
  resolveEffectiveProperties() {
    if (this._layer == null) {
      this._layer = this.database.clayer ?? '0'
    }

    if (this._color == null) {
      this._color = new AcCmColor()
      if (this.database.cecolor) {
        this._color.copy(this.database.cecolor)
      }
    }

    if (this._linetypeScale == null) {
      this._linetypeScale = this.database.celtscale ?? -1
    }

    if (this._lineWeight == null) {
      this._lineWeight = this.database.celweight ?? AcGiLineWeight.ByLayer
    }
  }

  /**
   * Returns the full property definition for this entity, including
   * all property groups and runtime accessors.
   *
   * This getter is used by the property inspector UI to:
   * - determine the layout and grouping of properties,
   * - look up editable flags and metadata,
   * - read/write live values on this entity using accessors.
   *
   * The returned structure contains:
   * - static metadata (label, type, group structure),
   * - dynamic accessor bindings that expose the actual values stored in the entity.
   *
   * Note: The `groups` array contains `AcDbEntityPropertyGroup` objects whose
   * `properties` entries are runtime-resolved property descriptors that include
   * {@link AcDbPropertyAccessor} objects. Each property object therefore
   * conforms to `AcDbEntityRuntimeProperty`.
   */
  get properties(): AcDbEntityProperties {
    return {
      type: this.type,
      groups: [this.getGeneralProperties()]
    }
  }

  /**
   * Gets the grip points for this entity.
   *
   * Grip points are the control points that can be used to modify the entity.
   * This method should be overridden by subclasses to provide entity-specific
   * grip points.
   *
   * @returns Array of grip points as 3D points
   *
   * @example
   * ```typescript
   * const gripPoints = entity.subGetGripPoints();
   * ```
   */
  subGetGripPoints() {
    const gripPoints = new Array<AcGePoint3d>()
    return gripPoints
  }

  /**
   * Gets the object snap points for this entity.
   *
   * Object snap points are the points that can be used for precise positioning
   * when drawing or editing. This method should be overridden by subclasses
   * to provide entity-specific snap points.
   *
   * @param osnapMode - The object snap mode
   * @param pickPoint - The pick point
   * @param lastPoint - The last point
   * @param snapPoints - Array to populate with snap points
   * @param gsMark - The object id of subentity. For now, it is used by INSERT
   * entity only. In AutoCAD, it uses AcGiSubEntityTraits::setSelectionMarkerInput
   * to set GS marker of the subentity involved in the object snap operation. For
   * now, we don't provide such a GS marker mechanism yet. So passed id of subentity
   * as GS marker. Maybe this behavior will change in the future.
   *
   * @example
   * ```typescript
   * const snapPoints: AcGePoint3d[] = [];
   * entity.subGetOsnapPoints(AcDbOsnapMode.Endpoint, 0, pickPoint, lastPoint, snapPoints);
   * ```
   */
  subGetOsnapPoints(
    // @ts-expect-error not use '_' prefix so that typedoc can the correct parameter to generate doc
    osnapMode: AcDbOsnapMode,
    // @ts-expect-error not use '_' prefix so that typedoc can the correct parameter to generate doc
    pickPoint: AcGePoint3dLike,
    // @ts-expect-error not use '_' prefix so that typedoc can the correct parameter to generate doc
    lastPoint: AcGePoint3dLike,
    // @ts-expect-error not use '_' prefix so that typedoc can the correct parameter to generate doc
    snapPoints: AcGePoint3dLike[],
    // @ts-expect-error not use '_' prefix so that typedoc can the correct parameter to generate doc
    gsMark?: AcDbObjectId
  ) {}

  /**
   * Transforms this entity by the specified matrix.
   *
   * This method applies a geometric transformation to the entity.
   * Subclasses should override this method to provide entity-specific
   * transformation behavior.
   *
   * @param matrix - The transformation matrix to apply
   * @returns This entity after transformation
   *
   * @example
   * ```typescript
   * const matrix = AcGeMatrix3d.translation(10, 0, 0);
   * entity.transformBy(matrix);
   * ```
   */
  // @ts-expect-error not use '_' prefix so that typedoc can the correct parameter to generate doc
  transformBy(matrix: AcGeMatrix3d): this {
    return this
  }

  /**
   * Gets the geometric extents of this entity.
   *
   * This method should be implemented by subclasses to return the
   * bounding box that encompasses the entire entity.
   *
   * @returns The geometric extents as a 3D bounding box
   *
   * @example
   * ```typescript
   * const extents = entity.geometricExtents;
   * console.log(`Min: ${extents.minPoint}, Max: ${extents.maxPoint}`);
   * ```
   */
  abstract get geometricExtents(): AcGeBox3d

  /**
   * Erase the current entity from the associated database.
   *
   * @returns — true if an entity in the database existed and has been removed,
   * or false if the entity does not exist.
   */
  erase() {
    return this.database.tables.blockTable.removeEntity(this.objectId)
  }

  /**
   * Draws this entity using the specified renderer.
   *
   * This method should be implemented by subclasses to provide
   * entity-specific drawing behavior.
   *
   * @param renderer - The renderer to use for drawing
   * @param delay - The flag to delay creating one rendered entity and just create one dummy
   * entity. Renderer can delay heavy calculation operation to avoid blocking UI when this flag
   * is true. For now, text and mtext entity supports this flag only. Other types of entities
   * just ignore this flag.
   * @returns The rendered entity, or undefined if drawing failed
   */
  abstract subWorldDraw(
    renderer: AcGiRenderer,
    delay?: boolean
  ): AcGiEntity | undefined

  /**
   * Called by cad application when it wants the entity to draw itself in WCS (World Coordinate
   * System) and acts as a wrapper / dispatcher around subWorldDraw(). The children class should
   * never overidde this method.
   *
   * It executes the following logic:
   * - Handles traits (color, linetype, lineweight, transparency, etc.)
   * - Calls subWorldDraw() to do the actual geometry output
   *
   * @param renderer - The renderer to use for drawing
   * @param delay - The flag to delay creating one rendered entity and just create one dummy
   * entity. Renderer can delay heavy calculation operation to avoid blocking UI when this flag
   * is true. For now, text and mtext entity supports this flag only. Other types of entities
   * just ignore this flag.
   * @returns The rendered entity, or undefined if drawing failed
   */
  worldDraw(renderer: AcGiRenderer, delay?: boolean): AcGiEntity | undefined {
    const traits = renderer.subEntityTraits
    traits.color = this.resolvedColor
    traits.rgbColor = this.rgbColor
    traits.lineType = this.lineStyle
    traits.lineTypeScale = this.linetypeScale
    traits.lineWeight = this.lineWeight
    traits.transparency = this.transparency
    traits.layer = this.layer
    if ('thickness' in this) {
      traits.thickness = this.thickness as number
    }
    const drawable = this.subWorldDraw(renderer, delay)
    this.attachEntityInfo(drawable)
    return drawable
  }

  /**
   * Triggers a modified event for this entity.
   *
   * This method notifies listeners that the entity has been modified.
   *
   * @example
   * ```typescript
   * entity.triggerModifiedEvent();
   * ```
   */
  triggerModifiedEvent() {
    this.database.events.entityModified.dispatch({
      database: this.database,
      entity: this
    })
  }

  /**
   * Creates the "General" property group for this entity.
   *
   * This group contains common metadata attributes shared by all CAD entities
   * (e.g., handle, layer). Each property includes a runtime {@link AcDbPropertyAccessor}
   * allowing the property inspector to read and update live values.
   *
   * Subclasses may override this method to append additional general-purpose
   * properties while still preserving this base set.
   *
   * @returns A fully resolved property group containing runtime-accessible properties.
   */
  protected getGeneralProperties(): AcDbEntityPropertyGroup {
    return {
      groupName: 'general',

      properties: [
        {
          name: 'handle',
          type: 'int',
          editable: false,
          accessor: {
            get: (): string => this.objectId
          }
        },
        {
          name: 'color',
          type: 'color',
          editable: true,
          accessor: {
            get: (): AcCmColor => this.color,
            set: (newVal: AcCmColor): void => {
              this.color.copy(newVal)
            }
          }
        },
        {
          name: 'layer',
          type: 'string',
          editable: true,
          accessor: {
            get: (): string => this.layer,
            set: (newVal: string): void => {
              this.layer = newVal
            }
          }
        },
        {
          name: 'linetype',
          type: 'linetype',
          editable: true,
          accessor: {
            get: (): string => this.lineType,
            set: (newVal: string): void => {
              this.lineType = newVal
            }
          }
        },
        {
          name: 'linetypeScale',
          type: 'float',
          editable: true,
          accessor: {
            get: (): number => this.linetypeScale,
            set: (newVal: number): void => {
              this.linetypeScale = newVal
            }
          }
        },
        {
          name: 'lineWeight',
          type: 'lineweight',
          editable: true,
          accessor: {
            get: (): AcGiLineWeight => this.lineWeight,
            set: (newVal: AcGiLineWeight): void => {
              this.lineWeight = newVal
            }
          }
        },
        {
          name: 'transparency',
          type: 'transparency',
          editable: true,
          accessor: {
            get: (): AcCmTransparency => this.transparency,
            set: (newVal: AcCmTransparency): void => {
              this.transparency = newVal
            }
          }
        }
      ]
    }
  }

  /**
   * Gets the line style for this entity.
   *
   * This method returns the line style based on the entity's linetype
   * and other properties.
   *
   * @returns The line style object
   *
   * @example
   * ```typescript
   * const lineStyle = entity.lineStyle;
   * ```
   */
  get lineStyle(): AcGiLineStyle {
    const { type, name } = this.getLineType()
    const lineTypeRecord = this.database?.tables.linetypeTable.getAt(name)
    if (lineTypeRecord) {
      return { type, ...lineTypeRecord.linetype }
    } else {
      return {
        type,
        name,
        standardFlag: 0,
        description: '',
        totalPatternLength: 0
      }
    }
  }

  /**
   * Gets the line type for this entity.
   *
   * This method resolves the line type, handling ByLayer and ByBlock
   * references as needed.
   *
   * @returns The resolved line type
   *
   * @example
   * ```typescript
   * const lineType = entity.getLineType();
   * ```
   */
  private getLineType(): { type: AcGiStyleType; name: string } {
    if (this.lineType == ByLayer) {
      const layer = this.database.tables.layerTable.getAt(this.layer)
      if (layer && layer.linetype) {
        return {
          type: 'ByLayer',
          name: layer.linetype
        }
      }
    } else if (this.lineType == ByBlock) {
      // TODO: Get line type correctly
      return {
        type: 'ByBlock',
        name: DEFAULT_LINE_TYPE
      }
    } else {
      return {
        type: 'UserSpecified',
        name: this.lineType
      }
    }
    return {
      type: 'UserSpecified',
      name: DEFAULT_LINE_TYPE
    }
  }

  /**
   * Gets the color of the layer this entity belongs to.
   *
   * This method retrieves the color from the layer table for the
   * layer this entity belongs to.
   *
   * @returns The layer color, or undefined if the layer doesn't exist
   *
   * @example
   * ```typescript
   * const layerColor = entity.getLayerColor();
   * ```
   */
  protected getLayerColor() {
    const layer = this.database.tables.layerTable.getAt(this.layer)
    if (layer == null) {
      console.error(
        `The layer with name '${this.layer}' not found in drawing database!`
      )
    } else {
      return layer.color
    }
    return null
  }

  /**
   * Attaches entity information to a graphic interface entity.
   *
   * This method transfers essential entity properties (object ID, owner ID,
   * layer name, and visibility) from this entity to the target graphic
   * interface entity. This is typically used during the rendering process
   * to ensure the graphic entity has the correct metadata.
   *
   * @param target - The graphic interface entity to attach information to
   *
   */
  private attachEntityInfo(target: AcGiEntity | null | undefined) {
    if (target) {
      target.objectId = this.objectId
      if (this.attrs.has('ownerId')) {
        target.ownerId = this.ownerId
      }
      target.layerName = this.layer
      target.visible = this.visibility
    }
  }
}

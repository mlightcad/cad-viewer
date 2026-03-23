import {
  AcGeBox3d,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGeQuaternion,
  AcGeVector3d,
  AcGeVector3dLike
} from '@mlightcad/geometry-engine'
import { AcGiEntity, AcGiRenderer } from '@mlightcad/graphic-interface'

import { AcDbDxfFiler, AcDbObjectId } from '../base'
import { AcDbObjectIterator, AcDbOsnapMode, AcDbRenderingCache } from '../misc'
import { AcDbAttribute } from './AcDbAttribute'
import { AcDbEntity } from './AcDbEntity'
import {
  AcDbEntityProperties,
  AcDbEntityPropertyGroup
} from './AcDbEntityProperties'

/**
 * Represents a block reference entity in AutoCAD.
 *
 * A block reference is used to place, size, and display an instance of the collection
 * of entities within the block table record that it references. Block references allow
 * you to reuse complex geometry by referencing a block definition multiple times with
 * different positions, rotations, and scales.
 *
 * @example
 * ```typescript
 * // Create a block reference
 * const blockRef = new AcDbBlockReference("MyBlock");
 * blockRef.position = new AcGePoint3d(10, 20, 0);
 * blockRef.rotation = Math.PI / 4; // 45 degrees
 * blockRef.scaleFactors = new AcGePoint3d(2, 2, 1); // 2x scale
 *
 * // Access block reference properties
 * console.log(`Block name: ${blockRef.blockTableRecord?.name}`);
 * console.log(`Position: ${blockRef.position}`);
 * console.log(`Rotation: ${blockRef.rotation}`);
 * ```
 */
export class AcDbBlockReference extends AcDbEntity {
  /** The entity type name */
  static override typeName: string = 'BlockReference'

  /** The WCS position point (insertion point) of the block reference */
  private _position: AcGePoint3d
  /** The rotation value in radians */
  private _rotation: number
  /** The X, Y, and Z scale factors for the block reference */
  private _scaleFactors: AcGePoint3d
  /** The normal vector of the plane containing the block reference */
  private _normal: AcGeVector3d
  /** The name of the referenced block */
  private _blockName: string
  /** Attributes associated with this block reference */
  private _attribs: Map<string, AcDbAttribute>

  /**
   * Creates a new block reference entity.
   *
   * This constructor initializes a block reference with the specified block name.
   * The position is set to the origin, rotation to 0, normal to Z-axis, and scale factors to 1.
   *
   * @param blockName - The name of the block table record to reference
   *
   * @example
   * ```typescript
   * const blockRef = new AcDbBlockReference("MyBlock");
   * blockRef.position = new AcGePoint3d(5, 10, 0);
   * blockRef.rotation = Math.PI / 6; // 30 degrees
   * ```
   */
  constructor(blockName: string) {
    super()
    this._blockName = blockName
    this._position = new AcGePoint3d()
    this._rotation = 0.0
    this._normal = new AcGeVector3d(0, 0, 1)
    this._scaleFactors = new AcGePoint3d(1, 1, 1)
    this._attribs = new Map()
  }

  /**
   * Gets the WCS position point (insertion point) of the block reference.
   *
   * @returns The position point in WCS coordinates
   *
   * @example
   * ```typescript
   * const position = blockRef.position;
   * console.log(`Block position: ${position.x}, ${position.y}, ${position.z}`);
   * ```
   */
  get position(): AcGePoint3d {
    return this._position
  }

  /**
   * Sets the WCS position point (insertion point) of the block reference.
   *
   * @param value - The new position point
   *
   * @example
   * ```typescript
   * blockRef.position = new AcGePoint3d(15, 25, 0);
   * ```
   */
  set position(value: AcGePoint3dLike) {
    this._position.copy(value)
  }

  /**
   * Gets the rotation value of the block reference.
   *
   * The rotation value is relative to the X axis of a coordinate system that is parallel
   * to the OCS of the block reference, but has its origin at the position point of the
   * block reference. The rotation axis is the Z axis of this coordinate system with
   * positive rotations going counterclockwise when looking down the Z axis towards the origin.
   *
   * @returns The rotation value in radians
   *
   * @example
   * ```typescript
   * const rotation = blockRef.rotation;
   * console.log(`Rotation: ${rotation} radians (${rotation * 180 / Math.PI} degrees)`);
   * ```
   */
  get rotation() {
    return this._rotation
  }

  /**
   * Sets the rotation value of the block reference.
   *
   * @param value - The new rotation value in radians
   *
   * @example
   * ```typescript
   * blockRef.rotation = Math.PI / 4; // 45 degrees
   * ```
   */
  set rotation(value: number) {
    this._rotation = value
  }

  /**
   * Gets the X, Y, and Z scale factors for the block reference.
   *
   * @returns The scale factors as a 3D point
   *
   * @example
   * ```typescript
   * const scaleFactors = blockRef.scaleFactors;
   * console.log(`Scale factors: ${scaleFactors.x}, ${scaleFactors.y}, ${scaleFactors.z}`);
   * ```
   */
  get scaleFactors(): AcGePoint3d {
    return this._scaleFactors
  }

  /**
   * Sets the X, Y, and Z scale factors for the block reference.
   *
   * @param value - The new scale factors
   *
   * @example
   * ```typescript
   * blockRef.scaleFactors = new AcGePoint3d(2, 1.5, 1); // 2x X scale, 1.5x Y scale
   * ```
   */
  set scaleFactors(value: AcGePoint3dLike) {
    this._scaleFactors.copy(value)
  }

  /**
   * Gets the normal vector of the plane containing the block reference.
   *
   * @returns The normal vector
   *
   * @example
   * ```typescript
   * const normal = blockRef.normal;
   * console.log(`Normal: ${normal.x}, ${normal.y}, ${normal.z}`);
   * ```
   */
  get normal(): AcGeVector3d {
    return this._normal
  }

  /**
   * Sets the normal vector of the plane containing the block reference.
   *
   * @param value - The new normal vector
   *
   * @example
   * ```typescript
   * blockRef.normal = new AcGeVector3d(0, 0, 1);
   * ```
   */
  set normal(value: AcGeVector3dLike) {
    this._normal.copy(value).normalize()
  }

  get blockName() {
    return this._blockName
  }

  /**
   * Gets the block table record referenced by this block reference.
   *
   * The referenced block table record contains the entities that the block reference will display.
   *
   * @returns The block table record, or undefined if not found
   *
   * @example
   * ```typescript
   * const blockRecord = blockRef.blockTableRecord;
   * if (blockRecord) {
   *   console.log(`Block name: ${blockRecord.name}`);
   * }
   * ```
   */
  get blockTableRecord() {
    return this.database.tables.blockTable.getAt(this._blockName)
  }

  /**
   * Appends the specified AcDbAttribute object to the attribute list of the block reference,
   * establishes the block reference as the attribute's owner, and adds the attribute to the
   * AcDbDatabase that contains the block reference.
   * @param attrib - The attribute to be appended to the attribute list of the block reference.
   */
  appendAttributes(attrib: AcDbAttribute) {
    this._attribs.set(attrib.objectId, attrib)
    attrib.ownerId = this.objectId
  }

  /**
   * Creates an iterator object that can be used to iterate over the attributes associated
   * with the block reference.
   *
   * @returns An iterator object that can be used to iterate over the attributes
   */
  attributeIterator(): AcDbObjectIterator<AcDbAttribute> {
    return new AcDbObjectIterator(this._attribs)
  }

  /**
   * Gets the block-local transformation matrix of this block reference.
   *
   * This matrix represents the **INSERT entity transform in Object Coordinate
   * System (OCS)**, excluding the extrusion / normal transformation.
   *
   * In AutoCAD, a block reference transform is conceptually applied in the
   * following order:
   *
   * 1. Translate geometry by the negative block base point
   * 2. Apply non-uniform scaling
   * 3. Apply rotation about the block Z axis (OCS Z)
   * 4. Translate to the insertion point
   * 5. Finally, transform from OCS to WCS using the entity normal (extrusion)
   *
   * This property returns the matrix for steps **1–4 only**.
   *
   * The OCS → WCS transformation derived from {@link normal} **must NOT be
   * included here**, because:
   *
   * - The rotation angle of an INSERT is defined in OCS
   * - Applying OCS earlier would rotate around an incorrect axis
   * - Cached block geometry must remain reusable for different normals
   *
   * Therefore, the extrusion transformation is applied **after rendering**
   * (see {@link AcDbRenderingCache.draw}), matching AutoCAD / RealDWG behavior.
   *
   * ### Matrix composition (right-multiply convention)
   *
   * ```
   * blockTransform =
   *   T(position)
   * · R(rotation about OCS Z)
   * · S(scaleFactors)
   * · T(-blockBasePoint)
   * ```
   *
   * ### Notes
   *
   * - The returned matrix operates in OCS space
   * - Rotation is always about the OCS Z axis
   * - {@link normal} is applied later as a final orientation step
   * - This mirrors the internal behavior of `AcDbBlockReference` in ObjectARX
   *
   * @returns A transformation matrix representing the block-local INSERT transform
   *          in OCS, excluding extrusion.
   */
  get blockTransform(): AcGeMatrix3d {
    // Retrieve the referenced block table record.
    // The block definition contains its own local coordinate system
    // whose origin is the block base point.
    const blockTableRecord = this.blockTableRecord

    // The base point (origin) of the block definition.
    // All entities inside the block are defined relative to this point.
    // If the block record is missing, fall back to (0,0,0).
    const basePoint = blockTableRecord?.origin ?? AcGePoint3d.ORIGIN

    // ------------------------------------------------------------
    // Step 1: Translate geometry by the negative block base point
    //
    // This moves block geometry so that the block base point
    // coincides with the origin (0,0,0) in block-local space.
    //
    // AutoCAD always applies this compensation first.
    // ------------------------------------------------------------
    const mBase = new AcGeMatrix3d().makeTranslation(
      -basePoint.x,
      -basePoint.y,
      -basePoint.z
    )

    // ------------------------------------------------------------
    // Step 2: Apply non-uniform scaling
    //
    // Scale factors are applied in block-local OCS coordinates.
    // Negative or non-uniform scales are supported.
    // ------------------------------------------------------------
    const mScale = new AcGeMatrix3d().makeScale(
      this._scaleFactors.x,
      this._scaleFactors.y,
      this._scaleFactors.z
    )

    // ------------------------------------------------------------
    // Step 3: Apply rotation about the block Z axis (OCS Z)
    //
    // IMPORTANT:
    // - The rotation angle of an INSERT is defined in OCS
    // - The rotation axis is always the local Z axis
    // - The extrusion / normal is NOT applied here
    //
    // Rotation is therefore constructed around (0,0,1).
    // ------------------------------------------------------------
    const qRot = new AcGeQuaternion().setFromAxisAngle(
      AcGeVector3d.Z_AXIS,
      this._rotation
    )
    const mRot = new AcGeMatrix3d().makeRotationFromQuaternion(qRot)

    // ------------------------------------------------------------
    // Step 4: Translate to the insertion point
    //
    // This moves the transformed block geometry from the origin
    // to its final insertion point, still in OCS.
    // ------------------------------------------------------------
    const mInsert = new AcGeMatrix3d().makeTranslation(
      this._position.x,
      this._position.y,
      this._position.z
    )

    // ------------------------------------------------------------
    // Final composition (right-multiply convention)
    //
    // blockTransform =
    //   T(position)
    // · R(rotation about OCS Z)
    // · S(scaleFactors)
    // · T(-blockBasePoint)
    //
    // NOTE:
    // - This matrix operates entirely in OCS
    // - The OCS → WCS transform derived from `normal`
    //   is intentionally excluded here
    // - Extrusion is applied later at render time
    // ------------------------------------------------------------
    return new AcGeMatrix3d()
      .multiplyMatrices(mInsert, mRot)
      .multiply(mScale)
      .multiply(mBase)
  }

  /**
   * Gets the object snap points for this mtext.
   *
   * Object snap points are precise points that can be used for positioning
   * when drawing or editing. This method provides snap points based on the
   * specified snap mode.
   *
   * @param osnapMode - The object snap mode
   * @param pickPoint - The point where the user picked
   * @param lastPoint - The last point
   * @param snapPoints - Array to populate with snap points
   * @param gsMark - The object id of subentity. For now, it is used by INSERT
   * entity only. In AutoCAD, it uses AcGiSubEntityTraits::setSelectionMarkerInput
   * to set GS marker of the subentity involved in the object snap operation. For
   * now, we don't provide such a GS marker mechanism yet. So passed id of subentity
   * as GS marker. Maybe this behavior will change in the future.
   */
  subGetOsnapPoints(
    osnapMode: AcDbOsnapMode,
    pickPoint: AcGePoint3dLike,
    lastPoint: AcGePoint3dLike,
    snapPoints: AcGePoint3dLike[],
    gsMark?: AcDbObjectId
  ) {
    if (AcDbOsnapMode.Insertion === osnapMode) {
      snapPoints.push(this._position)
    } else if (gsMark) {
      this.subEntityGetOsnapPoints(
        osnapMode,
        pickPoint,
        lastPoint,
        snapPoints,
        gsMark
      )
    }
  }

  /**
   * Returns the full property definition for this block reference entity, including
   * general group and geometry group.
   *
   * The geometry group exposes editable properties via {@link AcDbPropertyAccessor}
   * so the property palette can update the block reference in real-time.
   *
   * Each property is an {@link AcDbEntityRuntimeProperty}.
   */
  get properties(): AcDbEntityProperties {
    const props: AcDbEntityProperties = {
      type: this.type,
      groups: [
        this.getGeneralProperties(),
        {
          groupName: 'geometry',
          properties: [
            {
              name: 'blockName',
              type: 'float',
              editable: false,
              accessor: {
                get: () => this._blockName
              }
            },
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
              name: 'scaleFactorsX',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.scaleFactors.x,
                set: (v: number) => {
                  this.scaleFactors.x = v
                }
              }
            },
            {
              name: 'scaleFactorsY',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.scaleFactors.y,
                set: (v: number) => {
                  this.scaleFactors.y = v
                }
              }
            },
            {
              name: 'scaleFactorsZ',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.scaleFactors.z,
                set: (v: number) => {
                  this.scaleFactors.z = v
                }
              }
            },
            {
              name: 'normalX',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.normal.x,
                set: (v: number) => {
                  this.normal.x = v
                }
              }
            },
            {
              name: 'normalY',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.normal.y,
                set: (v: number) => {
                  this.normal.y = v
                }
              }
            },
            {
              name: 'normalZ',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.normal.z,
                set: (v: number) => {
                  this.normal.z = v
                }
              }
            }
          ]
        }
      ]
    }
    if (this._attribs.size > 0) {
      const group: AcDbEntityPropertyGroup = {
        groupName: 'attribute',
        properties: []
      }
      props.groups.push(group)
      this._attribs.forEach(attr => {
        group.properties.push({
          name: attr.tag,
          type: 'string',
          editable: !attr.isConst,
          skipTranslation: true,
          accessor: {
            get: () => attr.textString,
            set: (v: string) => {
              attr.textString = v
            }
          }
        })
      })
    }
    return props
  }

  /**
   * Gets the geometric extents (bounding box) of this block reference.
   *
   * This method calculates the bounding box by transforming the geometric extents
   * of all entities in the referenced block according to the block reference's
   * position, rotation, and scale factors.
   *
   * @returns The bounding box that encompasses the entire block reference
   *
   * @example
   * ```typescript
   * const extents = blockRef.geometricExtents;
   * console.log(`Block bounds: ${extents.minPoint} to ${extents.maxPoint}`);
   * ```
   */
  get geometricExtents(): AcGeBox3d {
    const box = new AcGeBox3d()
    const blockTableRecord = this.blockTableRecord
    if (blockTableRecord != null) {
      const entities = blockTableRecord.newIterator()
      for (const entity of entities) {
        box.union(entity.geometricExtents)
      }
    }
    const matrix = this.blockTransform
    box.applyMatrix4(matrix)

    return box
  }

  /**
   * @inheritdoc
   */
  subWorldDraw(renderer: AcGiRenderer) {
    const blockTableRecord = this.blockTableRecord
    if (blockTableRecord != null) {
      const matrix = this.blockTransform
      const attribs: AcGiEntity[] = []
      this._attribs.forEach(attrib => {
        if (!attrib.isInvisible) {
          const result = attrib.worldDraw(renderer)
          if (result) attribs.push(result)
        }
      })
      const block = AcDbRenderingCache.instance.draw(
        renderer,
        blockTableRecord,
        this.rgbColor,
        attribs,
        true,
        matrix,
        this._normal
      )
      return block
    } else {
      const block = renderer.group([])
      return block
    }
  }

  private subEntityGetOsnapPoints(
    osnapMode: AcDbOsnapMode,
    pickPoint: AcGePoint3dLike,
    lastPoint: AcGePoint3dLike,
    snapPoints: AcGePoint3dLike[],
    gsMark: AcDbObjectId
  ) {
    // Avoid an infinite loop
    if (gsMark === this.objectId) return

    const blockTable = this.database?.tables.blockTable
    if (blockTable != null) {
      const entity = blockTable.getEntityById(gsMark)
      if (entity) {
        const points: AcGePoint3d[] = []
        entity.subGetOsnapPoints(
          osnapMode,
          pickPoint,
          lastPoint,
          points,
          gsMark
        )

        // Apply matrix to all snap points
        const matrix = this.blockTransform
        points.forEach(point => {
          const tmp = point.clone().applyMatrix4(matrix)
          snapPoints.push(tmp)
        })
      }
    }
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbBlockReference')
    filer.writePoint3d(10, this.position)
    filer.writeString(2, this.blockName)
    filer.writeDouble(41, this.scaleFactors.x)
    filer.writeDouble(42, this.scaleFactors.y)
    filer.writeDouble(43, this.scaleFactors.z)
    filer.writeAngle(50, this.rotation)
    filer.writeVector3d(210, this.normal)
    return this
  }
}

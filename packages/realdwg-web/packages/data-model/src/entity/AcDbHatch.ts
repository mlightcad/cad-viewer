import {
  AcGeArea2d,
  AcGeBox3d,
  AcGeCircArc2d,
  AcGeEllipseArc2d,
  AcGeLine2d,
  AcGeLoop2d,
  AcGeLoop2dType,
  AcGePoint2d,
  AcGePolyline2d,
  AcGeSpline3d
} from '@mlightcad/geometry-engine'
import {
  AcGiHatchPatternLine,
  AcGiRenderer
} from '@mlightcad/graphic-interface'

import { AcDbDxfFiler } from '../base'
import { AcDbEntity } from './AcDbEntity'
import { AcDbEntityProperties } from './AcDbEntityProperties'

/**
 * Defines the type of hatch pattern.
 */
export enum AcDbHatchPatternType {
  /**
   * A user-defined pattern provides a direct method to define a simple hatch pattern using a specified
   * hatch entity linetype. The definition data for user-defined hatch pattern include angle, space and
   * double. "Angle" specifies an angle for the hatch pattern relative to the X axis of the hatch plane
   * in OCS. "Space" defines the vertical distance between two consecutive pattern lines. "Double"
   * specifies that a second set of lines is to be drawn at 90 degrees to the original lines. When
   * specifying a user-defined hatch pattern, you don't need to set the pattern name. AutoCAD designates
   * a default pattern name "U" for all user-defined patterns.
   */
  UserDefined = 0,
  /**
   * A predefined pattern type allows you to select a hatch pattern from the AutoCAD standard hatch
   * pattern file acad.pat in the "support" directory. The file contains many predefined hatch patterns,
   * including ANGLE, ANSI31, BRICK, CLAY, etc. When you use a predefined pattern, you can also specify
   * a scale and angle in order to modify the hatch's appearance. Solid fill is a new predefined pattern
   * type that enables the application to fill in the hatch area with a specified color. The reserved
   * name for this new pattern is "SOLID." SOLID does not appear in the file acad.pat because it has no
   * definition data. To specify a solid, use the keyword "SOLID".
   */
  Predefined = 1,
  /**
   * A custom-defined pattern type stores the pattern in its own PAT file, in which the name of the
   * hatch pattern must match the name of the file. For instance, you must store the TEST hatch pattern
   * in a file named test.pat, and the file must be located in the ACAD search path. When you use a
   * custom-defined pattern, you can also specify a scale and angle in order to modify the hatch's
   * appearance.
   */
  Custom = 2
}

/**
 * Defines the hatch style for determining which areas to hatch.
 */
export enum AcDbHatchStyle {
  /**
   * Normal hatch style will hatch inward from the outer loop. If it encounters an internal intersection,
   * it turns off hatching until it encounters another intersection. Thus, areas separated from the
   * outside of the hatched area by an odd number of intersections are hatched, while areas separated by
   * an even number of intersections are not.
   */
  Normal = 0,
  /**
   * Outer hatch style will hatch inward from the outer loop. It turns off hatching if it encounters an
   * intersection and does not turn it back on. Because this process starts from both ends of each hatch
   * line, only the outmost level of the structure is hatched, and the internal structure is left blank.
   */
  Outer = 1,
  /**
   * Ignore hatch style will hatch inward from the outer loop and ignores all internal loops.
   */
  Ignore = 2
}

/**
 * Represents a hatch entity in AutoCAD.
 *
 * A hatch is a 2D geometric object that fills an area with a pattern of lines, dots, or other shapes.
 * Hatches are commonly used to represent materials, textures, or to distinguish different areas in drawings.
 *
 * @example
 * ```typescript
 * // Create a hatch entity
 * const hatch = new AcDbHatch();
 * hatch.patternName = "ANSI31";
 * hatch.patternType = AcDbHatchPatternType.Predefined;
 * hatch.patternScale = 1.0;
 * hatch.patternAngle = 0;
 * hatch.hatchStyle = AcDbHatchStyle.Normal;
 *
 * // Add a loop to define the hatch boundary
 * const loop = new AcGeLoop2d();
 * loop.add(new AcGePoint2d(0, 0));
 * loop.add(new AcGePoint2d(10, 0));
 * loop.add(new AcGePoint2d(10, 5));
 * loop.add(new AcGePoint2d(0, 5));
 * hatch.add(loop);
 *
 * // Access hatch properties
 * console.log(`Pattern name: ${hatch.patternName}`);
 * console.log(`Pattern scale: ${hatch.patternScale}`);
 * ```
 */
export class AcDbHatch extends AcDbEntity {
  /** The entity type name */
  static override typeName: string = 'Hatch'

  /** The underlying geometric area object */
  private _geo: AcGeArea2d
  /** The flag to indicate whether the hatch object is configured for solid fill */
  private _isSolidFill: boolean
  /** The elevation (Z-coordinate) of the hatch plane */
  private _elevation: number
  /** The definition lines for the hatch pattern */
  private _definitionLines: AcGiHatchPatternLine[]
  /** The name of the hatch pattern */
  private _patternName: string
  /** The type of hatch pattern */
  private _patternType: AcDbHatchPatternType
  /** The angle of the hatch pattern in radians */
  private _patternAngle: number
  /** The scale factor for the hatch pattern */
  private _patternScale: number
  /** The hatch style for determining which areas to hatch */
  private _hatchStyle: AcDbHatchStyle

  /**
   * Creates a new hatch entity.
   *
   * This constructor initializes a hatch with default values.
   * The elevation is 0, pattern type is Predefined, pattern scale is 1,
   * pattern angle is 0, and hatch style is Normal.
   *
   * @example
   * ```typescript
   * const hatch = new AcDbHatch();
   * hatch.patternName = "ANSI31";
   * hatch.patternScale = 2.0;
   * ```
   */
  constructor() {
    super()
    this._elevation = 0
    this._geo = new AcGeArea2d()
    this._isSolidFill = false
    this._definitionLines = []
    this._patternName = ''
    this._patternType = AcDbHatchPatternType.Predefined
    this._patternAngle = 0
    this._patternScale = 1
    this._hatchStyle = AcDbHatchStyle.Normal
  }

  /**
   * Gets whether the hatch object is configured for solid fill.
   */
  get isSolidFill() {
    return this._isSolidFill || this._patternName.toUpperCase() === 'SOLID'
  }
  /**
   * Sets whether the hatch object is configured for solid fill.
   */
  set isSolidFill(value: boolean) {
    this._isSolidFill = value
  }

  /**
   * Gets the definition lines for the hatch pattern.
   *
   * @returns Array of hatch pattern lines
   *
   * @example
   * ```typescript
   * const definitionLines = hatch.definitionLines;
   * console.log(`Number of definition lines: ${definitionLines.length}`);
   * ```
   */
  get definitionLines() {
    return this._definitionLines
  }

  /**
   * The pattern name of this hatch.
   */
  get patternName() {
    return this._patternName
  }
  set patternName(value: string) {
    this._patternName = value
  }

  /**
   * The pattern name of this hatch.
   */
  get patternType() {
    return this._patternType
  }
  set patternType(value: AcDbHatchPatternType) {
    this._patternType = value
  }

  /**
   * The pattern angle (in radians) of this hatch.
   */
  get patternAngle() {
    return this._patternAngle
  }
  set patternAngle(value: number) {
    this._patternAngle = value
  }

  /**
   * The pattern scale of the hatch entity. It is a non-zero positive number.
   */
  get patternScale() {
    return this._patternScale
  }
  set patternScale(value: number) {
    this._patternScale = value
  }

  /**
   * The pattern style of the hatch entity.
   */
  get hatchStyle() {
    return this._hatchStyle
  }
  set hatchStyle(value: AcDbHatchStyle) {
    this._hatchStyle = value
  }

  /**
   * The elevation (Z-coordinate) of the hatch plane.
   */
  get elevation() {
    return this._elevation
  }
  set elevation(value: number) {
    this._elevation = value
  }

  /**
   * Append one loop to loops of this area. If it is the first loop added, it is the outter loop.
   * Otherwise, it is an inner loop.
   * @param loop Input the loop to append
   */
  add(loop: AcGeLoop2dType) {
    this._geo.add(loop)
  }

  /**
   * @inheritdoc
   */
  get geometricExtents() {
    const box = this._geo.box
    return new AcGeBox3d(
      { x: box.min.x, y: box.min.y, z: this._elevation },
      { x: box.max.x, y: box.max.y, z: this._elevation }
    )
  }

  /**
   * Returns the full property definition for this hatch entity, including
   * general group, pattern group, and geometry group.
   *
   * The geometry group exposes editable start/end coordinates via
   * {@link AcDbPropertyAccessor} so the property palette can update
   * the hatch in real-time.
   *
   * Each property is an {@link AcDbEntityRuntimeProperty}.
   */
  get properties(): AcDbEntityProperties {
    return {
      type: this.type,
      groups: [
        this.getGeneralProperties(),
        {
          groupName: 'pattern',
          properties: [
            {
              name: 'patternType',
              type: 'enum',
              editable: true,
              options: [
                { label: AcDbHatchPatternType[0], value: 0 },
                { label: AcDbHatchPatternType[1], value: 1 },
                { label: AcDbHatchPatternType[2], value: 2 }
              ],
              accessor: {
                get: () => this.patternType,
                set: (v: AcDbHatchPatternType) => {
                  this.patternType = v
                }
              }
            },
            {
              name: 'patternName',
              type: 'string',
              editable: true,
              accessor: {
                get: () => this.patternName,
                set: (v: string) => {
                  this.patternName = v
                }
              }
            },
            {
              name: 'patternAngle',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.patternAngle,
                set: (v: number) => {
                  this.patternAngle = v
                }
              }
            },
            {
              name: 'patternScale',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.patternScale,
                set: (v: number) => {
                  this.patternScale = v
                }
              }
            }
          ]
        },
        {
          groupName: 'geometry',
          properties: [
            {
              name: 'elevation',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.elevation,
                set: (v: number) => {
                  this.elevation = v
                }
              }
            },
            {
              name: 'area',
              type: 'float',
              editable: false,
              accessor: {
                get: () => this._geo.area
              }
            }
          ]
        }
      ]
    }
  }

  /**
   * @inheritdoc
   */
  subWorldDraw(renderer: AcGiRenderer) {
    const traits = renderer.subEntityTraits
    traits.fillType = {
      solidFill: this.isSolidFill,
      patternAngle: this.patternAngle,
      definitionLines: this.definitionLines
    }
    return renderer.area(this._geo)
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    const loops = this._geo.loops
    filer.writeSubclassMarker('AcDbHatch')
    filer.writePoint3d(10, { x: 0, y: 0, z: this.elevation })
    filer.writeVector3d(210, { x: 0, y: 0, z: 1 })
    filer.writeString(
      2,
      this.patternName || (this.isSolidFill ? 'SOLID' : 'USER')
    )
    filer.writeInt16(70, this.isSolidFill ? 1 : 0)
    filer.writeInt16(71, 0)
    filer.writeInt16(91, loops.length)
    loops.forEach((loop, index) => {
      const isExternal = index === 0

      if (loop instanceof AcGePolyline2d) {
        const vertices = loop.vertices
        const hasBulge = vertices.some(vertex => (vertex.bulge ?? 0) !== 0)
        const boundaryFlag = 2

        filer.writeInt16(92, boundaryFlag)
        filer.writeInt16(72, hasBulge ? 1 : 0)
        filer.writeInt16(73, loop.closed ? 1 : 0)
        filer.writeInt16(93, vertices.length)
        for (const vertex of vertices) {
          filer.writePoint2d(10, vertex)
          if (hasBulge) {
            filer.writeDouble(42, vertex.bulge ?? 0)
          }
        }
        filer.writeInt16(97, 0)
        return
      }

      if (loop instanceof AcGeLoop2d) {
        const boundaryFlag = isExternal ? 1 : 0
        filer.writeInt16(92, boundaryFlag)
        filer.writeInt16(93, loop.numberOfEdges)

        for (const edge of loop.curves) {
          if (edge instanceof AcGeLine2d) {
            filer.writeInt16(72, 1)
            filer.writePoint2d(10, edge.startPoint)
            filer.writePoint2d(11, edge.endPoint)
            continue
          }

          if (edge instanceof AcGeCircArc2d) {
            filer.writeInt16(72, 2)
            filer.writePoint2d(10, edge.center)
            filer.writeDouble(40, edge.radius)
            filer.writeAngle(50, edge.startAngle)
            filer.writeAngle(51, edge.endAngle)
            filer.writeInt16(73, edge.clockwise ? 0 : 1)
            continue
          }

          if (edge instanceof AcGeEllipseArc2d) {
            filer.writeInt16(72, 3)
            filer.writePoint2d(10, edge.center)
            const majorAxisVector = new AcGePoint2d(
              edge.majorAxisRadius * Math.cos(edge.rotation),
              edge.majorAxisRadius * Math.sin(edge.rotation)
            )
            filer.writePoint2d(11, majorAxisVector)
            const ratio =
              edge.majorAxisRadius === 0
                ? 0
                : edge.minorAxisRadius / edge.majorAxisRadius
            filer.writeDouble(40, ratio)
            filer.writeAngle(50, edge.startAngle)
            filer.writeAngle(51, edge.endAngle)
            filer.writeInt16(73, edge.clockwise ? 0 : 1)
            continue
          }

          if (edge instanceof AcGeSpline3d) {
            const knots = edge.knots
            const controlPoints = edge.controlPoints
            const weights = edge.weights
            const fitPoints = edge.fitPoints
            const isRational = weights.some(weight => weight !== 1)

            filer.writeInt16(72, 4)
            filer.writeInt16(94, edge.degree)
            filer.writeInt16(73, isRational ? 1 : 0)
            filer.writeInt16(74, edge.closed ? 1 : 0)
            filer.writeInt16(95, knots.length)
            filer.writeInt16(96, controlPoints.length)
            knots.forEach(knot => filer.writeDouble(40, knot))
            controlPoints.forEach((point, pointIndex) => {
              filer.writePoint2d(10, point)
              if (isRational) {
                filer.writeDouble(42, weights[pointIndex] ?? 1)
              }
            })
            filer.writeInt16(97, fitPoints?.length ?? 0)
            fitPoints?.forEach(point => filer.writePoint2d(11, point))
          }
        }

        filer.writeInt16(97, 0)
      }
    })
    filer.writeInt16(75, this.hatchStyle)
    filer.writeInt16(76, this.patternType)
    filer.writeAngle(52, this.patternAngle)
    filer.writeDouble(41, this.patternScale)
    filer.writeInt16(77, 0)
    filer.writeInt16(78, this.definitionLines.length)
    this.definitionLines.forEach(line => {
      filer.writeAngle(53, line.angle)
      filer.writePoint2d(43, line.base)
      filer.writePoint2d(45, line.offset)
      filer.writeInt16(79, line.dashLengths.length)
      line.dashLengths.forEach(length => filer.writeDouble(49, length))
    })
    // TODO: Write the number of seed points
    filer.writeInt16(98, 0)
    return this
  }
}

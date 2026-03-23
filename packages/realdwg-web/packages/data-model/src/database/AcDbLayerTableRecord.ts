import { AcCmColor, AcCmTransparency, defaults } from '@mlightcad/common'
import { AcGiLineStyle, AcGiLineWeight } from '@mlightcad/graphic-interface'

import { AcDbDxfFiler } from '../base'
import {
  AcDbSymbolTableRecord,
  AcDbSymbolTableRecordAttrs
} from './AcDbSymbolTableRecord'

/**
 * Interface defining the attributes for layer table records.
 *
 * Extends the base AcDbSymbolTableRecordAttrs interface and adds layer-specific
 * properties such as color, visibility, linetype, and other layer settings.
 */
export interface AcDbLayerTableRecordAttrs extends AcDbSymbolTableRecordAttrs {
  /** The color of the layer */
  color: AcCmColor
  /** Optional description of the layer */
  description?: string
  /** Standard flags for layer properties (bit-coded values) */
  standardFlags: number
  /** Whether the layer is hidden */
  isHidden?: boolean
  /** Whether the layer is in use */
  isInUse?: boolean
  /** Whether the layer is turned off */
  isOff: boolean
  /** Whether the layer is plottable */
  isPlottable: boolean
  /** Transparency level of the layer */
  transparency: AcCmTransparency
  /** The linetype name for the layer */
  linetype: string
  /** The line weight for the layer */
  lineWeight: AcGiLineWeight
  /** The material ID associated with the layer */
  materialId?: string
}

/**
 * Represents a record in the layer table.
 *
 * This class contains information about a layer in the drawing database,
 * including color, visibility settings, linetype, and other layer properties.
 * Layers are used to organize and control the display of entities in the drawing.
 *
 * @example
 * ```typescript
 * const layer = new AcDbLayerTableRecord({
 *   name: 'MyLayer',
 *   color: new AcCmColor(255, 0, 0), // Red
 *   isOff: false,
 *   isPlottable: true
 * });
 * ```
 */
export class AcDbLayerTableRecord extends AcDbSymbolTableRecord<AcDbLayerTableRecordAttrs> {
  /**
   * Creates a new AcDbLayerTableRecord instance.
   *
   * @param attrs - Input attribute values for this layer table record
   * @param defaultAttrs - Default values for attributes of this layer table record
   */
  constructor(
    attrs?: Partial<AcDbLayerTableRecordAttrs>,
    defaultAttrs?: Partial<AcDbLayerTableRecordAttrs>
  ) {
    attrs = attrs || {}
    defaults(attrs, {
      color: new AcCmColor(),
      description: '',
      standardFlags: 0,
      isHidden: false,
      isInUse: true,
      isOff: false,
      isPlottable: true,
      transparency: new AcCmTransparency(),
      linetype: '',
      lineWeight: 1,
      materialId: -1
    })
    super(attrs, defaultAttrs)
    this.attrs.events.attrChanged.addEventListener(args => {
      this.database.events.layerModified.dispatch({
        database: this.database,
        layer: this,
        changes: args.object.changedAttributes()
      })
    })
  }

  /**
   * Gets or sets the color value of this layer.
   *
   * @returns The color of the layer
   *
   * @example
   * ```typescript
   * const color = layer.color;
   * layer.color = new AcCmColor(255, 0, 0); // Red
   * ```
   */
  get color() {
    return this.getAttr('color')
  }
  set color(value: AcCmColor) {
    this.setAttr('color', value.clone())
  }

  /**
   * Gets or sets the description of this layer.
   *
   * @returns The description of the layer
   *
   * @example
   * ```typescript
   * const description = layer.description;
   * layer.description = 'My custom layer';
   * ```
   */
  get description() {
    return this.getAttr('description')
  }
  set description(value: string) {
    this.setAttr('description', value)
  }

  /**
   * Gets or sets the standard flags for this layer.
   *
   * Standard flags are bit-coded values:
   * - 1 = Layer is frozen; otherwise layer is thawed
   * - 2 = Layer is frozen by default in new viewports
   * - 4 = Layer is locked
   * - 16 = If set, table entry is externally dependent on an xref
   * - 32 = If both this bit and bit 16 are set, the externally dependent xref has been successfully resolved
   * - 64 = If set, the table entry was referenced by at least one entity in the drawing the last time the drawing was edited
   *
   * @returns The standard flags value
   *
   * @example
   * ```typescript
   * const flags = layer.standardFlags;
   * layer.standardFlags = 1; // Freeze the layer
   * ```
   */
  get standardFlags() {
    return this.getAttr('standardFlags')
  }
  set standardFlags(value: number) {
    this.setAttr('standardFlags', value)
  }

  /**
   * Gets or sets whether this layer is frozen.
   *
   * When a layer is frozen, its entities are not displayed and cannot be modified.
   *
   * @returns True if the layer is frozen, false otherwise
   *
   * @example
   * ```typescript
   * if (layer.isFrozen) {
   *   console.log('Layer is frozen');
   * }
   * layer.isFrozen = true;
   * ```
   */
  get isFrozen() {
    return (this.standardFlags & 0x01) == 1
  }
  set isFrozen(value: boolean) {
    const flag = value ? 1 : 0
    this.standardFlags = this.standardFlags | flag
  }

  /**
   * Gets or sets whether this layer is hidden.
   *
   * When a layer is hidden, it isn't shown in the user interface of
   * the host application, but entities on the layer are still displayed.
   *
   * @returns True if the layer is hidden, false otherwise
   *
   * @example
   * ```typescript
   * if (layer.isHidden) {
   *   console.log('Layer is hidden from UI');
   * }
   * layer.isHidden = true;
   * ```
   */
  get isHidden() {
    return this.getAttr('isHidden')
  }
  set isHidden(value: boolean) {
    this.setAttr('isHidden', value)
  }

  /**
   * Gets or sets whether this layer is in use.
   *
   * A layer is considered in use if it contains entities or is referenced
   * by other objects in the drawing.
   *
   * @returns True if the layer is in use, false otherwise
   *
   * @example
   * ```typescript
   * if (layer.isInUse) {
   *   console.log('Layer contains entities');
   * }
   * ```
   */
  get isInUse() {
    return this.getAttr('isInUse')
  }
  set isInUse(value: boolean) {
    this.setAttr('isInUse', value)
  }

  /**
   * Gets or sets whether this layer is locked.
   *
   * When a layer is locked, its entities cannot be modified but are still visible.
   *
   * @returns True if the layer is locked, false otherwise
   *
   * @example
   * ```typescript
   * if (layer.isLocked) {
   *   console.log('Layer is locked');
   * }
   * layer.isLocked = true;
   * ```
   */
  get isLocked() {
    return (this.standardFlags & 0x04) == 4
  }
  set isLocked(value: boolean) {
    const flag = value ? 4 : 0
    this.standardFlags = this.standardFlags | flag
  }

  /**
   * Gets or sets whether this layer is turned off.
   *
   * When a layer is turned off, its entities are not displayed but can still be modified.
   *
   * @returns True if the layer is turned off, false otherwise
   *
   * @example
   * ```typescript
   * if (layer.isOff) {
   *   console.log('Layer is turned off');
   * }
   * layer.isOff = true;
   * ```
   */
  get isOff() {
    return this.getAttr('isOff')
  }
  set isOff(value: boolean) {
    this.setAttr('isOff', value)
  }

  /**
   * Gets or sets whether this layer is plottable.
   *
   * When a layer is plottable, its entities will be included when the drawing is plotted or printed.
   *
   * @returns True if the layer is plottable, false otherwise
   *
   * @example
   * ```typescript
   * if (layer.isPlottable) {
   *   console.log('Layer will be included in plots');
   * }
   * layer.isPlottable = false;
   * ```
   */
  get isPlottable() {
    return this.getAttr('isPlottable')
  }
  set isPlottable(value: boolean) {
    this.setAttr('isPlottable', value)
  }

  /**
   * Gets or sets the transparency level of this layer.
   *
   * Transparency values.
   *
   * @returns The transparency level
   */
  get transparency() {
    return this.getAttr('transparency')
  }
  set transparency(value: AcCmTransparency) {
    this.setAttr('transparency', value.clone())
  }

  /**
   * Gets or sets the linetype name for this layer.
   *
   * The linetype defines the pattern of dashes, dots, and spaces used
   * to display lines and curves on this layer.
   *
   * @returns The linetype name
   *
   * @example
   * ```typescript
   * const linetype = layer.linetype;
   * layer.linetype = 'DASHED';
   * ```
   */
  get linetype() {
    return this.getAttr('linetype')
  }
  set linetype(value: string) {
    this.setAttr('linetype', value)
  }

  /**
   * Gets the line style for this layer.
   *
   * This method returns the line style based on the layer's linetype
   * and other properties.
   *
   * @returns The line style object
   */
  get lineStyle(): AcGiLineStyle | undefined {
    const lineTypeRecord = this.database?.tables.linetypeTable.getAt(
      this.linetype
    )
    if (lineTypeRecord) {
      return { type: 'UserSpecified', ...lineTypeRecord.linetype }
    }
    return undefined
  }

  /**
   * Gets or sets the line weight for this layer.
   *
   * Line weight determines the thickness of lines and curves on this layer.
   *
   * @returns The line weight value
   */
  get lineWeight() {
    return this.getAttr('lineWeight')
  }
  set lineWeight(value: AcGiLineWeight) {
    this.setAttr('lineWeight', value)
  }

  /**
   * Gets or sets the material ID associated with this layer.
   *
   * Material IDs are used for rendering and visualization purposes.
   *
   * @returns The material ID
   *
   * @example
   * ```typescript
   * const materialId = layer.materialId;
   * layer.materialId = 'concrete';
   * ```
   */
  get materialId() {
    return this.getAttr('materialId')
  }
  set materialId(value: string) {
    this.setAttr('materialId', value)
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbLayerTableRecord')
    filer.writeString(2, this.name)
    filer.writeInt16(70, this.standardFlags)
    filer.writeCmColor(this.color)
    filer.writeString(6, this.linetype)
    filer.writeInt16(290, this.isPlottable ? 1 : 0)
    filer.writeInt16(370, this.lineWeight)
    filer.writeTransparency(this.transparency)
    if (this.description) {
      filer.writeString(4, this.description)
    }
    return this
  }
}

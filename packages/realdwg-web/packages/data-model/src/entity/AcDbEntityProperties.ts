/**
 * Supported value types for entity properties.
 *
 * Each type determines:
 * - how the value is rendered in the property inspector,
 * - which UI editor is used,
 * - how the value is validated.
 *
 * These types cover common CAD-style entity attributes such as
 * text values, numeric values, enumerations, and AutoCAD-like
 * drawing attributes (color, layer, linetype, lineweight, etc.).
 */
export type AcDbEntityPropertyType =
  | 'array'
  | 'string'
  | 'int'
  | 'float'
  | 'enum'
  | 'color'
  | 'transparency'
  | 'layer'
  | 'linetype'
  | 'lineweight'
  | 'boolean'

/**
 * Describes static metadata for a single property of an `AcDbEntity`.
 *
 * This structure contains only passive information used by the UI:
 * - how to label the property,
 * - how the value should be displayed,
 * - whether it is editable,
 * - what possible enum options exist, etc.
 *
 * The `value` field may hold the initial value used for display.
 * For editable properties, the actual source of truth is provided
 * by {@link AcDbPropertyAccessor} in `AcDbEntityRuntimeProperty`.
 *
 * This interface is typically used as the core metadata structure
 * inside property group definitions, presets, schema descriptions,
 * and serialization formats.
 */
export interface AcDbEntityProperty {
  /**
   * Unique identifier for the property.
   *
   * This is used internally to:
   * - map UI fields to entity fields,
   * - identify properties when diffing or merging,
   * - implement undo/redo tracking.
   */
  name: string

  /**
   * Declares the type of the property.
   *
   * Determines which UI editor is used to display or edit the value.
   * For example:
   * - `"color"` → color picker
   * - `"enum"` → dropdown list
   * - `"float"` → number input
   */
  type: AcDbEntityPropertyType

  /**
   * Optional enumeration choices, only used when `type === "enum"`.
   *
   * Each option includes a user-facing label and an associated raw value.
   */
  options?: { label: string; value: unknown }[]

  /**
   * Indicates whether this property can be edited by the user.
   *
   * - `true` → UI will present an editor widget.
   * - `false` → UI renders the value read-only.
   *
   * If omitted, the property defaults to editable.
   */
  editable?: boolean

  /**
   * Whether to skip translating the property name.
   *
   * - `true`: the property name will not be translated
   * - `false` or `undefined`: the property name will be translated (default)
   *
   * @default false
   */
  skipTranslation?: boolean

  /**
   * Schema definition for array elements.
   * Only valid when `type === "array"`.
   */
  itemSchema?: AcDbEntityArrayItemSchema
}

/**
 * Describes the structure of one object inside an "array" property.
 *
 * Each element in the array is treated like a lightweight entity
 * with its own set of typed properties.
 */
export interface AcDbEntityArrayItemSchema {
  /**
   * Property definitions for one array element.
   */
  properties: AcDbEntityProperty[]
}

/**
 * Provides read/write access to a property value stored inside an entity.
 *
 * This interface abstracts how a property is retrieved from and written back
 * to the underlying `AcDbEntity`. It allows the property panel to operate on
 * entity data without knowing the internal structure of each entity class.
 *
 * A typical implementation simply forwards `get()` / `set()` to internal
 * fields of the entity. More advanced use cases may wrap the setter with:
 * - validation,
 * - undo/redo recording,
 * - transaction systems,
 * - type conversion,
 * - event dispatch.
 *
 * @typeParam T - The type of the underlying property value.
 *
 * @example
 * ```ts
 * // Inside an entity class:
 * {
 *   name: "radius",
 *   label: "Radius",
 *   type: "float",
 *   editable: true,
 *   accessor: {
 *     get: () => this.radius,
 *     set: (v) => { this.radius = v }
 *   }
 * }
 * ```
 */
export interface AcDbPropertyAccessor<T = unknown> {
  /**
   * Retrieves the current property value from the underlying entity.
   *
   * Called by the property panel whenever the UI needs a fresh value
   * (e.g. on render, on selection change, or after external updates).
   *
   * Implementers should ensure this method has no side effects.
   *
   * @returns The current value of the property.
   */
  get(): T

  /**
   * Updates the property value on the underlying entity.
   *
   * Called by the property panel when the user edits the value in the UI.
   * This method should update the internal state of the entity immediately.
   *
   * Implementers may:
   * - perform validation,
   * - trigger change notifications,
   * - record undo/redo commands,
   * - clamp or normalize input values.
   *
   * @param value - The new value assigned to this property.
   */
  set?(value: T): void
}

/**
 * Represents a fully-resolved, runtime property used by the property inspector.
 *
 * While `AcDbEntityProperty` describes static metadata such as label, type,
 * and enum options, a runtime property additionally provides an
 * {@link AcDbPropertyAccessor} which allows the UI to read and modify the
 * live value stored inside the `AcDbEntity` instance.
 *
 * This separation ensures a clean design:
 * - Metadata remains serializable and independent of entity logic.
 * - Accessors encapsulate how values are retrieved and updated.
 * - The UI can display, edit, and validate values uniformly for all entities.
 *
 * A runtime property is typically produced by an entity's `properties()` method.
 *
 * @typeParam T - The type of the underlying property value.
 *
 * @example
 * ```ts
 * // Returned by AcDbCircle.properties():
 * {
 *   name: "centerX",
 *   label: "Center X",
 *   type: "float",
 *   editable: true,
 *   accessor: {
 *     get: () => this.center.x,
 *     set: (v) => { this.center.x = v }
 *   }
 * }
 * ```
 */
export interface AcDbEntityRuntimeProperty<T = unknown>
  extends AcDbEntityProperty {
  /**
   * Accessor providing read/write access to the underlying entity data.
   *
   * The property inspector must use this accessor to retrieve and update
   * values. It should *not* read `value` directly for editable properties.
   */
  accessor: AcDbPropertyAccessor<T>
}

/**
 * Alias representing the name/title of a property group.
 *
 * Group names are used by the property inspector UI to organize
 * properties into collapsible sections (e.g., "Geometry", "Appearance").
 */
export type AcDbEntityPropertyGroupName = string

/**
 * Represents a logical group of related entity properties.
 *
 * Groups help organize the property panel visually by grouping
 * related properties such as:
 *
 * - **Geometry** (start point, end point, radius)
 * - **Appearance** (color, linetype, layer)
 * - **Misc** (handle, visibility, flags)
 *
 * Each group contains only metadata (`AcDbEntityProperty`) and not
 * accessors. Runtime access to values is handled by the resolved
 * structure returned from entity instances.
 */
export interface AcDbEntityPropertyGroup {
  /**
   * Name of the group, shown in the UI (e.g., "Geometry").
   */
  groupName: AcDbEntityPropertyGroupName

  /**
   * List of static property metadata belonging to this group.
   */
  properties: AcDbEntityRuntimeProperty[]
}

/**
 * Top-level metadata structure returned by `AcDbEntity.properties()`.
 *
 * This object describes:
 * - the entity type (e.g., `"AcDbLine"`, `"AcDbCircle"`),
 * - all property groups belonging to that entity.
 *
 * This structure is purely metadata — it does *not* include runtime
 * accessors. The UI uses this structure to build the layout, labels,
 * grouping, and editor choices. The actual values are retrieved from
 * {@link AcDbEntityRuntimeProperty}.
 */
export interface AcDbEntityProperties {
  /**
   * The name of the entity type (e.g., `"AcDbCircle"`).
   *
   * Useful for determining which custom inspector UI or icon to use.
   */
  type: string

  /**
   * All property groups defined for this entity type.
   */
  groups: AcDbEntityPropertyGroup[]
}

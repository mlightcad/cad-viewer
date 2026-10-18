/**
 * Host member tree enforced by the script validator and the runtime proxy.
 *
 * A value of `true` is a callable method or a data leaf. Nested objects are
 * namespaces. Access past a data leaf is ordinary JavaScript on the returned
 * value (array `.map`, snapshot fields, and so on).
 */
export const CAD_SCRIPT_API_TREE = {
  drawing: {
    title: true,
    currentLayer: true,
    units: true,
    layers: true,
    extents: true
  },
  entities: {
    where: true,
    byId: true,
    inBox: true
  },
  tables: {
    appIdTable: true,
    blockTable: true,
    dimStyleTable: true,
    linetypeTable: true,
    textStyleTable: true,
    ucsTable: true,
    viewTable: true,
    layerTable: true,
    viewportTable: true
  },
  blocks: true,
  selection: {
    ids: true,
    entities: true,
    replace: true,
    add: true,
    remove: true,
    clear: true
  },
  view: {
    zoomExtents: true
  },
  edit: {
    transaction: true
  },
  log: true,
  __tick: true
} as const

/**
 * Methods available on the object passed to `cad.edit.transaction`.
 */
export const CAD_EDIT_TX_METHODS = [
  'drawLine',
  'drawCircle',
  'drawArc',
  'drawRectangle',
  'drawPolyline',
  'drawText',
  'erase',
  'setLayer',
  'move',
  'rotate',
  'createLayer',
  'setCurrentLayer'
] as const

/**
 * Compact API reference shared by the chat system prompt and the script tool.
 *
 * Adapters must embed this string instead of maintaining a second copy.
 */
export const CAD_SCRIPT_API_SUMMARY = `execute_cad_script runs a JavaScript function body with one argument, cad.
Use it for queries, statistics, batch edits, and selection highlighting.
Use draw_* tools for a single straightforward entity.
The body may return JSON. Do not import modules or touch the page.

cad.drawing -> { title, currentLayer, units, layers: [{ name, isOn, isFrozen, isLocked }], extents }
cad.entities lists every entity in the database (model space, paper space, and block definitions, plus attributes on inserts).
cad.entities.where(predicate) -> snapshots { id, ownerId, type, layer, extents, geometry }
cad.entities.byId(id) -> snapshot or undefined
cad.entities.inBox(min, max) -> snapshots whose extents hit a WCS box
cad.tables mirrors AcDbDatabase.tables: appIdTable, blockTable, dimStyleTable, linetypeTable, textStyleTable, ucsTable, viewTable, layerTable, viewportTable.
Each table is { id, records: [{ id, name, ...fields }] }.
cad.blocks -> block definitions like a DXF BLOCKS section: { id, name, origin, isModelSpace, isPaperSpace, flags, pathName, isXref, entities }.
ownerId on an entity snapshot is the owning block id, or the insert id for an attribute.
cad.selection.ids -> selected entity ids
cad.selection.entities -> snapshots of the current selection
cad.selection.replace(ids) / add(ids) / remove(ids) / clear()
cad.view.zoomExtents()
cad.log(...values)
cad.edit.transaction(label, tx => { ... }) performs one undo group.
tx methods: drawLine, drawCircle, drawArc, drawRectangle, drawPolyline, drawText,
erase(ids), setLayer(ids, layer), move(ids, dx, dy), rotate(ids, center, angleDeg),
createLayer(name), setCurrentLayer(name).
Draw inputs match the draw_* tools. tx draw methods return the new entity id.
Snapshots cover every data-model entity type. Common geometry:
Circle { center, radius }, Line { start, end }, Arc { center, radius, startAngle, endAngle } in radians,
Ellipse { center, majorRadius, minorRadius }, Polyline / 2dPolyline / 3dPolyline { points, closed },
Spline { points, closed }, Text / MText / Attribute { position, text, height },
Insert { name, position, rotation, scale }, Hatch { patternName, patternScale, boundary },
Dimension { text, measurement, textPosition, styleName } plus definition points.

Example: count circles per layer and highlight every entity on the busiest layer.
const counts = {}
for (const e of cad.entities.where(e => e.type === 'Circle')) {
  counts[e.layer] = (counts[e.layer] || 0) + 1
}
let top = ''
let max = -1
for (const [layer, count] of Object.entries(counts)) {
  if (count > max) { max = count; top = layer }
}
const ids = cad.entities.where(e => e.layer === top).map(e => e.id)
cad.selection.replace(ids)
return { counts, highlightLayer: top, count: max }`

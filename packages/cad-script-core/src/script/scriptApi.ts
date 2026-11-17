/**
 * Window key holding DXF payloads for the MCP Node host to write.
 * Lives here so Node hosts can import it from `script-api` without loading data-model.
 */
export const CAD_MCP_DXF_OUTBOX_KEY = '__cadMcpDxfOutbox'

/**
 * Window key holding binary file payloads (PDF/HTML/ZIP) for the MCP Node host.
 * Items use base64 so Playwright `page.evaluate` can round-trip them safely.
 */
export const CAD_MCP_FILE_OUTBOX_KEY = '__cadMcpFileOutbox'

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
    count: true,
    byId: true,
    inBlock: true,
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
    zoomExtents: true,
    capturePreview: true
  },
  file: {
    saveDxf: true,
    savePdf: true,
    saveHtml: true
  },
  measure: {
    distance: true,
    angleDeg: true,
    deltaAngleDeg: true,
    center: true,
    radius: true,
    length: true,
    area: true,
    check: true,
    report: true
  },
  redraw: {
    validate: true,
    draw: true,
    inspect: true,
    compare: true
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
  'drawEllipse',
  'drawHatch',
  'drawPoint',
  'drawRay',
  'drawXline',
  'drawSpline',
  'drawText',
  'drawDimAligned',
  'drawDimLinear',
  'drawDimDiameter',
  'drawDimRadius',
  'drawDimAngular',
  'drawDimArc',
  'drawDimOrdinate',
  'drawLeader',
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
export const CAD_SCRIPT_API_SUMMARY = `execute_cad_script({ code, intent? }) is the only chat tool.
- code (required): JavaScript function body with one argument, cad. Must be non-empty.
- intent (optional): short label only. Never call with intent alone — that draws nothing.
Emit the code field first in the tool arguments JSON (before intent). Keep each script
modest in size; for complex / figurative drawings, use successive short calls (body parts,
clothes, hair, details) instead of one huge script.
Prefer it for ALL drawing, queries, statistics, batch edits, selection highlighting, and
reading drawing context (cad.drawing). Do not expect draw_* or get_drawing_context tools.
The body may return JSON. Do not import modules or reference page globals
(window, document, fetch, …) as free identifiers.

cad.drawing -> { title, currentLayer, units, layers, extents }
cad.entities.where/count/inBox scan model + paper spaces only (not block definitions).
Use inBlock(id) for entities inside a block definition.
cad.entities.count(predicate) -> number (no snapshots; use for tallies)
cad.entities.where(predicate) -> snapshots (cap ~500 matches → too_many_matches)
cad.entities.byId(id) -> snapshot or undefined
cad.entities.inBlock(blockId, predicate?) -> snapshots in one block (predicate recommended)
cad.entities.inBox(min, max) -> layout-space snapshots whose extents hit a WCS box
Snapshot shape: {
  id, ownerId, type, layer,
  color, resolvedColor, lineType, lineWeight, linetypeScale, visibility, transparency,
  thickness?, normal?, extents?, geometry?
}
color / resolvedColor: { red?, green?, blue?, hex?, colorIndex?, isByColor, isByACI, isByLayer, isByBlock, isForeground }.
resolvedColor has ByLayer / ByBlock already applied. Use lineType / lineWeight / color to classify
walls, axes, dimensions, and fills.
transparency: { method, alpha, percentage?, isByAlpha, isByLayer, isByBlock }.
Predicates lazy; where/inBlock snapshot matches (cap ~500). Budget ~100k ticks / 5s → script_timeout.
NEVER snapshot a whole model space, and NEVER read e.extents inside a full where/count
(that computes bounds for every entity). For “what’s inside a frame”, use inBox per frame.
Block refs use type === 'BlockReference' (not Insert). Title blocks: BlockReference with
attributes, else text keywords. Overview tallies: cad.blocks entityCount/typeCounts.
cad.blocks -> metadata only: { id, name, origin, isModelSpace, isPaperSpace, flags, pathName, isXref, layoutId?, entityCount, typeCounts }. No entities array — use inBlock(id).
cad.tables mirrors AcDbDatabase.tables: appIdTable, blockTable, dimStyleTable, linetypeTable, textStyleTable, ucsTable, viewTable, layerTable, viewportTable.
Each table is { id, records: [{ id, name, ...fields }] }.
ownerId on an entity snapshot is the owning block id, or the insert id for an attribute.
cad.selection.ids -> selected entity ids
cad.selection.entities -> snapshots of the current selection
cad.selection.replace(ids) / add(ids) / remove(ids) / clear()
cad.view.zoomExtents()
cad.file.saveDxf(path?) writes the current drawing as DXF after the script succeeds.
Pass a path string or { path?, fileName? }. .dxf is appended when missing.
In the in-app agent this downloads the file. In cad-mcp-server it writes path
on disk (relative paths use the server process cwd). The DXF text is not
returned to the model. Returns { queued: true, index, fileName }.
The tool result then includes savedFiles: [{ path, fileName, bytes, delivery }].
cad.file.savePdf(path?) writes the current drawing as PDF after the script succeeds.
Pass a path string or { path?, fileName?, exportLayouts?, exportEmptyLayouts?,
  colorMode?, textMode?, modelSpaceFit? }. .pdf is appended when missing.
  Defaults: exportLayouts true, exportEmptyLayouts false,
colorMode 'color', textMode 'text', modelSpaceFit 'extents'. File bytes are not
returned to the model. Returns { queued: true, index, fileName }.
cad.file.saveHtml(path?) writes offline HTML (or a multi-file zip) after success.
Pass a path string or { path?, fileName?, exportFormat?, exportLayouts?,
  exportEmptyLayouts?, background? }. Defaults: exportLayouts true,
  exportEmptyLayouts false.
exportFormat is 'single' (default, .html) or 'multi' (.zip). background is
'black' | 'white' | 'space' (default). Requires a viewer host that provides
exportHtml (in-app agent / cad-mcp-server); headless database sessions skip it
with a log note. Returns { queued: true, index, fileName }.
cad.view.capturePreview({ longSide?, selection?, layers? }) queues a PNG after the script
finishes. Returns { queued: true, index }. Images are attached to the tool result for the
model (not returned as JSON). Default frames model-space drawing extents (temporarily
switches away from paper space if needed). Pass selection: true to render only the current
selection (batch-extracted geometry, framed to scene bounds) — use after
cad.selection.replace(ids). Pass layers: 'A' or ['A', 'B'] (case-insensitive) to render only
model-space geometry on those layers, framed to their combined extents (no large empty
margins; layer on/off ignored). Unknown layer names throw; do not combine with selection. Optional visual self-check when screenshots are
enabled (every agent mode); prefer cad.measure for numeric self-check.
Automatic post-round vision verification is High inference only.
cad.measure — prefer for numeric self-check (saves tokens vs hand-rolled Math):
  distance(a, b) -> number
  angleDeg(a, b) -> bearing a→b deg (-180,180]; angleDeg(a, b, c) -> interior angle at b [0,180]
  deltaAngleDeg(fromDeg, toDeg) -> smallest |Δ| in [0,180]
  center(id) / radius(id) / length(id) / area(id) -> from entity geometry, or undefined
  check(name, expected, actual, tolerance=1e-3) -> { name, expected, actual, pass }
  report(checks) -> { ok, checks }  (ok iff every pass)
After non-trivial draws, return measure.report([...]) (optionally spread with entityIds).
Example:
const o = { x: 0, y: 0 }
const id = /* from tx.drawCircle */
const c = cad.measure.center(id)
return cad.measure.report([
  cad.measure.check('r', 10, cad.measure.radius(id)),
  cad.measure.check('pcd', 57, cad.measure.distance(o, c), 0.01)
])
cad.redraw — evidence-tracked reconstruction from a reference image (spec format: the
IMAGE REDRAW section of the agent prompt / CAD_REDRAW_SPEC_SUMMARY): validate(spec, {profile?}) -> { status, errors, warnings, evidence, calibrations };
draw(spec, {profile?, omit?, offset?, allowBlocked?}) -> one undo group, returns
{ status, drawn, idMap (spec id -> CAD id), entityCount, skipped, checks, dimensionChecks, errors, warnings,
  unitsApplied, textStyle, fallbacks };
inspect(spec, idMap, {profile?}) -> re-run checks after manual fixes.
compare(spec, {referenceIndex?, calibration?, viewId?, tolerancePx?, maxSide?, images?}) -> queues a
pixel comparison with the attached reference image (registered through the spec calibration).
Returns { queued, index }; the tool result's redrawCompare[index] has { ok, reason?, verdict
(aligned|offset|incomplete|cluttered|mismatch), metrics { coverage, precision, f1, meanDistancePx,
p95DistancePx, tolerancePx, toleranceCad, meanDistanceCad, p95DistanceCad }, suggestedMove?,
shiftedCoverage?, hotspots [{ sourceRoi, cadBox, missing, extra }], advice }, and an overlay +
difference PNG are attached (red missing, blue extra, green matched). Needs a renderer and a
reference image (in-app agent); otherwise reason no_raster_host / no_reference_image.
status: pass | pass_with_warnings | needs_review | blocked | fail. draw refuses fail (and blocked
unless allowBlocked).
cad.log(...values)
cad.edit.transaction(label, tx => { ... }) performs one undo group.
tx draw methods: drawLine, drawCircle, drawArc, drawRectangle, drawPolyline, drawEllipse,
drawHatch, drawPoint, drawRay, drawXline, drawSpline, drawText,
drawDimAligned, drawDimLinear, drawDimDiameter, drawDimRadius, drawDimAngular,
drawDimArc, drawDimOrdinate, drawLeader.
Common draw inputs (optional layer?): drawLine({start,end}), drawCircle({center,radius}),
drawArc({center,radius,startAngleDeg,endAngleDeg}), drawRectangle({corner1,corner2}),
drawPolyline({points,closed?}), drawEllipse({center,majorRadius,minorRadius,rotationDeg?}),
drawHatch({boundary,patternName?}), drawPoint({position}),
drawText({position,text,height?,rotationDeg?,width?}),
drawSpline({points,closed?}), drawRay/drawXline({start,through}),
drawLeader({points,text?,textPosition?,textHeight?,textLayer?,arrowHead?,styleName?})
  — arrow tip at points[0]; text becomes an MTEXT annotation at the landing end
  (the MTEXT id is also in created ids; the call returns the leader id).
tx edit methods: erase(ids), setLayer(ids, layer), move(ids, dx, dy), rotate(ids, center, angleDeg),
createLayer(name), setCurrentLayer(name).
tx draw methods return the new entity id. Prefer one transaction for related geometry.
Do NOT fake dimensions with lines/arrows/text — use drawDim* so measurement stays associative.
Dimension draw inputs (optional text?, styleName?, layer? on all):
  drawDimAligned({ xLine1Point, xLine2Point, dimLinePoint })
  drawDimLinear({ xLine1Point, xLine2Point, dimLinePoint, rotationDeg? })
    — omit rotationDeg to pick horizontal/vertical from dimLinePoint (AutoCAD DIMLINEAR)
  drawDimDiameter({ center, radius, angleDeg?, leaderLength? })
    — or { chordPoint, farChordPoint, leaderLength? }
  drawDimRadius({ center, radius, angleDeg?, leaderLength? })
    — or { center, chordPoint, leaderLength? }
  drawDimAngular({ center, xLine1Point, xLine2Point, arcPoint })
  drawDimArc({ center, xLine1Point, xLine2Point, arcPoint })
  drawDimOrdinate({ definingPoint, leaderEndPoint, useXAxis?, origin? })
Omit styleName to use the drawing $DIMSTYLE; cad.tables.dimStyleTable lists names for styleName.
Snapshots cover every data-model entity type. Extra geometry per type:
Line { start, end, length, midPoint, direction } — no points; guard byId/geometry with ?.
Circle { center, radius, area, circumference }; Arc adds startPoint, endPoint, midPoint, length, area.
Ellipse { center, majorRadius, minorRadius, area, isCircular, closed }.
Polyline / 2dPolyline { points, vertices: [{ bulge, startWidth, endWidth }], bulges, hasBulges, length, area, closed }.
3dPolyline { points, length, closed }. Spline { controlPoints, fitPoints, knots, weights, degree, length, area }.
Spline also has points (grip points). Text { position, text, height, alignmentPoint, widthFactor, horizontalMode }.
MText { position, text, plainText (control codes stripped), height, width, columns, background }.
Attribute / AttributeDefinition add { tag, prompt?, isMTextAttribute }.
BlockReference { name, effectiveName, isDynamicBlock, position, rotation, scale, blockTransform, attributes: [{ tag, text, position }], rowCount, columnCount }.
Table adds { rows, columns, cells: string[][], rowHeights, columnWidths, attachmentPoint }.
Hatch { patternName, hatchStyle, isSolidFill, area, loops: [{ closed, points, length }], gradient* fields }.
Dimension { text, measurement, textPosition, styleName } plus definition points; measurement is computed when missing.
Leader { vertices, ... }, MLeader { contents, textLocation, leaders: [{ vertices }] },
RasterImage / Wipeout { position, width, height, clipBoundary, brightness, contrast, fade }, Viewport { center, width, height, viewTarget }.

Example: draw a circle, zoom, and verify with measure (preferred in Simple mode).
let circleId
cad.edit.transaction('draw circle', tx => {
  circleId = tx.drawCircle({ center: { x: 0, y: 0 }, radius: 100 })
})
cad.view.zoomExtents()
return cad.measure.report([
  cad.measure.check('r', 100, cad.measure.radius(circleId))
])

Example: diameter-dimension every circle (use drawDimDiameter, not line+text).
const dimIds = []
cad.edit.transaction('diameter dims', tx => {
  for (const c of cad.entities.where(e => e.type === 'Circle')) {
    const g = c.geometry
    dimIds.push(tx.drawDimDiameter({
      center: g.center,
      radius: g.radius,
      angleDeg: 0,
      leaderLength: Math.max(g.radius * 0.25, 1)
    }))
  }
})
return { dimIds, count: dimIds.length }

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

/**
 * Spec reference for `cad.redraw` (image → editable CAD with evidence tracking).
 *
 * Embedded by the CAD agent system prompt and offered to other hosts (MCP)
 * alongside {@link CAD_SCRIPT_API_SUMMARY}.
 */
export const CAD_REDRAW_SPEC_SUMMARY = `cad.redraw spec (plain JS object built inside the script):
{
  profile: 'general' | 'strict-dimensioned' | 'hybrid' | 'visual-trace' | 'geometry-only',
  units: 'unitless' | 'mm' | 'cm' | 'm' | 'in' | 'ft',   // unitless unless the image proves units
  coords?: 'cad' | 'source',      // default for entities; 'source' = image pixels (top-left, y down)
  views?: [{ id, sourceRoi?: [left, top, right, bottom], cadOrigin?: [x, y], calibration?: id }],
  calibration?: [{ id, method: 'dimension-anchor' | 'similarity' | 'affine' | 'homography'
                       | 'sheet-scale' | 'visual-only',
                   sourcePoints?: [[px, py], ...], cadPoints?: [[x, y], ...],
                   value?: number,   // dimension-anchor: real length between sourcePoints[0..1]
                   scale?: number,   // CAD units per pixel (scale-only)
                   evidence: 'known' | 'scaled' | 'inferred', sourceRefs?: [...] }],
  constraints?: [{ id?, type: 'sum' | 'difference' | 'equality', terms: [n, ...], expected, tolerance? }],
  layers?: [{ name, color?: ACI, linetype?: 'Continuous'|'HIDDEN'|'CENTER'|'DASHED'|'PHANTOM'|'DOT' }],
  entities: [ /* see below */ ],
  checks?: [{ name?, measure: 'length'|'radius'|'area'|'dimension'|'distance'|'angle',
              entity?: specId, from?: specId|[x,y], to?: specId|[x,y], expected, tolerance? }],
  validation?: { requiredLayers?, forbiddenEntityTypes?, constraintTolerance?, dimensionTolerance? },
  textHeight?: number,       // default ≈ drawing span / 80
  assumptions?: [string, ...]
}
Every entity may carry: id (stable, unique), viewId, coords, calibration, layer, color (ACI),
linetype, evidence: 'known'|'scaled'|'inferred'|'unreadable', confidence (0–1), sourceRefs, notes.
Points are [x, y] or {x, y}. Angles are degrees CCW from +X (CAD frame).
  line { start, end }                polyline { points, closed? }
  rectangle { corner1, corner2 } | { x, y, width, height }
  circle { center, radius }          arc { center, radius, startAngle, endAngle }
  ellipse { center, majorRadius, minorRadius, rotation? }    center_mark { center, size? }
  text / mtext { position, text, height?, rotation?, width? }
  leader { points (arrow tip first), text?, textPosition?, textHeight?, textLayer? }
  linear_dimension { p1, p2, dimLine, rotation?, text?, value? }
  aligned_dimension { p1, p2, dimLine, text?, value? }
  radial_dimension / diameter_dimension { center, radius, angle?, leaderLength?, text?, value? }
  angular_dimension { center, p1, p2, arcPoint, text?, value? }
  table { origin (top-left), columnWidths, rowHeights, cells?: string[][], textHeight?, textLayer? }
    — drawn as lines + text (not an AcDbTable).
Default layers (created on demand): OBJECT, HIDDEN (HIDDEN lt), CENTER (CENTER lt), DIM, TEXT,
TABLE, BORDER, CONSTRUCTION, ASSUMPTION. Without layer: geometry → OBJECT (inferred → ASSUMPTION),
text → TEXT, dims/leaders → DIM, table → TABLE, center_mark → CENTER.
draw sets INSUNITS from units, puts text and dimension text on the CJK-capable REDRAW_TEXT style
(simsun + hztxt.shx), and draws a dimension the engine rejects as lines + text (radius/diameter
as a leader) with a warning — fallbacks counts them.
Dimension value = the number read in the image; inspect compares it with what the drawn dimension
measures and reports conflicts (needs_review) instead of hiding them. Unreadable text: '[UNREADABLE]'.
geometry-only skips text, dimensions, leaders and table text. omit: ['text','dimensions','leaders',
'tableText','tables','borders','center'].`

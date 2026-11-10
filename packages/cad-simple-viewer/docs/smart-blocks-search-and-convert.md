# Smart Blocks: Search and Convert (`BSEARCH`)

`@mlightcad/cad-simple-viewer` implements AutoCAD 2026's **Smart Blocks: Search and Convert**. The user selects one instance of some repeated geometry (a door, a column, an axis bubble). The command finds every other copy in model space, lets the user review them, then replaces the selection and the chosen copies with references of one block. Texts that differ between copies become block attributes.

This guide explains the algorithm end to end: how entities are described, how copies are found, how texts are paired, and how the conversion rewrites the drawing.

| Module (`src/smartBlock/`) | Role |
|---|---|
| **`AcEdShapeFeatures.ts`** | Describes a database entity as a geometry-only `AcEdShapeFeature` |
| **`AcEdShapeMatcher.ts`** | Pure geometry: finds copies of a group of features under a similarity transform |
| **`AcApSmartBlockSearch.ts`** | Builds the template, collects candidates, pairs texts, finds equivalent blocks |
| **`AcApSmartBlockSession.ts`** | `AcApSmartBlockSearch`: UI-agnostic review state (options, include/exclude, navigation) |
| **`AcApSmartBlockConvert.ts`** | Creates the block (with attribute definitions) and replaces the geometry |

Commands built on top:

- **`-BSEARCH`** (`src/command/block/AcApDashBSearchCmd.ts`): the command-line workflow.
- **`BSEARCH`** / **`BCONVERT`** (`@mlightcad/cad-editor`): the same session with a review toolbar and a Convert to Block dialog.
- **`pdfblock`** (`@mlightcad/cad-pdf-plugin`): `-BSEARCH` with `matchLayer: false`, used after PDF import.

---

## 1. Pipeline

```
selected ids
   │
   ▼
acapBuildSmartBlockTemplate ── unsupported entities are skipped (reported)
   │   template = entities + features + text strings
   ▼
acapFindSmartBlockMatches
   │   1. split template: shapes vs. single-line texts
   │   2. collect candidates in model space (same kinds, visible, unlocked)
   │   3. acedFindShapeMatches(shapes)  ──accept──▶ TextPicker.pick(match)
   │   4. (optional) references of equivalent blocks
   │   5. sort matches left → right, bottom → top
   ▼
AcApSmartBlockSearch (session) ── review: include / exclude, change options
   │
   ▼
acapConvertSmartBlock ── new or existing block, attributes, one undo step
```

---

## 2. Search options

`AcApSmartBlockSearchOptions` mirrors AutoCAD's filters and system variables.

| Option | Default | Meaning |
|---|---|---|
| `allowRotation` | `true` | Accept rotated copies |
| `allowMirror` | `true` | Accept mirrored copies |
| `allowScale` | `false` | Accept uniformly scaled copies |
| `matchLayer` | `true` | Each copy's shapes must be on the same layers as the template's |
| `includeExistingBlocks` | `false` | Also report references of blocks equal to the template (`BSEARCHINCLUDEEXISTINGBLOCKS`) |
| `textVariations` | `true` | Copies may have different text strings, which become attributes (`TEXTTOATTRIBUTE` = 1). When `false`, texts must read the same |
| `tolerance` | 0.2 % of the template extent | Absolute matching tolerance |

Changing an option in the session runs the search again and resets the include/exclude choices, because the list of instances changes.

---

## 3. Shape features

Matching never looks at entities directly. `acedEntityToShapeFeature` turns each entity into a feature:

```ts
interface AcEdShapeFeature<Id> {
  id: Id
  kind: string        // only equal kinds can match
  label?: string      // text string (single-line text only)
  center: AcEdPoint2d // reference point that moves with the shape
  size: number        // characteristic length
  points: AcEdPoint2d[] // characteristic points, compared as a set
}
```

All coordinates are WCS. Because of that, arcs and ellipses whose extrusion is flipped (a common way to store mirrored geometry) compare correctly. When `matchLayer` is on, the kind is prefixed with the layer: `Axes|arc`.

| Entity | `kind` | `center` | `size` | `points` |
|---|---|---|---|---|
| Line | `line` | midpoint | length | both end points |
| Arc | `arc` | arc center | radius | start, mid, end point |
| Circle | `circle` | center | radius | none (no orientation) |
| Light / 2D polyline | `polyline:<open\|closed>:<n>` | vertex centroid | path length | vertices + segment midpoints (on the arc for bulged segments, so straight and arc edges differ) |
| 3D polyline | `polyline3d:<open\|closed>:<n>` | vertex centroid | path length | vertices |
| Solid / trace | `solid` / `trace` | corner centroid | perimeter | 4 corners (set comparison hides the 1-2-4-3 corner order) |
| Point | `point` | position | 0 | none |
| Hatch | `hatch:<pattern>:<solid>[:<n>]` | boundary centroid (or extents center) | √area | boundary grips (none for associative hatches) |
| Ellipse | `ellipse` | center | major radius | 9 parameter samples (8 for full ellipses, sampled from parameter 0) |
| Spline | `spline:<n>` | grip centroid | grip path length | grip points |
| Text | `text` + `label` = string | insertion point | height | insertion point and a point one height along the baseline |
| MText | `mtext:<contents>` | location | height | same as text |
| Block reference | `insert:<name>` | insertion point | x-axis scale | images of the block's unit x and y axes |

Unsupported entities (images, dimensions, tables, ...) return `undefined`. The template skips them and reports them in `unsupportedIds`, and candidates of those types are ignored.

MText contents are part of the kind, so MText always has to match exactly. It cannot become a single-line attribute.

`AcApSmartBlockFeatureCache` stores each entity's layer-free feature for the lifetime of a session. Toggling options therefore does not describe the whole drawing again. The layer prefix is added when the feature is read.

---

## 4. Finding geometry copies (`acedFindShapeMatches`)

The matcher is pure geometry with no data-model dependency. It finds every set of candidate features that is an image of the template under a **similarity transform**: translation, rotation, an optional uniform scale and optional mirroring. The transform is stored as a 2D affine map:

```
x' = a·x + c·y + e
y' = b·x + d·y + f
```

### 4.1 Preparation

1. **Tolerance.** `tol` = `options.tolerance`, or 0.2 % of the template extent. For a copy with scale `s`, distances are compared with `tol · max(1, s)`, so large copies are judged relative to their own size.
2. **Candidates by kind.** Candidates whose kind is not in the template are dropped, and so are the template's own shapes. If a template kind has no candidates at all, there is no match and the search stops.
3. **Spatial grids.** Each kind gets a uniform grid over feature centers (cell = max(template extent, 10·tol)). Lookups only touch shapes that can match.

### 4.2 Anchors

Two template shapes fix the transform:

- **Anchor 0** is the shape whose kind is **rarest** among the candidates, because each candidate of that kind is one seed to try. Among equally rare kinds the largest shape wins, and a zero-size shape is never chosen if another exists (it cannot give the scale).
- **Anchor 1** is the shape whose center is **farthest** from anchor 0, which gives the longest lever for rotation and scale.

### 4.3 Seeding

For each free candidate `c0` of anchor 0's kind (same label unless labels are ignored, same size unless scaling is allowed), the expected scale is `s0 = c0.size / a0.size` (1 without scaling). The transform then comes from one of three cases:

| Case | How the transform is fixed |
|---|---|
| Anchors have different centers (`span > tol`) | Find partners `c1` of anchor 1's kind at distance `span · s0` from `c0` (ring tolerance 2·tol). Each pair `a0→c0`, `a1→c1` gives one similarity, tried with and without mirroring. |
| All shapes share one center (one polyline, concentric shapes, two half-arcs of a circle) | The **farthest characteristic point** of anchor 0 fixes orientation. Each point of `c0` at the right radius is tried, with and without mirroring. Symmetric shapes offer several valid points. |
| No orientation at all (circles, points) | Translation (and scale) only. |

`similarityFrom(p0, p1, q0, q1, mirror)` computes the map that sends `p0→q0` and `p1→q1`. With `mirror`, the template is reflected across its local x axis first.

### 4.4 Accepting a transform

A transform is accepted only if all of the following hold:

1. **Allowed type.** Without scaling, `|s − 1| · lever ≤ 2·tol`. Without rotation, `|θ| · lever ≤ tol`.
2. **Every template shape lands on a free candidate.** Shapes are checked anchors first, then rarest kind first, so a wrong transform fails fast. For each shape:
   - The mapped center is looked up in that kind's grid within the tolerance.
   - The candidate must be unclaimed, have an equal label, a size within tolerance of `size · s`, and the same number of points.
   - Its point set must match the mapped points as a set (greedy nearest pairing, so drawing direction does not matter).
3. **The `accept` callback agrees** (`AcEdShapeMatchOptions.accept`). The Smart Blocks search uses it to require the copy's texts (see section 5). If the callback returns `false`, the matcher goes on to the next partner, point or mirror option. This matters for symmetric geometry, where several transforms map the shapes and only one puts the texts in the right place.

The first accepted transform for a seed wins. Its shapes are **claimed**, so copies never share shapes. Results come back in template order.

**Cost** is roughly *seeds × partners × template size* grid lookups. Seeds come from the rarest kind, and the grids are per kind, so dense drawings do not slow down unrelated lookups.

---

## 5. Texts: located by place, not matched as geometry

AutoCAD does not require selected texts to sit at exactly the same spot in every copy, and neither does this implementation. Texts with different strings rarely share an insertion point. For example, a PDF import places each label at its first glyph, so the left-aligned "1" and "10" in two axis bubbles start several units apart. Matching text as geometry would reject every copy whose label differs.

`acapFindSmartBlockMatches` therefore splits the template:

- **Shapes**: every feature without a `label`. These alone drive `acedFindShapeMatches`.
- **Texts**: every single-line text (`AcDbText`, which carries a `label`). These are paired after a geometry copy is found.

If the template contains *only* texts, there is no geometry to fix a transform. In that case the texts are matched as plain shapes (position, height, orientation, and string unless `textVariations`).

### 5.1 Text pairing (`TextPicker`)

Candidate texts of the template text kinds (layer-prefixed when `matchLayer` is on) are collected separately, minus locked-layer texts. Each one is located by the **center of its geometric extents**, not its insertion point, so strings of different length still line up. The candidates are kept sorted by x so a lookup scans only a narrow band.

For a geometry copy with transform `T`, scale `s` and mirror flag, each template text looks for the candidate that:

| Check | Rule |
|---|---|
| Place | extents center within **one text height** (`height · s`) of `T(template text extents center)`; the nearest one wins |
| Height | within 2 % of `height · s` |
| Orientation | baseline direction within 2° of the mapped template direction. For mirrored copies the opposite direction is accepted too, since text usually stays readable when mirrored (`MIRRTEXT` = 0) |
| String | equal to the template's, unless `textVariations` is on |
| Ownership | not already claimed by another copy or by another text of the same copy |

If any template text finds no partner, the copy is rejected: a copy has to carry every selected text. This check runs inside the matcher through `accept`, so other transforms of symmetric geometry are tried first. When it succeeds, the texts are claimed and their ids are put into the match at the template text positions.

Each match records `texts[i]`, the string of its text paired with template text `i` (`undefined` for non-text shapes).

### 5.2 Variable texts

`acapSmartBlockVariableTexts` (the `variableTexts` getter on the session) lists the template text indices whose string differs in at least one *included* loose-geometry instance. Only these become attributes. Texts that read the same everywhere stay plain text in the block definition.

---

## 6. Existing blocks

### 6.1 Equivalent blocks

`acapFindEquivalentBlocks` lists user blocks (not anonymous, not layouts, not xrefs) whose definition is the template geometry and nothing else:

1. The definition must have exactly as many entities as the template (a cheap check first), and every entity must be describable.
2. `acedFindShapeMatches` must map the template onto the definition. Rotation, mirroring and scaling are allowed, layers are ignored (block content usually lives on layer `0`), and labels are ignored when `textVariations` is on. Attribute definitions extend `AcDbText`, so they take the place of the template's texts.

Each result carries the transform from template coordinates into block coordinates. The dialog and the prompt suggest the first equivalent block as the "existing block" target.

### 6.2 Existing references as instances

With `includeExistingBlocks`, every unlocked model-space reference of an equivalent block becomes an instance (`blockReference: true`, `ids = [referenceId]`). Its transform is the reference's block transform composed with the equivalent block's transform. A reference is skipped if:

- it is scaled non-uniformly (not a similarity of the template);
- it is scaled while `allowScale` is off;
- it is mirrored while `allowMirror` is off.

### 6.3 Ordering

All matches are sorted by the image of the first template feature's center under their transform: left to right, then bottom to top. Review navigation follows this order.

---

## 7. Review session

`AcApSmartBlockSearch` holds the template, the matches, the options and the current index. It does not depend on any UI. `-BSEARCH` drives it with keyword prompts, and the editor drives it with its review toolbar.

- `setOptions` searches again and resets inclusion.
- `setIncluded`, `setAllIncluded`, `next` / `prev` / `setCurrent` (wrapping around), and `indexOfEntity` (click to toggle).
- `highlight(view)` selects the source plus every included instance. `zoomToCurrent(view)` zooms to the current instance, or to the source at index `-1`.
- `defaultBasePoint` is the center of the template's extents, AutoCAD's default insertion point.
- `onChange` notifies listeners. Call `dispose()` when the review ends.

---

## 8. Conversion (`acapConvertSmartBlock`)

Call it inside one undo mark (a Write-mode command or `acapRunDatabaseEdit`) so the whole conversion undoes in one step.

### 8.1 New block

1. The name is validated by `acapValidateNewBlockName`: not empty, not anonymous, no characters AutoCAD rejects, not already used. `acapAllocateBlockName` suggests `Block1`, `Block2`, and so on.
2. The block definition gets clones of the template entities, moved so that `basePoint` becomes the block origin. Texts chosen as attributes are left out.
3. Each attribute spec (`{ index, tag, prompt }`, single-line text only) adds an `AcDbAttributeDefinition` that copies the template text's geometry and style, with the given tag and prompt.
4. The placement is a pure translation to `basePoint`.

### 8.2 Existing block

The block must exist. `placement` maps block coordinates onto the template; build it with `acapSmartBlockPlacement(basePoint, rotation, scale)` or `acapInvertAffine2d(equivalent.transform)`. No attributes are created.

### 8.3 References

One reference is inserted for the source (identity transform) and one for each included instance, unless `sourceOnly` is set. For each one:

1. `map = instance transform ∘ placement`. Its decomposition gives rotation, uniform scale and mirroring. A mirrored similarity is written as a rotation plus a negative y scale.
2. The position is `map(block origin)`, and the layer is the first template entity's layer.
3. For each attribute, an `AcDbAttribute` copies the instance's own paired text: its string, and also its exact WCS position, height and style. The attribute therefore shows exactly where the original text was, even when it sat slightly differently from the template's text.

   An existing block reference instance has no loose text. Each of its attributes copies the reference's own attribute found where the template text lands: extents center within one text height of `T(template text extents center)`, nearest first, each attribute used once. It keeps that value and placement. If the reference has no such attribute, the template text is moved onto the reference with `T`.

Finally every replaced entity is erased: the template, the included loose instances (shapes and their texts) and the included existing references. The result reports the block name, the new references and the number of erased entities.

---

## 9. Behavior compared with AutoCAD

| Topic | AutoCAD 2026 | This implementation |
|---|---|---|
| Text variations | `TEXTTOATTRIBUTE`, initial value 1 | `textVariations`, default `true` |
| Text placement | not documented; texts with different strings are found | located by extents center within one text height of the mapped template text |
| Existing blocks | `BSEARCHINCLUDEEXISTINGBLOCKS` | `includeExistingBlocks`, default `false` |
| Default insertion point | center of the selected geometry | `acapSmartBlockTemplateCenter` |
| Locked layers | not converted | shapes and texts on locked layers are never matched |
| Command line | `-BSEARCH` | `-BSEARCH` (`AcApDashBSearchCmd`) |

---

## 10. Known limitations

- **Supported entities.** Only the entity types in section 3 can be matched. Dimensions, images, tables, leaders and the like are skipped from the template, with a warning.
- **MText.** MText must match exactly and never becomes an attribute.
- **Ambiguous symmetric geometry without text.** For symmetric shapes (a circle made of two half-arcs) any valid transform may be chosen. The block reference's rotation or mirroring can then differ from how the copy was drawn, while the visual result is the same.
- **Greedy assignment.** Seeds are processed in candidate order and the first accepted transform claims its shapes. Overlapping copies that share shapes are resolved first come, first served.

---

## 11. Tests

- `__tests__/AcApSmartBlock.spec.ts`: search, layer matching, conversion, source-only, undo, text variations, place-based text pairing (axis bubbles with left-aligned labels of different lengths), equivalent blocks.
- `__tests__/AcApSmartBlockShapes.spec.ts`: shape features and the matcher for each supported entity type and transform.
- `packages/cad-editor-demo/e2e/tests/bsearch.spec.ts`: the editor workflow (review toolbar, Convert to Block dialog, attributes, undo).

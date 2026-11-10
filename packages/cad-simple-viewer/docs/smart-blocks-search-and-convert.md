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
| **`AcApSmartBlockDetect.ts`** | Prototype: finds repeated groups without a selection (section 11) |

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

- **Anchor 0** is the **rarest** shape among the candidates, because each candidate it could match is one seed to try. Without scaling, rarity counts candidates of the same kind *and* size (from a sorted size list), since one kind, such as the lines of a layer, can hold thousands of shapes while few have the anchor's length. With scaling, it counts the kind only. Among equally rare shapes the largest wins, and a zero-size shape is never chosen if another exists (it cannot give the scale).
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

**Cost** is roughly *seeds × partners × template size* grid lookups. Seeds come from the rarest shape, and the grids are per kind, so dense drawings do not slow down unrelated lookups.

When many searches run over an unchanged drawing, two things keep them cheap:
- **`AcApSmartBlockCandidatePool`** (`fromDatabase`) collects the visible, describable, unlocked model-space shapes once.
- **`AcEdShapeMatchOptions.gridCache`** lets the matcher reuse its per-kind grids. Cells are rounded up to powers of two, so templates of similar size share a grid. Cached grids hold the template's own shapes too, and lookups skip them.

Detection (section 11) uses both.

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

## 11. Detection without a selection (`acapDetectSmartBlocks`, prototype)

AutoCAD's **Detect and Convert** (`BDETECT`) sends the drawing to a cloud recognition model trained on a few architectural object types. `acapDetectSmartBlocks(db, options)` is a local, heuristic counterpart. It needs no selection and no training, finds *any* shape group that repeats, and returns groups (`AcApSmartBlockCluster`) for a UI to review. Each group's `ids` is a representative instance: pass it to `AcApSmartBlockSearch` to review and convert it with the workflow above.

### 11.1 Steps

```
shapes ─▶ touching neighbors ─▶ pair keys ─▶ frequent keys (most frequent first)
                                               │
          ┌────────────────────────────────────┘
          ▼
 align occurrences ─▶ grow round by round ─▶ rate rounds locally ─▶ verify best round
                                                                       │
 claim ◀─ add texts ◀─ refine from verified copies (absorb fragments) ◀┘
```

1. **Neighbors.** Two shapes are neighbors when they touch: a characteristic point (or center) of one lies in the other's bounds, padded by 5 % of its radius. Points sit in a uniform grid (median shape radius), and very long shapes only look around their own points. Symbols often have parts that do not touch (a marker circle inside a door, dots beside a fixture), so shapes are also neighbors when the gap between their bounds is at most the smaller one's size. Shapes longer than ten median radii (walls, grid lines) keep touching links only, which keeps this search local. Each shape keeps its 24 nearest neighbors, and the relation is kept symmetric.
2. **Pair keys.** Each neighbor pair `a → b` gets a frame:
   - The axis runs from `a`'s center to `b`'s center.
   - When the centers are within 1 % of the pair size, the direction between them is noise (PDF imports leave concentric arcs a few millionths apart). The axis then points at `a`'s farthest characteristic point instead; near-ties within 0.1 % go to the first point, so copies agree.

   The key holds the two kinds, both sizes, the center distance (2 % steps of the pair length) and the second moments of both shapes' points in the frame (0.5 % steps). With mirroring, the sign of the xy moments is normalized. Without scaling, a 5 % log-scale bucket of the pair length is added. Of `ab` and `ba`, the smaller key is used.
3. **Occurrences.** For each key with at least `minInstances` pairs, most frequent first, the free pairs that share no shape are taken (an even sample of at most 200). Each is aligned to the first one by the similarity that maps both seed shapes onto their counterparts. Symmetric pairs fit several maps (mirrored, or with the two shapes swapped), and all of them are kept.
4. **Growth.** In each round, the shapes touching the first occurrence's newest members are candidates. A candidate joins when, in at least `max(minInstances, agreement × occurrences)` occurrences (agreement 0.8), a touching shape of the same kind lands on it: same size and the same point set under that occurrence's transform. The tolerance grows with the distance from the seed. Each hit narrows that occurrence's maps to those consistent with it. Shapes that differ around each copy, such as walls of other lengths, never collect enough votes. Growth stops at `maxEntities` (64).
5. **Choosing a round.** Growth tolerates more than the exact search, and dense regular line work can grow into "tiles" that are no symbol. Every round is therefore rated with `acedFindShapeMatches` on just the shapes the other occurrences collected, which is cheap and gives a lower bound. Rounds are skipped if:
   - too few occurrences found every member;
   - the estimated saving is below `minSavings` (10);
   - the template is degenerate: only lines in one direction (dash pieces, hatch strokes, grid lines) or just two lines (corners).

   The round with the best local saving is then verified on the whole drawing with `acapFindSmartBlockMatches`. Copies that use claimed entities are dropped.
6. **Refinement.** A seed pair may play different roles in one symbol. In the test drawing's columns, "small arc at the end of a long line" occurs at both the cap and the corner, so only about half of the occurrences agree and growth stops early. The verified copies come from the exact matcher, so they are consistent: the group grows again from them, using each copy's exact transform. Shapes of earlier groups may join. Those groups (fragments of the same symbol, found first) are absorbed when the merged group, re-verified, saves more than they did together.
7. **Texts.** Free single-line texts whose center lies inside the group's bounds are added if the search with them still finds at least 80 % of the copies. With text variations they become attributes on conversion.
8. **Claiming.** All entities of the group's instances are claimed, so groups never share entities. Groups saving fewer than `minSavings` entities are dropped. Results are sorted by saving: `instances × (entities − 1)`, the entities a conversion removes.

### 11.2 Options

| Option | Default | Meaning |
|---|---|---|
| `minInstances` | 3 | Fewest instances (the representative included) |
| `minEntities` | 2 | Fewest non-text shapes per instance |
| `maxEntities` | 64 | Most shapes per instance; growth stops there |
| `minSavings` | 10 | Smallest saving reported; also prunes seeds before the exact search |
| `agreement` | 0.8 | Share of occurrences that must agree on a shape |
| `neighborLimit` | 24 | Neighbors kept per shape |
| `maxSeeds` | all | Most seed keys tried |
| `allowRotation`, `allowMirror`, `allowScale`, `matchLayer`, `textVariations` | as in section 2 | Passed to verification |

### 11.3 Results on a PDF-imported floor plan

The test drawing has 46,357 entities (37k lines). Detection takes about 10 s in the browser and 30 to 50 s under Jest in Node. It finds about 200 groups that share no entity; converting them all would remove about 33k entities. Among them:
- every **column**: 201 × 11 entities, including two half-arc corners and both end caps;
- every **axis bubble**: 48 × 3, two half arcs plus the label, which becomes an attribute;
- furniture and equipment symbols.

A fresh `AcApSmartBlockSearch` from each of the 12 largest groups finds at least as many copies as detection reports. Where it finds more, the extra copies are inside other groups (for example a small symbol that is also part of a larger repeated unit).

### 11.4 Limitations of the prototype

- **Speed.** About 10 s in the browser for 46k entities, most of it exact verification. `acapDetectSmartBlocksAsync` keeps the page responsive, but a single exact search can still block it for a moment in large drawings.
- **Size cap.** Templates stop at `maxEntities`. Large repeated units (whole furniture groups) are cut at 64 shapes, in growth order.
- **One group per entity.** Nested repetition (a symbol that also occurs inside a larger unit) is reported once, in whichever group claims it first.
- **Nearby parts only.** A symbol part farther from the rest than its own size (a label far from its symbol) is only grouped if other shapes link it. Texts inside the bounds are the exception.

### 11.5 Running it from code

- `acapDetectSmartBlocks(db, options)` runs synchronously and returns the groups.
- `acapDetectSmartBlocksAsync(db, options, { onProgress, signal, sliceMs })` runs the same steps in slices of about 30 ms. Between slices it yields to the event loop through a `MessageChannel` message: browsers clamp `setTimeout(0)` to about a second in background tabs, which would make detection crawl. `onProgress` receives `{ fraction, groups }`, and aborting `signal` rejects the promise.
- `acapConvertSmartBlockCluster(db, cluster, { name, basePoint?, attributes?, matchLayer? })` turns a group into a new block. By default the insertion point is the representative's center, and texts that differ between instances become attributes `TEXT1`, `TEXT2`, ... Call it inside one undo mark, and only while the group's entities are unchanged since detection.

### 11.6 `BDETECT` in the editor

`@mlightcad/cad-editor` adds the `BDETECT` command (Insert and AI ribbon tabs, "Detect and Convert"). `AcApBDetectCmd` extends the editor's `AcApBSearchCmd`, so reviewing a single group reuses the Search and Convert toolbar and dialog unchanged.

1. The tool palette opens on a **Detection** tab (palette title: Detect and Convert). The tab exists only while the command runs, like the Count and Find tabs it sits beside. It first shows the detection progress with a **Stop** button.
2. The tab then lists the groups, largest saving first. Each row shows:
   - a thumbnail of the representative, captured in the background with `AcApEntityPreviewConvertor`;
   - an editable block name (`Block1`, `Block2`, ..., never an existing name);
   - the instance and object counts and the layers;
   - an **Attributes** tag when texts differ between instances.
3. Clicking a row, or an object in the drawing, highlights every instance of that group and zooms to its representative.
4. **Review** (the eye button) opens the Search and Convert toolbar for that group; the list stays visible but inactive meanwhile. Copies that belong to other groups start excluded, so converting one group leaves the others intact. After the review, the list returns without the converted group, and groups that lost instances are updated.
5. **Convert selected** converts every checked group into its own new block. Names are validated first: empty, invalid, already used, or used by two checked groups.
6. **Close**, Esc, or closing the palette ends the command. The tab disappears and the palette returns to how it was: closed, or open on its previous tab. All conversions of one run undo in one step.

The tab is `MlBDetectPalette` in `MlPaletteManager`, shown through `store.dialogs.bdetectTabVisible`. Its state lives in `useBDetect` (`cad-editor/src/composable/useBDetect.ts`), following the `useBSearch` pattern: the command owns the logic and the palette only sends actions. The command races a palette action against a canvas point prompt, so canvas clicks and the command line keep working while the palette is open.

## 12. Tests

- `__tests__/AcApSmartBlock.spec.ts`: search, layer matching, conversion, source-only, undo, text variations, place-based text pairing (axis bubbles with left-aligned labels of different lengths), equivalent blocks.
- `__tests__/AcApSmartBlockShapes.spec.ts`: shape features and the matcher for each supported entity type and transform.
- `__tests__/AcApSmartBlockDetect.spec.ts`: detection of rotated and mirrored doors without their walls, several disjoint groups, labels with differing text (including near-concentric arcs), parts that do not touch, rejection of dashed line pieces, the `minInstances` / `minSavings` thresholds, async progress and abort, and converting a group into a block with attributes.
- `packages/cad-editor-demo/e2e/tests/bdetect.spec.ts`: the `BDETECT` workflow in the editor (panel, highlight, renaming, batch conversion with attributes, single-step undo).
- `packages/cad-editor-demo/e2e/tests/bsearch.spec.ts`: the editor workflow (review toolbar, Convert to Block dialog, attributes, undo).

# Large Coordinate Rendering Precision

## Purpose

This document explains the rendering principle used by the THREE renderer to
handle CAD drawings whose world coordinates are very large. The focus is the
technical idea, not the individual functions that implement it.

The problem appears when a drawing uses coordinates such as:

```text
X ~= 3,133,269
Y ~= 1,394,066
```

Those values are valid CAD world coordinates, but they are too large for naive
WebGL rendering when the visible details are much smaller than the coordinate
values themselves. The fix is to keep GPU-side numbers small while preserving
the original world-coordinate semantics on the CPU side.

## Short Version

WebGL vertex attributes and most shader arithmetic use 32-bit floating point
values. At coordinates around `3,133,269`, a 32-bit float can only represent
values on a grid spaced by `0.25`. At coordinates around `1,394,066`, the grid
spacing is `0.125`.

That means details smaller than those spacings can collapse or shift if the
renderer sends absolute CAD coordinates directly to the GPU.

The renderer now follows two rules:

1. Store geometry vertices near a local origin instead of storing large absolute
   world coordinates in GPU buffers.
2. Render objects relative to the camera instead of reconstructing large world
   coordinates inside the vertex shader.

In practice, an entity keeps its CAD world position as object transform and
metadata, while the GPU buffer contains only the small shape around that origin.

## Why 32-bit Floats Fail Here

A 32-bit float has about 7 decimal digits of precision. More precisely, it has
24 bits of significand precision, including the hidden leading bit. The spacing
between representable numbers grows as the value grows.

For the coordinate range seen in the problematic drawing:

| World value range  | Float32 spacing | Meaning                                   |
| ------------------ | --------------: | ----------------------------------------- |
| Around `1,394,066` |         `0.125` | Y coordinates snap to eighth-unit steps.  |
| Around `3,133,269` |          `0.25` | X coordinates snap to quarter-unit steps. |

This is enough to damage small CAD details.

Example:

```text
P0.x = 3,133,269.03
P1.x = 3,133,269.12

True delta = 0.09
```

When those values are stored as float32:

```text
float32(3,133,269.03) = 3,133,269.00
float32(3,133,269.12) = 3,133,269.00

Rendered delta = 0.00
```

The line segment has a real length, but after float32 quantization both X
coordinates become identical. This is not a THREE.js bug or a DXF parsing bug.
It is a direct consequence of putting large absolute coordinates into 32-bit GPU
data.

A slightly larger example shows distortion rather than total collapse:

```text
P0.x = 3,133,269.03
P1.x = 3,133,269.26

True delta = 0.23
float32 delta = 0.25
```

The shape still renders, but it is no longer geometrically faithful.

## The Core Idea: Split Shape From Position

CAD entities usually have two different kinds of information:

1. The absolute world location.
2. The local shape around that location.

For rendering precision, these should not be mixed too early.

Instead of this:

```text
GPU vertex = (3,133,269.03, 1,394,066.00, 0)
GPU vertex = (3,133,269.12, 1,394,066.00, 0)
```

Use this:

```text
Object origin = (3,133,269.075, 1,394,066.00, 0)

GPU vertex = (-0.045, 0.00, 0)
GPU vertex = ( 0.045, 0.00, 0)
```

The object still appears at the same CAD world location, but the vertex buffer
stores values close to zero. Float32 precision near zero is extremely high for
CAD display purposes, so the `0.09` unit length is preserved.

This is often called local-origin rebasing.

## Why Local Vertices Are Not Enough

Local-origin geometry fixes vertex-buffer quantization, but it does not fully
fix rendering by itself.

A normal THREE/WebGL vertex transform is conceptually:

```text
clipPosition = projectionMatrix * viewMatrix * modelMatrix * localVertex
```

For an object placed at:

```text
objectPosition = (3,133,269.075, 1,394,066.00, 0)
```

the `modelMatrix` contains that large translation. The GPU may compute:

```text
worldPosition = modelMatrix * localVertex
```

which recreates large absolute coordinates in float32. The `viewMatrix` then
subtracts a similarly large camera position. This "large number minus large
number" operation is exactly where precision is lost again.

So the renderer also avoids reconstructing absolute world position inside the
shader.

## Relative-to-Eye Rendering

The corrected shader path works in camera-relative space.

The CPU side keeps camera and object positions as JavaScript numbers, which are
64-bit floating point values. It computes a smaller relative offset:

```text
relativeObjectPosition = objectWorldPosition - cameraWorldPosition
```

For example:

```text
objectWorldPosition = (3,133,269.075, 1,394,066.000, 0)
cameraWorldPosition = (3,133,268.800, 1,394,065.700, 0)

relativeObjectPosition = (0.275, 0.300, 0)
```

The shader then transforms the local vertex without the large translation:

```text
relativeVertex =
  rotateAndScale(localVertex) + relativeObjectPosition
```

Finally, it applies the camera rotation and projection:

```text
viewPosition = cameraRotationOnly * relativeVertex
clipPosition = projectionMatrix * viewPosition
```

The important part is that shader arithmetic now sees numbers like `0.275`,
`0.300`, `-0.045`, and `0.045`, not numbers like `3,133,269.075`.

This technique is often called Relative-to-Eye rendering, or RTE.

## When the Split Translation Path Is Needed

The renderer uses the split-translation path for objects that either:

1. Have explicitly rebased geometry.
2. Have a world position whose magnitude is large enough to risk float32 loss.

A practical threshold is used so small drawings do not pay unnecessary shader
complexity. The threshold is much lower than the problematic coordinate range,
so drawings around millions of units reliably use the precision-safe path.

The threshold does not mean coordinates below it are mathematically perfect.
It is an engineering boundary for when the risk becomes large enough to justify
the alternate transform path.

## Entity Construction Principle

The safest place to fix precision is before data becomes a `Float32Array`.

Once a large coordinate has been rounded into float32, the missing bits cannot
be recovered. Later rebasing can prevent additional shader-side cancellation,
but it cannot recreate detail that was already quantized away.

So entity construction should follow this rule:

```text
Read CAD coordinates as high-precision world data.
Choose a local origin.
Subtract that origin while values are still high precision.
Create GPU buffers from the small local coordinates.
Store the origin as object/world transform.
Keep world-space bounds for selection, zooming, and culling.
```

This separation lets rendering use small numbers while the application still
understands the entity in CAD world coordinates.

## Worked Example: Short Line Segment

Consider a short line from a large-coordinate drawing:

```text
P0 = (3,133,269.03, 1,394,066.00, 0)
P1 = (3,133,269.12, 1,394,066.00, 0)
```

The real length in X is:

```text
0.09
```

### Naive GPU Buffer

If vertices are stored directly:

```text
position[0] = (3,133,269.03, 1,394,066.00, 0)
position[1] = (3,133,269.12, 1,394,066.00, 0)
```

then float32 storage snaps both X values to:

```text
position[0].x = 3,133,269.00
position[1].x = 3,133,269.00
```

The segment collapses.

### Local-Origin GPU Buffer

Choose an origin at the center:

```text
O = (3,133,269.075, 1,394,066.00, 0)
```

Store:

```text
P0_local = (-0.045, 0, 0)
P1_local = ( 0.045, 0, 0)
```

Object transform:

```text
object.position = O
```

The GPU buffer now contains small values, so the segment length is preserved.

### Camera-Relative Shader

If the camera is nearby:

```text
camera = (3,133,268.800, 1,394,065.700, 0)
```

the shader receives:

```text
object - camera = (0.275, 0.300, 0)
```

The final relative vertex positions are approximately:

```text
P0_relative = (0.230, 0.300, 0)
P1_relative = (0.320, 0.300, 0)
```

No million-scale value appears in the shader arithmetic.

## Worked Example: Indexed Line Segments

Line entities often arrive as an indexed vertex array:

```text
vertices:
  V0 = (3,133,269.03, 1,394,066.00, 0)
  V1 = (3,133,269.12, 1,394,066.00, 0)
  V2 = (3,133,269.12, 1,394,066.20, 0)

indices:
  [0, 1, 1, 2]
```

This represents two connected line segments.

The renderer computes a local origin from the vertex bounds:

```text
O = (3,133,269.075, 1,394,066.10, 0)
```

The buffer becomes:

```text
V0_local = (-0.045, -0.10, 0)
V1_local = ( 0.045, -0.10, 0)
V2_local = ( 0.045,  0.10, 0)
```

The indices stay unchanged:

```text
[0, 1, 1, 2]
```

This preserves topology and avoids changing how the line is drawn. Only the
coordinate frame changes.

For wide lines or screen-space line materials, the same idea applies to the
segment endpoint buffer:

```text
segmentStart = V0_local
segmentEnd   = V1_local
```

The line material can still expand the segment in screen space, but its input
positions are no longer large absolute world values.

## Worked Example: Polygon and Hatch Fill

Consider a rectangular hatch boundary:

```text
World boundary:
  A = (3,133,269, 1,394,066)
  B = (3,133,271, 1,394,066)
  C = (3,133,271, 1,394,068)
  D = (3,133,269, 1,394,068)
```

The local origin is the center of the boundary:

```text
O = (3,133,270, 1,394,067)
```

The triangulation input becomes:

```text
Local boundary:
  A' = (-1, -1)
  B' = ( 1, -1)
  C' = ( 1,  1)
  D' = (-1,  1)
```

The generated triangle vertices are therefore also small. The mesh is placed
back into world space with:

```text
mesh.position = (3,133,270, 1,394,067, 0)
```

The world-space bounding box remains:

```text
min = (3,133,269, 1,394,066, 0)
max = (3,133,271, 1,394,068, 0)
```

That distinction matters:

```text
GPU geometry: small local values, good precision.
Application bounds: original world values, correct CAD behavior.
```

## Pattern Hatch Coordinates

Pattern hatches need extra care because the pattern shader samples the geometry
position to decide where lines, dashes, and gaps appear.

For a pattern definition line:

```text
pattern base = (3,133,269, 1,394,066)
pattern angle = 45 degrees
dash pattern = [0.5, -0.25]
```

If the hatch geometry is rebased by:

```text
O = (3,133,270, 1,394,067)
```

then the pattern base must be rebased by the same amount:

```text
local pattern base = pattern base - O
                   = (-1, -1)
```

Otherwise, the geometry would be local while the pattern origin would still be
world-space. That mismatch causes pattern phase errors, visible shifts, or
unstable hatching.

This also affects material caching. Two hatches can have the same layer, color,
angle, and dash definition, but different local origins:

```text
Hatch A origin = (3,133,270, 1,394,067)
Hatch B origin = (3,134,000, 1,394,067)
```

Even if their pattern definitions are textually identical, their shader uniforms
are different after rebasing. They cannot safely share one cached material unless
the rebase offset is part of the cache key.

## Why Pattern Hatches Are Kept Out of General Batching

General mesh batching rewrites many entities into one shared batch coordinate
system. That is excellent for solid fills, but pattern hatches depend on
per-entity local coordinates:

```text
pattern sample position = local geometry position
```

If multiple hatches with different local origins are merged into a single batch
without additional per-vertex pattern metadata, the shader cannot know which
local pattern basis belongs to which triangle.

For correctness, patterned hatches are rendered as independent objects. This
costs more draw calls for those specific entities, but it preserves hatch
alignment and avoids precision loss.

## Worked Example: Point Symbols

A CAD point might be located at:

```text
P = (3,133,269.25, 1,394,066.125, 0)
```

Some point display modes render a visible symbol around the point, such as a
cross:

```text
Cross half-size = 5
```

The naive approach builds symbol vertices directly in world space:

```text
(3,133,264.25, 1,394,066.125, 0)
(3,133,274.25, 1,394,066.125, 0)
(3,133,269.25, 1,394,061.125, 0)
(3,133,269.25, 1,394,071.125, 0)
```

Those values are large and can be quantized before they reach the shader.

The precision-safe approach builds the symbol around zero:

```text
(-5,  0, 0)
( 5,  0, 0)
( 0, -5, 0)
( 0,  5, 0)
```

Then the object is placed at:

```text
object.position = (3,133,269.25, 1,394,066.125, 0)
```

The symbol remains visually centered on the CAD point, but the GPU only stores
small symbol coordinates.

This is also important when the point display mode changes. Rebuilding point
symbols should regenerate the local symbol geometry and then apply the point's
world offset through the object or batch transform. It should not recreate the
symbol with large absolute vertices.

## Worked Example: Raster Image Boundary

Raster images are represented by a textured polygon boundary.

Example world boundary:

```text
I0 = (3,133,260, 1,394,060)
I1 = (3,133,280, 1,394,060)
I2 = (3,133,280, 1,394,075)
I3 = (3,133,260, 1,394,075)
```

Local origin:

```text
O = (3,133,270, 1,394,067.5)
```

Local boundary:

```text
I0' = (-10, -7.5)
I1' = ( 10, -7.5)
I2' = ( 10,  7.5)
I3' = (-10,  7.5)
```

Texture UVs are generated from the local geometry. This keeps UV computation
stable and keeps the mesh vertex buffer away from million-scale coordinates.

Images are correctness-sensitive because they carry texture coordinates and
their boundary has to stay exactly aligned with the image content. Keeping them
as independent objects avoids losing UV or transform semantics during batching.

## Batching With a Batch Origin

Batching is still important for performance. The precision rule for batching is:

```text
Do not bake large world translations into the packed vertex buffer.
```

Instead, a batch chooses a stable batch origin. Each entity contributes geometry
relative to that batch origin.

Suppose the batch origin is:

```text
B = (3,133,269.075, 1,394,066.10, 0)
```

Entity A has:

```text
A_origin = B
A_local_vertex = (-0.045, -0.10, 0)
```

The packed vertex is:

```text
A_packed = A_local_vertex + A_origin - B
         = (-0.045, -0.10, 0)
```

Entity B is nearby:

```text
B_origin = (3,133,270.075, 1,394,066.10, 0)
B_local_vertex = (-0.050, 0.00, 0)
```

The packed vertex is:

```text
B_packed = B_local_vertex + B_origin - batchOrigin
         = (-0.050, 0, 0) + (1.000, 0, 0)
         = (0.950, 0, 0)
```

The batch still stores small values. The million-scale translation lives on the
batch object, and the camera-relative shader path handles that translation
without reconstructing large world coordinates.

## Unbatched Objects Inside a Batch Group

Some entities are deliberately not merged into the main geometry buffers, but
they may still be owned by a batch group for lifecycle, visibility, highlight,
or selection management.

When such an object is cloned into group ownership, the clone must not apply the
full world matrix to its geometry. Applying the full matrix would bake the large
world translation into vertex attributes:

```text
bad cloned vertex = fullWorldMatrix * localVertex
```

The safe clone process separates the matrix:

```text
rotationScaleMatrix = worldMatrix without translation
worldOffset = translation part of worldMatrix

clonedGeometry = rotationScaleMatrix * localGeometry
clonedObject.position = worldOffset
```

This preserves rotation and scale while keeping translation out of the vertex
buffer.

The cloned object then uses the same split-translation shader path as other
large-position objects.

## Bounding Boxes and Interaction

Rendering uses local coordinates, but CAD interaction still needs world-space
information.

The renderer therefore keeps two coordinate concepts:

```text
Geometry bounding box:
  Local bounds used by THREE geometry and GPU data.

Entity bounding box:
  World bounds used by zoom extents, hit testing, selection, and layout.
```

For the rectangle example:

```text
Local geometry bounds:
  min = (-1, -1, 0)
  max = ( 1,  1, 0)

World entity bounds:
  min = (3,133,269, 1,394,066, 0)
  max = (3,133,271, 1,394,068, 0)
```

The world bounds are obtained by translating local bounds by the local origin.

This is essential. If only local bounds were kept, zooming and selection would
act as if the drawing were near `(0, 0)`. If only world vertices were kept, the
GPU would lose precision.

## Material Cache Implications

Material sharing is safe only when all shader inputs represented by the material
are equivalent.

For solid fills, the material is mostly color, side, layer-derived state, and
draw-order state. The geometry origin does not change the solid color result.

For patterned hatches, the material stores pattern uniforms. After rebasing,
those uniforms depend on the local origin:

```text
localPatternBase = worldPatternBase - rebaseOffset
```

Therefore, the material identity must include the rebase offset. Without that,
one hatch can reuse a material whose pattern uniforms were created for another
hatch. The result is a correct mesh with an incorrect pattern phase.

## What This Fixes

This strategy addresses three different precision failure modes:

1. Vertex attribute quantization

   Large world vertices are rounded when stored in float32 buffers. Local
   vertices avoid the large values before the GPU upload.

2. Shader cancellation

   Standard model-view transforms can subtract large camera and object
   positions in float32. Relative-to-eye rendering sends small object-camera
   offsets to the shader.

3. Accidental translation baking

   Batching, point-symbol regeneration, and unbatched-object cloning can
   accidentally apply full world transforms to geometry. Separating translation
   from rotation and scale keeps buffers local.

## What This Does Not Fix

This approach cannot recover detail that has already been lost before the
renderer receives the data.

For example, if an upstream parser or geometry builder has already converted:

```text
3,133,269.12
```

into:

```text
float32 value = 3,133,269.00
```

then the original `.12` detail is gone. Rebasing after that point can still make
later rendering stable, but it cannot infer the missing coordinate.

The best long-term rule is:

```text
Keep CAD coordinates in high precision until after local-origin subtraction.
Only then create Float32Array GPU buffers.
```

## Performance Trade-Offs

The precision-safe path is designed to preserve most existing performance wins:

1. Lines, points, and many meshes can still be batched, but around a batch-local
   origin.
2. The shader patch adds a small amount of vertex shader work, but only to avoid
   much larger rendering errors.
3. Pattern hatches and images may remain unbatched because their correctness
   depends on per-entity local coordinates, pattern uniforms, UVs, or texture
   alignment.

The intentional trade-off is:

```text
Prefer a few more draw calls for special entities over visibly incorrect CAD
geometry.
```

For CAD viewing, correctness at high zoom levels is usually more important than
maximal batching for every entity type.

## Future Entity Checklist

When adding or modifying a renderer entity, use this checklist:

1. Does the entity create a `Float32Array` or `BufferGeometry` from CAD world
   coordinates?

   If yes, choose a local origin first and subtract it before creating the GPU
   buffer.

2. Does the object have a large world position?

   If yes, make sure rendering uses the split translation / camera-relative
   path.

3. Does the shader sample `position` directly for semantic meaning?

   Examples include hatch patterns and procedural fills. If yes, any uniforms
   that describe world-space pattern data must be rebased into the same local
   coordinate system as the geometry.

4. Can the entity be batched without losing per-entity coordinate meaning?

   If not, keep it unbatched or add explicit per-vertex/per-instance metadata
   that lets the shader reconstruct the correct local basis.

5. Does cloning or highlighting apply a world matrix to geometry?

   If yes, separate translation from rotation and scale. Do not bake large world
   translations into cloned vertex data.

6. Are world-space bounds still correct?

   Keep bounds, selection, zoom extents, and layout metadata in CAD world space
   even when geometry buffers are local.

7. Is material caching affected by the local origin?

   If a material contains uniforms derived from world positions, include the
   relevant rebase offset in the material identity.

## Validation Guidance

A good large-coordinate test file should include:

1. Short line segments whose length is below `0.25` near X coordinates around
   `3,000,000`.
2. Thin details, small holes, or close parallel segments.
3. Point symbols with visible display modes.
4. Solid hatches, patterned hatches, and gradient hatches.
5. Raster images or textured boundaries.
6. Selection and highlight checks, especially for unbatched objects.
7. Zoom and pan checks at high zoom levels.

Expected behavior:

```text
Small segments remain visible and proportional.
Pattern hatches keep stable phase while zooming and panning.
Point symbols stay centered on their CAD points.
Images remain aligned to their boundaries.
Highlight geometry overlays the original geometry.
Zoom extents and hit testing use the original world positions.
```

A failure usually means one of these happened:

```text
Large world coordinates entered a Float32Array too early.
The shader reconstructed absolute world position before view projection.
A batch or clone baked world translation into geometry.
A shader uniform still uses world coordinates while geometry uses local ones.
A material cache reused origin-dependent uniforms across different origins.
```

## Mental Model

The simplest way to reason about the fix is:

```text
CAD world space is for meaning.
Local geometry space is for GPU precision.
Camera-relative space is for shader math.
```

The renderer must preserve all three spaces and convert between them at the
right boundary:

```text
CAD data
  -> choose local origin in high precision
  -> upload small local vertices
  -> keep world transform and world bounds
  -> render with camera-relative translation
```

As long as large absolute coordinates stay out of float32 vertex buffers and out
of shader subtraction, large-coordinate CAD drawings can render accurately in
WebGL.

/**
 * How a converted entity's drawables should enter the scene graph.
 *
 * - `batch`: flatten render leaves and merge them in {@link AcTrBatchedGroup}.
 * - `unbatch`: keep the renderer placement hierarchy and draw via the unbatched path.
 */
export type AcTrDrawMode = 'batch' | 'unbatch'

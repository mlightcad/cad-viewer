import type { LayerInfo } from '../../composable'

/** Layer table row: real layer or an in-progress new-layer draft. */
export interface MlLayerTableRow extends LayerInfo {
  isDraft?: boolean
}

export type MlLayerTableChangeField =
  | 'on'
  | 'frozen'
  | 'locked'
  | 'plottable'
  | 'linetype'
  | 'lineWeight'
  | 'transparency'
  | 'description'

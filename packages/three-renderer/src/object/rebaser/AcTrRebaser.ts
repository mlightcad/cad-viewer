import { AcGePoint3d } from "@mlightcad/data-model"

export const MAX_REBASE_THRESHOLD = 1e7

export interface AcTrRebaser {
  shouldRebase(): boolean
  computeOffset(): AcGePoint3d
  rebase(): AcGePoint3d | undefined
}
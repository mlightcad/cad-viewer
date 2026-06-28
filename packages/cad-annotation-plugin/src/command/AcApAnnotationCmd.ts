import type { AcApContext } from '@mlightcad/cad-simple-viewer'
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import {
  AcEdCommand,
  AcEdOpenMode,
  type AcEdPreviewJig,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '@mlightcad/cad-simple-viewer'

import { getAnnotationServices } from '../AcApAnnotationServices'
import type { AnnotationRecord, AnnotationStyle } from '../model/types'

/**
 * Base class for annotation overlay commands.
 */
export abstract class AcApAnnotationCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  protected get services() {
    return getAnnotationServices()
  }

  protected get style(): AnnotationStyle {
    return this.services.currentStyle
  }

  protected layoutSpaceId(context: AcApContext): string {
    return String(context.doc.database.currentSpaceId)
  }

  protected async getPoint(
    prompt: string,
    jig?: AcEdPreviewJig<{ x: number; y: number }>
  ) {
    const options = new AcEdPromptPointOptions(prompt)
    if (jig) {
      options.jig = jig
      options.useBasePoint = true
      options.useDashedLine = true
    }
    const result = await AcApDocManager.instance.editor.getPoint(options)
    if (result.status !== AcEdPromptStatus.OK || !result.value) return undefined
    return result.value
  }

  protected commitRecord(context: AcApContext, partial: Omit<AnnotationRecord, 'id' | 'meta' | 'visible'>) {
    const store = this.services.getStoreFromContext(context)
    const record: AnnotationRecord = {
      id: store.createAnnotationId(),
      meta: this.services.createMeta(),
      visible: true,
      ...partial
    }
    this.services.addRecord(context, record)
    return record
  }
}
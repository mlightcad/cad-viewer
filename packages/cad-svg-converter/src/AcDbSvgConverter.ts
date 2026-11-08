import {
  ACCM_DEFAULT_UI_YIELD_BUDGET_MS,
  AcCmUiYieldGate,
  accmYieldForPaint,
  type AcDbConversionProgressCallback,
  AcDbDatabase,
  AcDbDatabaseConverter,
  type AcDbDatabaseConverterConfig,
  type AcDbDatabaseConverterReadOptions
} from '@mlightcad/data-model'

import { acdbSvgParseDocument } from './svgParse'
import { acdbSvgModelToEntities } from './svgToEntities'
import type { AcDbSvgModel } from './svgTypes'

const PARSE_START_PCT = 1
const PARSE_END_PCT = 30
const ENTITY_START_PCT = 32
const ENTITY_END_PCT = 98

/**
 * SVG → {@link AcDbDatabase} converter for File → Open.
 *
 * Decodes UTF-8 SVG text, maps a basic element subset to CAD entities, and
 * flips Y from SVG (down) to CAD (up) using the document viewBox.
 */
export class AcDbSvgConverter extends AcDbDatabaseConverter<AcDbSvgModel> {
  constructor(config: AcDbDatabaseConverterConfig = {}) {
    super({
      useWorker: false,
      ...config
    })
  }

  override async read(
    data: ArrayBuffer,
    db: AcDbDatabase,
    options: AcDbDatabaseConverterReadOptions = {}
  ) {
    const { minimumChunkSize = 50, progress } = options
    this.progress = progress

    const emit = async (
      percentage: number,
      stage: Parameters<AcDbConversionProgressCallback>[1],
      status: Parameters<AcDbConversionProgressCallback>[2],
      stageData?: unknown
    ) => {
      if (!progress) return
      await progress(percentage, stage, status, stageData)
    }

    await emit(0, 'START', 'START')
    await emit(PARSE_START_PCT, 'PARSE', 'START')
    await accmYieldForPaint()

    db.beginEventBatch()
    let batchOpen = true
    try {
      const text = decodeSvgText(data)
      const model = acdbSvgParseDocument(text)
      await emit(PARSE_END_PCT, 'PARSE', 'END', {
        unknownEntityCount: model.skippedElementCount
      })

      db.createDefaultData({ layer: true, layout: true })

      await emit(ENTITY_START_PCT, 'ENTITY', 'START')
      const entities = acdbSvgModelToEntities(model, db)
      const modelSpace = db.tables.blockTable.modelSpace
      const chunkSize = Math.max(1, minimumChunkSize)
      const yieldGate = new AcCmUiYieldGate(ACCM_DEFAULT_UI_YIELD_BUDGET_MS)
      let lastEntityPct = ENTITY_START_PCT

      for (let i = 0; i < entities.length; i++) {
        modelSpace.appendEntity(entities[i])
        if ((i + 1) % chunkSize === 0 || i + 1 === entities.length) {
          const pct =
            entities.length <= 0
              ? ENTITY_END_PCT
              : Math.min(
                  ENTITY_END_PCT,
                  ENTITY_START_PCT +
                    Math.floor(
                      ((i + 1) / entities.length) *
                        (ENTITY_END_PCT - ENTITY_START_PCT)
                    )
                )
          if (pct > lastEntityPct) {
            lastEntityPct = pct
            await emit(pct, 'ENTITY', 'IN-PROGRESS')
          }
          await yieldGate.maybeYield()
        }
      }

      await db.endEventBatchChunked(chunkSize, async (flushed, total) => {
        const pct =
          total <= 0
            ? ENTITY_END_PCT
            : Math.min(
                ENTITY_END_PCT,
                ENTITY_START_PCT +
                  Math.floor(
                    (flushed / total) * (ENTITY_END_PCT - ENTITY_START_PCT)
                  )
              )
        if (pct > lastEntityPct) {
          lastEntityPct = pct
          await emit(pct, 'ENTITY', 'IN-PROGRESS')
        }
        await yieldGate.maybeYield()
      })
      batchOpen = false
      await emit(ENTITY_END_PCT, 'ENTITY', 'END')
      await emit(100, 'END', 'END')
    } catch (error) {
      if (batchOpen) {
        db.endEventBatch()
      }
      throw error
    }
  }

  protected override async parse(data: ArrayBuffer) {
    const model = acdbSvgParseDocument(decodeSvgText(data))
    return {
      model,
      data: { unknownEntityCount: model.skippedElementCount }
    }
  }
}

function decodeSvgText(data: ArrayBuffer): string {
  let text = new TextDecoder('utf-8').decode(data)
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1)
  }
  return text
}

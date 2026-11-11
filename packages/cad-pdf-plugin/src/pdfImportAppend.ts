import type { AcDbBlockTableRecord, AcDbEntity } from '@mlightcad/data-model'

/** Entities appended per transaction commit by {@link acapPdfAppendEntities}. */
export const PDF_APPEND_CHUNK_SIZE = 5000

/**
 * Appends imported PDF entities to a block table record in chunks.
 *
 * A page-sized PDF can yield hundreds of thousands of entities. Appending them
 * all inside the command's single transaction freezes the browser: the
 * transaction recorder looks up every earlier change on each append
 * (quadratic), and the final commit sends every entity in one
 * `entityAppended` event, which overflows the call stack wherever a listener
 * spreads it (`push(...entities)`).
 *
 * When a transaction is active, it is committed and reopened after each
 * chunk. Commits made under one undo mark merge into a single undo record, so
 * the import still undoes in one step. Without a transaction the chunks are
 * plain appends, each dispatched as its own event.
 *
 * @param btr - Block table record receiving the entities (usually model space)
 * @param entities - Entities in draw order
 * @param chunkSize - Entities per chunk
 */
export function acapPdfAppendEntities(
  btr: AcDbBlockTableRecord,
  entities: readonly AcDbEntity[],
  chunkSize = PDF_APPEND_CHUNK_SIZE
) {
  const tm = btr.database.transactionManager
  const size = Math.max(1, Math.floor(chunkSize))
  for (let start = 0; start < entities.length; start += size) {
    btr.appendEntity(entities.slice(start, start + size))
    // Leave the last chunk to the caller's commit (AcEdCommand.trigger).
    if (start + size < entities.length && tm.hasTransaction()) {
      tm.commitTransaction()
      tm.startTransaction()
    }
  }
}

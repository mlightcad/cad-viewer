import {
  AcApDocManager,
  AcEdPromptEntityOptions,
  AcEdPromptStatus
} from '@mlightcad/cad-simple-viewer'
import {
  AcDbAttribute,
  AcDbAttributeDefinition,
  AcDbBlockReference,
  AcDbEntity,
  AcDbObjectId
} from '@mlightcad/data-model'
import { ref } from 'vue'

/** Shared target INSERT object id for the Enhanced Attribute Editor. */
const targetObjectId = ref<AcDbObjectId | null>(null)

/**
 * Returns whether the entity is a block reference with at least one attribute.
 */
export function isAttributedBlockReference(
  entity: AcDbEntity | undefined | null
): entity is AcDbBlockReference {
  if (!entity) return false
  if (!(entity instanceof AcDbBlockReference)) {
    const maybe = entity as AcDbBlockReference
    if (
      maybe.type !== 'BlockReference' ||
      typeof maybe.attributeIterator !== 'function'
    ) {
      return false
    }
  }
  const blockRef = entity as AcDbBlockReference
  return blockRef.attributeIterator().count > 0
}

/**
 * Resolves a block reference from a picked INSERT or ATTRIB entity.
 */
export function resolveAttributedBlockReference(
  entity: AcDbEntity | undefined | null
): AcDbBlockReference | undefined {
  if (!entity) return undefined

  if (isAttributedBlockReference(entity)) {
    return entity
  }

  if (entity instanceof AcDbAttribute || entity.type === 'Attribute') {
    const db = entity.database ?? AcApDocManager.instance?.curDocument?.database
    if (!db) return undefined
    const owner = db.tables.blockTable.getEntityById(entity.ownerId)
    if (isAttributedBlockReference(owner)) {
      return owner
    }
  }

  return undefined
}

/**
 * Looks up the ATTDEF prompt for a tag in the referenced block definition.
 */
export function findAttributePrompt(
  blockRef: AcDbBlockReference,
  tag: string
): string {
  const record = blockRef.blockTableRecord
  if (!record) return ''

  const normalized = tag.trim().toUpperCase()
  for (const entity of record.newIterator()) {
    if (
      !(entity instanceof AcDbAttributeDefinition) &&
      entity.type !== 'AttributeDefinition'
    ) {
      continue
    }
    const attDef = entity as AcDbAttributeDefinition
    if ((attDef.tag || '').trim().toUpperCase() === normalized) {
      return attDef.prompt || ''
    }
  }
  return ''
}

/**
 * Collects attributes attached to a block reference.
 */
export function listBlockAttributes(
  blockRef: AcDbBlockReference
): AcDbAttribute[] {
  return blockRef.attributeIterator().toArray()
}

/**
 * Prompts the user to select a block reference that has attributes.
 *
 * @param message - Prompt shown while picking.
 * @param rejectMessage - Shown when the picked class is not allowed.
 * @param noAttributesMessage - Shown when a valid INSERT/ATTRIB is picked but
 *   the block has no editable attributes (defaults to `rejectMessage`).
 */
export async function promptAttributedBlockReference(
  message: string,
  rejectMessage: string,
  noAttributesMessage: string = rejectMessage
): Promise<AcDbBlockReference | undefined> {
  const editor = AcApDocManager.instance?.editor
  const db = AcApDocManager.instance?.curDocument?.database
  if (!editor || !db) return undefined

  const options = new AcEdPromptEntityOptions(message)
  options.setRejectMessage(rejectMessage)
  options.addAllowedClass('BlockReference')
  options.addAllowedClass('Attribute')
  options.addAllowedClass('Attrib')

  // Keep prompting until the user cancels or picks a valid attributed INSERT.
  for (;;) {
    const result = await editor.getEntity(options)
    if (result.status !== AcEdPromptStatus.OK || !result.objectId) {
      return undefined
    }

    const entity = db.tables.blockTable.getEntityById(result.objectId)
    const blockRef = resolveAttributedBlockReference(entity)
    if (blockRef) {
      return blockRef
    }

    editor.showMessage(noAttributesMessage, 'warning')
  }
}

/**
 * Shared state and helpers for the Enhanced Attribute Editor (`attedit`).
 */
export function useAttEdit() {
  function setTargetObjectId(objectId: AcDbObjectId | null) {
    targetObjectId.value = objectId
  }

  function getTargetObjectId() {
    return targetObjectId.value
  }

  function getTargetBlockReference(): AcDbBlockReference | undefined {
    const id = targetObjectId.value
    if (!id) return undefined
    const db = AcApDocManager.instance?.curDocument?.database
    if (!db) return undefined
    const entity = db.tables.blockTable.getEntityById(id)
    return isAttributedBlockReference(entity) ? entity : undefined
  }

  function clearTarget() {
    targetObjectId.value = null
  }

  return {
    targetObjectId,
    setTargetObjectId,
    getTargetObjectId,
    getTargetBlockReference,
    clearTarget
  }
}

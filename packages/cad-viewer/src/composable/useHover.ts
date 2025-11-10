import {
  AcApDocManager,
  AcEdViewHoverEventArgs
} from '@mlightcad/cad-simple-viewer'
import { AcDbEntity, AcDbObjectId } from '@mlightcad/data-model'
import { onMounted, onUnmounted,ref } from 'vue'
  
/**
 * Composable: useHover
 * 
 * Tracks which CAD entity is currently hovered in the active view.
 * 
 * This composable automatically listens to `hover` and `unhover` events
 * from the `AcApDocManager.instance.curView.events` system in the CAD viewer.
 * It exposes reactive state containing:
 * 
 * - The currently hovered entity (`entity`)
 * - The hovered entity’s object ID (`id`)
 * - The mouse position when hovering (`mouse`)
 * - A boolean indicating if an entity is hovered (`hovered`)
 * 
 * When the component using this composable unmounts,
 * all event listeners are automatically cleaned up.
 * 
 * ---
 * @example
 * ```ts
 * import { useHover } from '@/composables/useHover'
 * import { computed } from 'vue'
 * import { colorName, entityName } from '@/locale'
 * 
 * export default {
 *   setup() {
 *     const { hovered, entity, mouse } = useHover()
 * 
 *     // Example: compute entity info for display
 *     const info = computed(() => {
 *       if (!entity.value) return null
 *       return {
 *         type: entityName(entity.value),
 *         color: colorName(entity.value.color.toString()),
 *         layer: entity.value.layer,
 *         lineType: entity.value.lineType
 *       }
 *     })
 * 
 *     // Example: compute tooltip position
 *     const tooltipStyle = computed(() => ({
 *       left: `${mouse.value.x + 10}px`,
 *       top: `${mouse.value.y + 10}px`
 *     }))
 * 
 *     return { hovered, info, tooltipStyle }
 *   }
 * }
 * ```
 * 
 * ---
 * @returns {{
 *   hovered: import('vue').Ref<boolean>;
 *   entity: import('vue').Ref<AcDbEntity | null>;
 *   id: import('vue').Ref<AcDbObjectId | null>;
 *   mouse: import('vue').Ref<{ x: number; y: number }>;
 * }}
 * Reactive state tracking the current hover context.
 */
export function useHover() {
  /** Whether an entity is currently hovered */
  const hovered = ref(false)
  /** The hovered CAD entity object (null if none) */
  const entity = ref<AcDbEntity | null>(null)
  /** Object ID of the hovered entity */
  const id = ref<AcDbObjectId | null>(null)
  /** Current mouse coordinates during hover */
  const mouse = ref({ x: -1, y: -1 })
  /** Handler for CAD viewer hover events */
  const updateHoverEntity = (args: AcEdViewHoverEventArgs) => {
    const db = AcApDocManager.instance.curDocument.database
    const ent = db.tables.blockTable.modelSpace.getIdAt(args.id)
    if (ent) {
      entity.value = ent
      id.value = args.id
      hovered.value = true
      mouse.value = { x: args.x, y: args.y }
    } else {
      hovered.value = false
      entity.value = null
      id.value = null
    }
  }

  /** Clears hover state when the cursor leaves an entity */
  const clearHover = () => {
    hovered.value = false
    entity.value = null
    id.value = null
  }

  /** Register event listeners when the component mounts */
  onMounted(() => {
    const events = AcApDocManager.instance.curView.events
    events.hover.addEventListener(updateHoverEntity)
    events.unhover.addEventListener(clearHover)
  })

  /** Unregister event listeners when the component unmounts */
  onUnmounted(() => {
    const events = AcApDocManager.instance.curView.events
    events.hover.removeEventListener(updateHoverEntity)
    events.unhover.removeEventListener(clearHover)
  })

  return {
    hovered,
    entity,
    id,
    mouse,
  }
}
  
import { ref } from 'vue'

/**
 * Bumped when named views are created, deleted, or updated so the View
 * ribbon Restore dropdown can refresh.
 */
export const namedViewsRevision = ref(0)

export function bumpNamedViewsRevision() {
  namedViewsRevision.value++
}

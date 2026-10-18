import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

import type { CadSession, CadSessionDocument, CadSessionView } from './CadSession'

/**
 * Session that reads {@link AcApDocManager.instance} on every call.
 *
 * Used by the in-page agent plugin and, later, by an in-page WebMCP adapter.
 * A process-external MCP server should implement {@link CadSession} itself.
 *
 * @returns A session bound to the viewer singleton.
 */
export function createDocManagerSession(): CadSession {
  return {
    getDocument(): CadSessionDocument | undefined {
      try {
        const doc = AcApDocManager.instance?.curDocument
        if (!doc?.database) return undefined
        return doc
      } catch {
        return undefined
      }
    },
    getView(): CadSessionView | undefined {
      try {
        const manager = AcApDocManager.instance
        const view = manager?.curView ?? manager?.context?.view
        return view
      } catch {
        return undefined
      }
    }
  }
}

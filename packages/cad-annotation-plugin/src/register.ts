import type { AcApPluginManager } from '@mlightcad/cad-simple-viewer'

import type { AcExAnnotationPluginOptions } from './createAnnotationPlugin'
import { ANNOTATION_PLUGIN_NAME } from './createAnnotationPlugin'

/** Trigger commands for lazy loading. */
export const ANNOTATION_PLUGIN_TRIGGERS = [
  'anntext',
  'anleader',
  'anarrow',
  'anline',
  'anrect',
  'anellipse',
  'ancloud',
  'ansketch',
  'animage',
  'anvideo',
  'anaudio',
  'annvis',
  'annexport',
  'annimport',
  'annpanel',
  'annbookmark'
] as const

export async function registerAnnotationPlugin(
  pluginManager: AcApPluginManager,
  options: AcExAnnotationPluginOptions = {}
): Promise<void> {
  const { createAnnotationPlugin } =
    await import('@mlightcad/cad-annotation-plugin')
  await pluginManager.loadPlugin(createAnnotationPlugin(options))
}

export function registerLazyAnnotationPlugin(
  pluginManager: AcApPluginManager
): void {
  pluginManager.registerLazyPlugin({
    name: ANNOTATION_PLUGIN_NAME,
    triggers: [...ANNOTATION_PLUGIN_TRIGGERS],
    loader: async () => {
      const { createAnnotationPlugin } =
        await import('@mlightcad/cad-annotation-plugin')
      return createAnnotationPlugin()
    }
  })
}
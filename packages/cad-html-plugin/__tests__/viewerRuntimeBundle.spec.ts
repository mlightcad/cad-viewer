/**
 * Guards the offline HTML viewer IIFE against accidentally bundling the full
 * `@mlightcad/cad-simple-viewer` package barrel (DocManager / commands / renderer).
 *
 * Requires `packages/cad-html-plugin/dist/viewer-runtime.iife.js` (run package build).
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const runtimePath = resolve(__dirname, '../dist/viewer-runtime.iife.js')

const describeIfBuilt = existsSync(runtimePath) ? describe : describe.skip

describeIfBuilt('viewer-runtime.iife.js cad-simple-viewer surface', () => {
  const source = readFileSync(runtimePath, 'utf8')

  it('keeps the trimmed UI toolbar / shortcut surface', () => {
    expect(source).toContain('ml-ex-ui-toolbar')
    expect(source).toContain('ml-ui-shortcut-toolbar')
  })

  it('does not embed the full cad-simple-viewer application stack', () => {
    // Stable string literals from modules that only live behind the main barrel.
    const forbidden = [
      'Failed to create new drawing', // AcApQNewCmd
      'acadiso.dxf', // AcApQNewCmd / new-document template
      'acapBindToolbarDocState', // command bind (HTML uses local docState)
      'AcApDocManager',
      'sendStringToExecute',
      'AcTrView2d',
      '@mlightcad/three-renderer',
      'ViewCube',
      'LibreDWG',
      'parseDwgFile',
      'notification-center',
      'AcApHtmlConvertor',
      'registerLazyHtmlPlugin'
    ]

    for (const marker of forbidden) {
      expect(source.includes(marker)).toBe(false)
    }
  })
})

if (!existsSync(runtimePath)) {
  // eslint-disable-next-line no-console
  console.warn(
    `[viewerRuntimeBundle] skipped: missing ${runtimePath} (build @mlightcad/cad-html-plugin first)`
  )
}

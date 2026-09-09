/**
 * Ensures cad-viewer no longer ships the unused `@mlightcad/ui-components`
 * MlToolBar (vertical toolbar now uses AcUiToolbar from simple-viewer).
 *
 * Requires `packages/cad-viewer/dist/cad-viewer.js` (run package build).
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const bundlePath = resolve(__dirname, '../dist/cad-viewer.js')

const describeIfBuilt = existsSync(bundlePath) ? describe : describe.skip

describeIfBuilt('cad-viewer bundle tree-shakes ui-components MlToolBar', () => {
  const source = readFileSync(bundlePath, 'utf8')

  it('keeps the local MlToolBars host that mounts AcUiToolbar', () => {
    expect(source).toContain('MlToolBars')
    expect(source).toContain('ml-vertical-toolbar-host')
  })

  it('does not embed ui-components MlToolBar chrome', () => {
    // Unique markers from MlToolBar.vue scoped styles / flyout affordance.
    const forbidden = [
      'ml-toolbar-button--flyout',
      'ml-toolbar-popover--toolbar',
      'ml-toolbar-collapse-icon',
      '--ml-toolbar-flyout-mark-size'
    ]

    for (const marker of forbidden) {
      expect(source.includes(marker)).toBe(false)
    }
  })
})

if (!existsSync(bundlePath)) {
  // eslint-disable-next-line no-console
  console.warn(
    `[cadViewerBundle] skipped: missing ${bundlePath} (build @mlightcad/cad-viewer first)`
  )
}

import {
  ACEX_HTML_SHELL_CSS,
  buildAcExHtmlShellBody,
  ML_UI_COMPACT_MAX_WIDTH
} from '../src/AcExHtmlShell'

describe('ACEX_HTML_SHELL_CSS', () => {
  it('hides drawer title rows on the phone breakpoint', () => {
    expect(ACEX_HTML_SHELL_CSS).toContain(
      '#mlcad-layer-drawer .mlcad-drawer-header,'
    )
    expect(ACEX_HTML_SHELL_CSS).toContain(
      '#mlcad-review-drawer .mlcad-drawer-header,'
    )
    expect(ACEX_HTML_SHELL_CSS).toContain(
      '#mlcad-measure-drawer .mlcad-drawer-header {'
    )
  })

  it('hides select and pan on compact and coarse-pointer layouts', () => {
    expect(ACEX_HTML_SHELL_CSS).toContain(
      `@media (max-width: ${ML_UI_COMPACT_MAX_WIDTH}px), (pointer: coarse)`
    )
    // Runtime AcUiToolbar still annotates data-action on buttons; CSS remains
    // as a belt-and-suspenders hide for compact / coarse pointer hosts.
    expect(ACEX_HTML_SHELL_CSS).toContain(
      '#mlcad-toolbar [data-action="select"],\n    #mlcad-toolbar [data-action="pan"]'
    )
  })

  it('centers the phone sheet grabber on the full sheet width', () => {
    expect(ACEX_HTML_SHELL_CSS).toContain(
      '.mlcad-drawer-sheet-chrome {\n    display: none;\n    position: relative;'
    )
    expect(ACEX_HTML_SHELL_CSS).toContain('.mlcad-drawer-grabber::before {')
    expect(ACEX_HTML_SHELL_CSS).toContain('left: 50%;')
    expect(ACEX_HTML_SHELL_CSS).toContain('transform: translate(-50%, -50%);')
  })

  it('aliases Element Plus primary so shared measure-tool SVGs resolve', () => {
    expect(ACEX_HTML_SHELL_CSS).toContain(
      '--el-color-primary: var(--mlcad-accent)'
    )
    expect(ACEX_HTML_SHELL_CSS).toContain('--ml-ui-accent: var(--mlcad-accent)')
  })

  it('keeps measure and markup overlays below chrome and session UI', () => {
    expect(ACEX_HTML_SHELL_CSS).toContain('--mlcad-z-chrome: 7;')
    expect(ACEX_HTML_SHELL_CSS).toContain('--mlcad-z-measure: 1;')
    expect(ACEX_HTML_SHELL_CSS).toContain('--mlcad-z-markup: 2;')
    expect(ACEX_HTML_SHELL_CSS).toContain(
      'z-index: var(--mlcad-z-measure);'
    )
    expect(ACEX_HTML_SHELL_CSS).toContain(
      'z-index: var(--mlcad-z-markup);'
    )
    expect(ACEX_HTML_SHELL_CSS).toContain(
      'z-index: calc(var(--mlcad-z-chrome) + 3);'
    )
  })

  it('stacks measure/markup capsules above stroke canvases', () => {
    expect(ACEX_HTML_SHELL_CSS).toMatch(
      /\.mlcad-measure-canvas \{[\s\S]*?z-index: 1;/
    )
    expect(ACEX_HTML_SHELL_CSS).toMatch(
      /\.mlcad-measure-badge \{[\s\S]*?z-index: 2;/
    )
    expect(ACEX_HTML_SHELL_CSS).toMatch(
      /\.mlcad-markup-canvas \{[\s\S]*?z-index: 1;/
    )
    expect(ACEX_HTML_SHELL_CSS).toMatch(
      /\.mlcad-markup-badge,\s*\n\s*\.mlcad-markup-stamp \{[\s\S]*?z-index: 2;/
    )
  })

  it('matches pad/desktop sub-toolbar buttons to the parent toolbar size', () => {
    expect(ACEX_HTML_SHELL_CSS).not.toContain('--mlcad-subtoolbar-btn-width')
    expect(ACEX_HTML_SHELL_CSS).toContain(
      'width: var(--mlcad-toolbar-width);\n    height: var(--mlcad-toolbar-width);'
    )
  })

  it('uses a narrower portrait slot for phone sub-toolbar buttons', () => {
    expect(ACEX_HTML_SHELL_CSS).toContain(
      'calc(var(--mlcad-toolbar-phone-height) - 16px)'
    )
    expect(ACEX_HTML_SHELL_CSS).toContain('auto-fit')
    expect(ACEX_HTML_SHELL_CSS).not.toContain(
      '--mlcad-toolbar-phone-btn-size: var(--mlcad-toolbar-phone-height)'
    )
  })

  it('hides sidebar chrome while a draw session is active', () => {
    expect(ACEX_HTML_SHELL_CSS).toContain(
      '#mlcad-root.mlcad-session-active #mlcad-sidebar {'
    )
    expect(ACEX_HTML_SHELL_CSS).toContain('visibility: hidden !important')
    expect(ACEX_HTML_SHELL_CSS).toContain('pointer-events: none !important')
    expect(ACEX_HTML_SHELL_CSS).toContain(
      '--ml-mobile-cmd-collapsed-height: var(--mlcad-toolbar-phone-height, 56px)'
    )
    expect(ACEX_HTML_SHELL_CSS).not.toContain('#mlcad-command-session {')
  })
})

describe('buildAcExHtmlShellBody', () => {
  it('provides an empty toolbar mount and canvas chrome in view mode', () => {
    const html = buildAcExHtmlShellBody('#000000', 'view')

    expect(html).toContain('id="mlcad-canvas-host"')
    expect(html).toContain('id="mlcad-status-bar"')
    expect(html).toContain(
      '<nav id="mlcad-toolbar" data-i18n-attr="aria-label" data-i18n-key="toolbar.viewerTools" aria-label="Viewer tools"></nav>'
    )
    expect(html).toContain('id="mlcad-layer-drawer"')
    expect(html).not.toContain('id="mlcad-command-session"')
    // Toolbar buttons / strips are mounted at runtime by AcExHtmlMainToolbar.
    expect(html).not.toContain('data-action="select"')
    expect(html).not.toContain('data-action="pan"')
    expect(html).not.toContain('id="mlcad-zoom-menu-btn"')
    expect(html).not.toContain('id="mlcad-zoom-strip-wrap"')
    expect(html).not.toContain('id="mlcad-settings-strip-wrap"')
    expect(html).not.toContain('id="mlcad-locale-strip-wrap"')
    expect(html).not.toContain('data-measure-mode=')
    expect(html).not.toContain('id="mlcad-measure-menu-btn"')
    expect(html).not.toContain('id="mlcad-markup-menu-btn"')
    expect(html).not.toContain('id="mlcad-snap-strip-wrap"')
    expect(html).not.toContain('id="mlcad-review-drawer"')
    expect(html).not.toContain('id="mlcad-measure-drawer"')
    expect(html).not.toContain('id="mlcad-polar-angles"')
  })

  it('includes measure/review drawers and polar panel in measure mode', () => {
    const html = buildAcExHtmlShellBody('#000000', 'measure')

    expect(html).toContain(
      '<nav id="mlcad-toolbar" data-i18n-attr="aria-label" data-i18n-key="toolbar.viewerTools" aria-label="Viewer tools"></nav>'
    )
    expect(html).toContain('id="mlcad-review-drawer"')
    expect(html).toContain('id="mlcad-measure-drawer"')
    expect(html).toContain('id="mlcad-polar-angles"')
    expect(html).toContain('id="mlcad-layer-drawer"')
    expect(html).toContain('data-measure-filter="distance"')
    expect(html).toContain('data-measure-filter="arc"')
    expect(html).toContain('data-measure-filter="angle"')
    expect(html).toContain('data-measure-filter="area"')
    expect(html).toContain('mlcad-review-detail-close')
    expect(html).not.toContain('mlcad-measure-search')
    expect((html.match(/class="mlcad-drawer-grabber"/g) ?? []).length).toBe(3)
    expect((html.match(/class="mlcad-drawer-sheet-close"/g) ?? []).length).toBe(
      3
    )
    // Static tool strips are gone; drawers sit directly under the sidebar.
    expect(html).not.toContain('id="mlcad-measure-strip-wrap"')
    expect(html).not.toContain('id="mlcad-markup-strip-wrap"')
    expect(html).not.toContain('id="mlcad-settings-strip-wrap"')
    expect(html).not.toContain('data-action="select"')
    expect(html).not.toContain('data-measure-mode=')
    expect(html).not.toContain('data-markup-mode=')
  })

  it('omits markup/measure result drawers in view mode', () => {
    const html = buildAcExHtmlShellBody('#000000', 'view')
    expect(html).not.toContain('data-markup-mode=')
    expect(html).not.toContain('data-action="clear-markups"')
    expect(html).not.toContain('data-action="markup-panel"')
    expect(html).not.toContain('id="mlcad-review-drawer"')
    expect(html).not.toContain('data-action="measure-panel"')
    expect(html).not.toContain('id="mlcad-measure-drawer"')
    // Layer drawer chrome remains in view mode.
    expect(html).toContain('mlcad-drawer-grabber')
    expect(html).toContain('mlcad-drawer-sheet-close')
    expect(html).toContain('id="mlcad-layer-drawer"')
  })

  it('keeps an empty toolbar mount when layouts are not exported', () => {
    // Layout switcher visibility is decided at runtime by AcExHtmlMainToolbar.
    const html = buildAcExHtmlShellBody('#000000', 'measure', false)

    expect(html).toContain('id="mlcad-toolbar"')
    expect(html).not.toContain('id="mlcad-layout-menu-btn"')
    expect(html).not.toContain('title="Layout"')
  })
})

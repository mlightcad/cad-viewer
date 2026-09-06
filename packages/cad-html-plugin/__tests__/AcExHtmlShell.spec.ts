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
  it('omits measurement toolbar controls in view mode', () => {
    const html = buildAcExHtmlShellBody('#000000', 'view')

    expect(html).toContain('id="mlcad-canvas-host"')
    expect(html).toContain('data-action="select"')
    expect(html).toContain('data-action="pan"')
    expect(html).toContain('id="mlcad-zoom-menu-btn"')
    expect(html).toContain('id="mlcad-zoom-strip-wrap"')
    expect(html).toContain('data-action="fit"')
    expect(html).toContain('data-action="zoom-window"')
    expect(html).toContain('data-action="zoom-original"')
    expect(html).toContain('id="mlcad-layers-btn"')
    expect(html).toContain('id="mlcad-layout-menu-btn"')
    expect(html).toContain('id="mlcad-settings-btn"')
    expect(html).toContain('id="mlcad-settings-strip-wrap"')
    expect(html).toContain('id="mlcad-settings-locale-btn"')
    expect(html).toContain('id="mlcad-locale-strip-wrap"')
    expect(html).not.toContain('id="mlcad-lang-btn"')
    expect(html).not.toContain('data-measure-mode=')
    expect(html).not.toContain('id="mlcad-measure-menu-btn"')
    expect(html).not.toContain('id="mlcad-markup-menu-btn"')
    expect(html).not.toContain('id="mlcad-snap-menu-btn"')
    expect(html).not.toContain('id="mlcad-settings-snap-btn"')
    expect(html).not.toContain('id="mlcad-snap-strip-wrap"')
    expect(html).not.toContain('mlcad-tool-separator')
    expect(html).toContain('id="mlcad-status-bar"')
    expect(html).not.toContain('id="mlcad-command-session"')
    expect(html).toContain('mlcad-tool-btn-label')
  })

  it('uses Measurement / Review / Settings parent strips in measure mode', () => {
    const html = buildAcExHtmlShellBody('#000000', 'measure')

    expect(html).toContain('data-action="select"')
    expect(html).toContain('data-action="pan"')
    expect(html).toContain('id="mlcad-zoom-menu-btn"')
    expect(html).toContain('data-action="zoom-original"')
    expect(html).toContain('id="mlcad-measure-menu-btn"')
    expect(html).toContain('id="mlcad-markup-menu-btn"')
    expect(html).toContain('id="mlcad-settings-btn"')
    expect(html).toContain('id="mlcad-settings-snap-btn"')
    expect(html).toContain('id="mlcad-settings-locale-btn"')
    expect(html).toContain('id="mlcad-layout-menu-btn"')
    expect(html).not.toContain('id="mlcad-snap-menu-btn"')
    expect(html).not.toContain('id="mlcad-lang-btn"')
    expect(html).toContain('has-children')
    expect(html).toContain('id="mlcad-measure-strip-wrap"')
    expect(html).toContain('id="mlcad-markup-strip-wrap"')
    expect(html).toContain('id="mlcad-snap-strip-wrap"')
    expect(html).toContain('id="mlcad-locale-strip-wrap"')
    expect(html).toContain('id="mlcad-settings-strip-wrap"')
    expect(html).toContain('data-action="toggle-theme"')
    expect(html).toContain('data-action="switch-bg"')
    expect(html).toContain('data-action="snap-menu"')
    expect(html).not.toContain('mlcad-measure-submenu-template')
    expect(html).not.toContain('mlcad-markup-submenu-template')
    expect(html).toContain('data-measure-mode="distance"')
    expect(html).toContain('data-measure-mode="continuous"')
    expect(html).toContain('data-action="measure-import"')
    expect(html).toContain('data-markup-mode="cloud"')
    expect(html).toContain('data-action="markup-panel"')
    expect(html).toContain('id="mlcad-review-drawer"')
    expect(html).toContain('data-action="measure-panel"')
    expect(html).toContain('id="mlcad-measure-drawer"')
    expect(html).toContain('data-measure-filter="distance"')
    expect(html).toContain('data-measure-filter="arc"')
    expect(html).toContain('data-measure-filter="angle"')
    expect(html).toContain('data-measure-filter="area"')
    expect(html).not.toContain('mlcad-measure-search')
    expect(html.indexOf('id="mlcad-measure-strip-wrap"')).toBeLessThan(
      html.indexOf('id="mlcad-measure-drawer"')
    )
    expect((html.match(/class="mlcad-drawer-grabber"/g) ?? []).length).toBe(3)
    expect((html.match(/class="mlcad-drawer-sheet-close"/g) ?? []).length).toBe(3)
    expect(html.indexOf('id="mlcad-markup-strip-wrap"')).toBeLessThan(
      html.indexOf('id="mlcad-review-drawer"')
    )
    expect(html).toContain('mlcad-review-detail-close')
    expect(html).toContain('data-action="clear-markups"')
    expect(html).toContain('id="mlcad-status-bar"')
    expect(html).not.toContain('id="mlcad-command-session"')
    expect(html.match(/mlcad-tool-separator/g)?.length).toBeGreaterThanOrEqual(2)
    // Child tools live in strips, not as first-level toolbar buttons.
    const toolbarHtml = html.match(/<nav id="mlcad-toolbar"[\s\S]*?<\/nav>/)?.[0]
    expect(toolbarHtml).toBeTruthy()
    expect(toolbarHtml).not.toContain('data-measure-mode')
    expect(toolbarHtml).not.toContain('data-markup-mode')
    expect(toolbarHtml).not.toContain('data-action="fit"')
    expect(toolbarHtml).not.toContain('data-action="zoom-window"')
    expect(toolbarHtml).not.toContain('data-action="zoom-original"')
    expect(toolbarHtml).not.toContain('title="Object snap"')
    expect(toolbarHtml).not.toContain('title="Language"')
    expect(toolbarHtml).toContain('title="Zoom"')
    expect(toolbarHtml).toContain('title="Layout"')
    expect(toolbarHtml).toContain('title="Settings"')
    expect(toolbarHtml).toContain('data-children-ui="toolbar"')
    expect(toolbarHtml).toContain('data-children-ui="menu"')
    expect(toolbarHtml).toMatch(
      /id="mlcad-measure-menu-btn"[\s\S]*?data-children-ui="toolbar"/
    )
    expect(toolbarHtml).toMatch(
      /id="mlcad-markup-menu-btn"[\s\S]*?data-children-ui="toolbar"/
    )

    const settingsStrip = html.match(
      /id="mlcad-settings-strip"[\s\S]*?<\/div>\s*<\/div>/
    )?.[0]
    expect(settingsStrip).toBeTruthy()
    expect(settingsStrip).toContain('id="mlcad-settings-snap-btn"')
    expect(settingsStrip).toContain('data-children-ui="sticky-toolbar"')
    expect(settingsStrip).toContain('id="mlcad-settings-locale-btn"')
    expect(settingsStrip).toContain('title="Language"')
    expect(settingsStrip).toContain('title="Object snap"')

    // Zoom children order: original → extents → window
    const zoomStrip = html.match(
      /id="mlcad-zoom-strip"[\s\S]*?<\/div>\s*<\/div>/
    )?.[0]
    expect(zoomStrip).toBeTruthy()
    const originalIdx = zoomStrip!.indexOf('data-action="zoom-original"')
    const fitIdx = zoomStrip!.indexOf('data-action="fit"')
    const windowIdx = zoomStrip!.indexOf('data-action="zoom-window"')
    expect(originalIdx).toBeGreaterThanOrEqual(0)
    expect(fitIdx).toBeGreaterThan(originalIdx)
    expect(windowIdx).toBeGreaterThan(fitIdx)
  })

  it('omits markup toolbar controls in view mode', () => {
    const html = buildAcExHtmlShellBody('#000000', 'view')
    expect(html).not.toContain('data-markup-mode=')
    expect(html).not.toContain('data-action="clear-markups"')
    expect(html).not.toContain('data-action="markup-panel"')
    expect(html).not.toContain('id="mlcad-review-drawer"')
    expect(html).not.toContain('data-action="measure-panel"')
    expect(html).not.toContain('id="mlcad-measure-drawer"')
    expect(html).toContain('mlcad-drawer-grabber')
    expect(html).toContain('mlcad-drawer-sheet-close')
  })

  it('omits the layout switcher when layouts are not exported', () => {
    const html = buildAcExHtmlShellBody('#000000', 'measure', false)

    expect(html).toContain('id="mlcad-layers-btn"')
    expect(html).not.toContain('id="mlcad-layout-menu-btn"')
    expect(html).not.toContain('title="Layout"')
  })
})

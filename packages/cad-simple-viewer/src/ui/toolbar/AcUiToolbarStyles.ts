/**
 * Toolbar / sub-toolbar / dropdown styles for {@link AcUiToolbar}.
 *
 * Kept separate from plugin dock/layer chrome so the offline HTML viewer-runtime
 * can inject only toolbar CSS via {@link ui-html-entry}.
 *
 * @module AcUiToolbarStyles
 * @packageDocumentation
 */

const STYLE_ID = 'ml-ui-toolbar-styles'

/**
 * Injects toolbar UI styles into `document.head` once.
 *
 * Safe to call from multiple components; subsequent calls are no-ops.
 */
export function acuiEnsureToolbarStyles(): void {
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `.ml-ex-ui-toolbar {
  position: absolute;
  z-index: 30;
  display: flex;
  gap: 4px;
  padding: 6px;
  background: var(--ml-ui-bg, #ffffff);
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  box-shadow: var(--ml-ui-shadow, 0 2px 6px rgba(0, 0, 0, 0.12));
  border-radius: 6px;
  box-sizing: border-box;
  --ml-ex-ui-toolbar-btn-size: 32px;
}

.ml-ex-ui-toolbar.no-border,
.ml-ex-ui-subtoolbar.no-border {
  border: none;
}

/* Positioning context for static hosts is applied in AcUiToolbar.ensureMountHostLayout.
   Do not force position:relative here — absolute/fixed overlay hosts (e.g. cad-viewer)
   must keep their filled box or the bar collapses to the top edge. */

.ml-ex-ui-toolbar.is-in-parent {
  position: relative;
  inset: auto;
  z-index: 30;
  flex: 0 0 auto;
}

.ml-ex-ui-toolbar.is-in-parent.is-stretch {
  align-self: stretch;
}

.ml-ex-ui-toolbar.is-in-parent:not(.is-stretch) {
  align-self: center;
}

.ml-ex-ui-toolbar-in-parent {
  display: flex;
  min-width: 0;
  min-height: 0;
}

.ml-ex-ui-toolbar-in-parent-top,
.ml-ex-ui-toolbar-in-parent-bottom {
  flex-direction: column;
}

.ml-ex-ui-toolbar-in-parent-left,
.ml-ex-ui-toolbar-in-parent-right {
  flex-direction: row;
}

.ml-ex-ui-toolbar-main {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  position: relative;
  overflow: hidden;
}

.ml-ex-ui-toolbar.is-horizontal {
  flex-direction: row;
  align-items: center;
}

.ml-ex-ui-toolbar.is-vertical {
  flex-direction: column;
  align-items: stretch;
}

.ml-ex-ui-toolbar.is-disabled {
  opacity: 0.55;
  pointer-events: none;
}

.ml-ex-ui-toolbar[hidden] {
  display: none !important;
}

.ml-ex-ui-toolbar.is-collapsed .ml-ex-ui-toolbar-btn:not(.ml-ex-ui-toolbar-collapse-btn),
.ml-ex-ui-toolbar.is-collapsed .ml-ex-ui-toolbar-separator {
  display: none;
}

.ml-ex-ui-toolbar-collapse-btn {
  box-sizing: border-box;
  padding: 0;
  flex-shrink: 0;
}

.ml-ex-ui-toolbar.is-vertical .ml-ex-ui-toolbar-collapse-btn {
  min-width: var(--ml-ex-ui-toolbar-btn-size);
  width: auto;
  min-height: calc(var(--ml-ex-ui-toolbar-btn-size) / 2);
  height: calc(var(--ml-ex-ui-toolbar-btn-size) / 2);
  margin-top: -4px;
  margin-bottom: -4px;
}

.ml-ex-ui-toolbar.is-horizontal .ml-ex-ui-toolbar-collapse-btn {
  min-height: var(--ml-ex-ui-toolbar-btn-size);
  height: auto;
  min-width: calc(var(--ml-ex-ui-toolbar-btn-size) / 2);
  width: calc(var(--ml-ex-ui-toolbar-btn-size) / 2);
  margin-left: -4px;
  margin-right: -4px;
}

.ml-ex-ui-toolbar-collapse-btn .ml-ex-ui-icon svg {
  width: calc(var(--ml-ex-ui-toolbar-btn-size) / 2);
  height: calc(var(--ml-ex-ui-toolbar-btn-size) / 2);
}

.ml-ex-ui-toolbar-separator {
  flex: 0 0 auto;
  background: var(--ml-ui-border, #dcdfe6);
}

.ml-ex-ui-toolbar.is-horizontal .ml-ex-ui-toolbar-separator {
  width: 1px;
  align-self: stretch;
  margin: 2px 4px;
  min-height: 24px;
}

.ml-ex-ui-toolbar.is-vertical .ml-ex-ui-toolbar-separator {
  height: 1px;
  width: auto;
  margin: 4px 2px;
  min-width: 24px;
}

.ml-ex-ui-toolbar-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: var(--ml-ex-ui-toolbar-btn-size);
  min-height: var(--ml-ex-ui-toolbar-btn-size);
  padding: 4px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--ml-ui-text, #303133);
  cursor: pointer;
  font-size: 12px;
}

.ml-ex-ui-toolbar.show-button-border .ml-ex-ui-toolbar-btn,
.ml-ex-ui-subtoolbar.show-button-border .ml-ex-ui-toolbar-btn {
  border-color: var(--ml-ui-border, #dcdfe6);
  background: var(--ml-ui-bg, #ffffff);
}

@media (hover: hover) {
  .ml-ex-ui-toolbar-btn:hover:not(:disabled) {
    background: var(--ml-ui-accent-soft, rgba(64, 158, 255, 0.12));
    border-color: var(--ml-ui-border, #dcdfe6);
    color: var(--ml-ui-accent, #409eff);
  }
}

.ml-ex-ui-toolbar-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ml-ex-ui-toolbar-btn.is-open,
.ml-ex-ui-toolbar-btn.is-toggled {
  border-color: var(--ml-ui-accent, #409eff);
  color: var(--ml-ui-accent, #409eff);
  background: var(--ml-ui-accent-soft, rgba(64, 158, 255, 0.12));
}

/* Flyout mark: a small opaque right triangle in the corner toward the
   submenu. It sits in the icon padding so the glyph stays clear.
   Only shown when the toolbar/subtoolbar root has .show-children-indicator
   and an edge class (is-right/is-left/…). Without the edge class the
   mark must stay hidden — otherwise an unpositioned 6×6 square appears
   in the middle of nested parents (locale / toolbar placement). */
.ml-ex-ui-toolbar.show-children-indicator.is-right
  .ml-ex-ui-toolbar-btn.has-children::after,
.ml-ex-ui-toolbar.show-children-indicator.is-left
  .ml-ex-ui-toolbar-btn.has-children::after,
.ml-ex-ui-toolbar.show-children-indicator.is-top
  .ml-ex-ui-toolbar-btn.has-children::after,
.ml-ex-ui-toolbar.show-children-indicator.is-bottom
  .ml-ex-ui-toolbar-btn.has-children::after,
.ml-ex-ui-subtoolbar.show-children-indicator.is-right
  .ml-ex-ui-toolbar-btn.has-children::after,
.ml-ex-ui-subtoolbar.show-children-indicator.is-left
  .ml-ex-ui-toolbar-btn.has-children::after,
.ml-ex-ui-subtoolbar.show-children-indicator.is-top
  .ml-ex-ui-toolbar-btn.has-children::after,
.ml-ex-ui-subtoolbar.show-children-indicator.is-bottom
  .ml-ex-ui-toolbar-btn.has-children::after {
  content: '';
  position: absolute;
  width: 6px;
  height: 6px;
  background: currentColor;
  pointer-events: none;
}

.ml-ex-ui-toolbar.show-children-indicator.is-right
  .ml-ex-ui-toolbar-btn.has-children::after,
.ml-ex-ui-subtoolbar.show-children-indicator.is-right
  .ml-ex-ui-toolbar-btn.has-children::after {
  left: 1px;
  bottom: 1px;
  clip-path: polygon(0 100%, 0 0, 100% 100%);
}

.ml-ex-ui-toolbar.show-children-indicator.is-left
  .ml-ex-ui-toolbar-btn.has-children::after,
.ml-ex-ui-subtoolbar.show-children-indicator.is-left
  .ml-ex-ui-toolbar-btn.has-children::after {
  right: 1px;
  bottom: 1px;
  clip-path: polygon(100% 100%, 0 100%, 100% 0);
}

.ml-ex-ui-toolbar.show-children-indicator.is-top
  .ml-ex-ui-toolbar-btn.has-children::after,
.ml-ex-ui-subtoolbar.show-children-indicator.is-top
  .ml-ex-ui-toolbar-btn.has-children::after {
  right: 1px;
  bottom: 1px;
  clip-path: polygon(100% 100%, 0 100%, 100% 0);
}

.ml-ex-ui-toolbar.show-children-indicator.is-bottom
  .ml-ex-ui-toolbar-btn.has-children::after,
.ml-ex-ui-subtoolbar.show-children-indicator.is-bottom
  .ml-ex-ui-toolbar-btn.has-children::after {
  right: 1px;
  top: 1px;
  clip-path: polygon(100% 0, 0 0, 100% 100%);
}

.ml-ex-ui-toolbar.has-labels .ml-ex-ui-toolbar-btn {
  flex-direction: column;
  gap: 2px;
  min-height: auto;
  padding: 6px 4px 4px;
}

.ml-ex-ui-toolbar.is-stretch.is-horizontal
  .ml-ex-ui-toolbar-btn:not(.ml-ex-ui-toolbar-overflow-btn):not(
    .ml-ex-ui-toolbar-collapse-btn
  ),
.ml-ex-ui-toolbar.is-stretch.is-vertical
  .ml-ex-ui-toolbar-btn:not(.ml-ex-ui-toolbar-overflow-btn):not(
    .ml-ex-ui-toolbar-collapse-btn
  ) {
  flex: 1 1 0;
}

.ml-ex-ui-toolbar.is-stretch.is-horizontal
  .ml-ex-ui-toolbar-btn:not(.ml-ex-ui-toolbar-overflow-btn):not(
    .ml-ex-ui-toolbar-collapse-btn
  ) {
  min-width: 0;
}

.ml-ex-ui-toolbar.is-stretch.is-vertical
  .ml-ex-ui-toolbar-btn:not(.ml-ex-ui-toolbar-overflow-btn):not(
    .ml-ex-ui-toolbar-collapse-btn
  ) {
  min-height: 0;
}

.ml-ex-ui-toolbar.is-stretch .ml-ex-ui-toolbar-separator {
  flex: 0 0 auto;
}

.ml-ex-ui-toolbar.is-stretch.is-horizontal .ml-ex-ui-toolbar-overflow-btn,
.ml-ex-ui-toolbar.is-stretch.is-horizontal .ml-ex-ui-toolbar-collapse-btn,
.ml-ex-ui-toolbar.is-stretch.is-vertical .ml-ex-ui-toolbar-overflow-btn,
.ml-ex-ui-toolbar.is-stretch.is-vertical .ml-ex-ui-toolbar-collapse-btn {
  flex: 0 0 auto;
}

.ml-ex-ui-toolbar-btn-label {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  line-height: 1.2;
  text-align: center;
}

.ml-ex-ui-toolbar.is-stretch.is-horizontal {
  border-radius: 0;
  border-left: none;
  border-right: none;
  gap: 0;
  padding: 4px 0;
}

.ml-ex-ui-toolbar.is-stretch.is-horizontal.is-bottom {
  border-bottom: none;
}

.ml-ex-ui-toolbar.is-stretch.is-horizontal .ml-ex-ui-toolbar-btn {
  border-radius: 0;
  border-top: none;
  border-bottom: none;
}

.ml-ex-ui-toolbar.is-stretch.is-horizontal .ml-ex-ui-toolbar-btn:first-child {
  border-left: none;
}

.ml-ex-ui-toolbar.is-stretch.is-horizontal .ml-ex-ui-toolbar-btn:last-child {
  border-right: none;
}

.ml-ex-ui-toolbar.is-stretch.is-vertical {
  gap: 0;
  padding: 4px 6px;
}

.ml-ex-ui-toolbar.is-overflow-wrap {
  flex-wrap: wrap;
  align-content: flex-start;
}

.ml-ex-ui-toolbar.is-overflow-wrap.is-horizontal {
  max-width: var(--ml-ex-ui-toolbar-max-width, none);
}

.ml-ex-ui-toolbar.is-overflow-wrap.is-vertical {
  max-height: var(--ml-ex-ui-toolbar-max-height, none);
}

.ml-ex-ui-toolbar.is-overflow-menu.has-labels.is-horizontal
  .ml-ex-ui-toolbar-btn:not(.ml-ex-ui-toolbar-overflow-btn):not(
    .ml-ex-ui-toolbar-collapse-btn
  ) {
  flex: 0 0 auto;
  min-width: var(--ml-ex-ui-toolbar-btn-size);
}

.ml-ex-ui-toolbar.is-overflow-menu.is-stretch.has-labels.is-horizontal
  .ml-ex-ui-toolbar-btn:not(.ml-ex-ui-toolbar-overflow-btn):not(
    .ml-ex-ui-toolbar-collapse-btn
  ) {
  flex: 1 1 0;
  min-width: 0;
}

.ml-ex-ui-toolbar.is-overflow-menu.is-vertical {
  flex-shrink: 0;
}

/* Author display:inline-flex on buttons otherwise beats the UA
   [hidden] rule and overflow menu hide loops never shrink the axis. */
.ml-ex-ui-toolbar-btn[hidden],
.ml-ex-ui-toolbar-separator[hidden],
.ml-ex-ui-toolbar-overflow-btn[hidden] {
  display: none !important;
}

.ml-ex-ui-icon {
  display: inline-flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
}

.ml-ex-ui-icon svg {
  width: 18px;
  height: 18px;
}

/* Locale short-code badges (EN / 中 / …): fill the icon box like SVG glyphs. */
.ml-ex-ui-locale-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
  user-select: none;
}

.ml-ex-ui-subtoolbar.is-overflow-wrap {
  flex-wrap: wrap;
  align-content: flex-start;
}

.ml-ex-ui-subtoolbar.is-overflow-wrap.is-horizontal {
  max-width: var(--ml-ex-ui-toolbar-max-width, none);
}

.ml-ex-ui-subtoolbar.is-overflow-wrap.is-vertical {
  max-height: var(--ml-ex-ui-toolbar-max-height, none);
}

.ml-ex-ui-subtoolbar.has-labels .ml-ex-ui-toolbar-btn {
  flex-direction: column;
  gap: 2px;
  min-height: auto;
  padding: 6px 4px 4px;
}

.ml-ex-ui-subtoolbar.is-stretch.is-horizontal
  .ml-ex-ui-toolbar-btn:not(.ml-ex-ui-toolbar-overflow-btn):not(
    .ml-ex-ui-toolbar-collapse-btn
  ),
.ml-ex-ui-subtoolbar.is-stretch.is-vertical
  .ml-ex-ui-toolbar-btn:not(.ml-ex-ui-toolbar-overflow-btn):not(
    .ml-ex-ui-toolbar-collapse-btn
  ) {
  flex: 1 1 0;
}

.ml-ex-ui-subtoolbar.is-wrap-pack.is-horizontal {
  justify-content: flex-start;
  align-content: flex-start;
}

.ml-ex-ui-subtoolbar.is-wrap-pack.is-horizontal
  .ml-ex-ui-toolbar-btn:not(.ml-ex-ui-toolbar-overflow-btn):not(
    .ml-ex-ui-toolbar-collapse-btn
  ) {
  flex-grow: 0;
  flex-shrink: 0;
  box-sizing: border-box;
}

.ml-ex-ui-subtoolbar.is-stretch.is-horizontal
  .ml-ex-ui-toolbar-btn:not(.ml-ex-ui-toolbar-overflow-btn):not(
    .ml-ex-ui-toolbar-collapse-btn
  ) {
  min-width: 0;
}

.ml-ex-ui-subtoolbar.is-stretch.is-vertical
  .ml-ex-ui-toolbar-btn:not(.ml-ex-ui-toolbar-overflow-btn):not(
    .ml-ex-ui-toolbar-collapse-btn
  ) {
  min-height: 0;
}

.ml-ex-ui-subtoolbar.is-stretch .ml-ex-ui-toolbar-separator {
  flex: 0 0 auto;
}

.ml-ex-ui-subtoolbar.is-stretch.is-horizontal {
  gap: 0;
  padding: 4px 0;
}

.ml-ex-ui-subtoolbar.is-stretch.is-vertical {
  gap: 0;
  padding: 4px 6px;
}

.ml-ex-ui-subtoolbar {
  position: absolute;
  z-index: 31;
  display: flex;
  gap: 4px;
  padding: 6px;
  background: var(--ml-ui-bg, #ffffff);
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  box-shadow: var(--ml-ui-shadow, 0 2px 6px rgba(0, 0, 0, 0.12));
  border-radius: 6px;
  box-sizing: border-box;
  --ml-ex-ui-toolbar-btn-size: 32px;
}

.ml-ex-ui-subtoolbar.is-horizontal {
  flex-direction: row;
  align-items: center;
}

.ml-ex-ui-subtoolbar.is-vertical {
  flex-direction: column;
  align-items: stretch;
}

.ml-ex-ui-subtoolbar.is-horizontal .ml-ex-ui-toolbar-separator {
  width: 1px;
  align-self: stretch;
  margin: 2px 4px;
  min-height: 24px;
}

.ml-ex-ui-subtoolbar.is-vertical .ml-ex-ui-toolbar-separator {
  height: 1px;
  width: auto;
  margin: 4px 2px;
  min-width: 24px;
}

.ml-ex-ui-dropdown {
  position: fixed;
  z-index: 100;
  min-width: 160px;
  max-height: min(360px, calc(100vh - 16px));
  overflow-y: auto;
  padding: 4px;
  background: var(--ml-ui-bg, #ffffff);
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  box-shadow: var(--ml-ui-shadow, 0 6px 18px rgba(0, 0, 0, 0.35));
  border-radius: 6px;
}

.ml-ex-ui-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--ml-ui-text, #303133);
  cursor: pointer;
  font-size: 12px;
  text-align: left;
}

.ml-ex-ui-dropdown-item:hover {
  background: var(--ml-ui-border, rgba(0, 0, 0, 0.06));
}

.ml-ex-ui-dropdown-separator {
  height: 1px;
  margin: 4px 6px;
  background: var(--ml-ui-border, #dcdfe6);
}

.ml-ex-ui-dropdown-item.is-toggled {
  color: var(--ml-ui-accent, #409eff);
  background: var(--ml-ui-accent-soft, rgba(64, 158, 255, 0.12));
}  `
  document.head.appendChild(style)
}

/**
 * Removes injected toolbar styles when no toolbar chrome remains in the DOM.
 */
export function acuiRemoveToolbarStylesIfUnused(): void {
  if (
    document.querySelector(
      '.ml-ex-ui-toolbar, .ml-ex-ui-subtoolbar, .ml-ex-ui-dropdown'
    )
  ) {
    return
  }
  document.getElementById(STYLE_ID)?.remove()
}

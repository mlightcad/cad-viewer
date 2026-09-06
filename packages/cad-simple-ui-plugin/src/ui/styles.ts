import { ML_UI_MOBILE_MAX_WIDTH } from '@mlightcad/cad-simple-viewer'

const STYLE_ID = 'ml-ex-ui-styles'

/**
 * Injects shared plugin UI styles into `document.head` once.
 *
 * Safe to call from multiple components; subsequent calls are no-ops.
 */
export function acuiEnsureUiStyles() {
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .ml-ex-ui-toolbar {
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

    .ml-ex-ui-toolbar-host {
      position: relative;
    }

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
    }

    .ml-ex-ui-layer-manager {
      position: absolute;
      z-index: 100;
      width: min(280px, calc(100% - 16px));
      max-width: calc(100% - 16px);
      min-height: 120px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      background: var(--ml-ui-bg, #ffffff);
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      box-shadow: var(--ml-ui-shadow, 0 6px 18px rgba(0, 0, 0, 0.35));
      border-radius: 8px;
      overflow: hidden;
      color: var(--ml-ui-text, #303133);
      font-size: 12px;
    }

    .ml-ex-ui-layer-manager.is-compact {
      width: calc(100% - 16px);
      max-width: none;
      border-radius: 12px 12px 8px 8px;
    }

    .ml-ex-ui-layer-manager.is-compact .ml-ex-ui-layer-table th:first-child,
    .ml-ex-ui-layer-manager.is-compact .ml-ex-ui-layer-table td:first-child {
      width: 100%;
      max-width: 0;
    }

    .ml-ex-ui-layer-manager.is-compact .ml-ex-ui-layer-name {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ml-ex-ui-layer-manager.is-hidden {
      display: none;
    }

    .ml-ex-ui-layer-manager .ml-ex-ui-layer-list {
      flex: 1;
      min-height: 0;
    }

    .ml-ex-ui-layer-manager-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-bottom: 1px solid var(--ml-ui-border, #dcdfe6);
      user-select: none;
      font-weight: 600;
      flex: 0 0 auto;
    }

    .ml-ex-ui-layer-table-wrap {
      overflow: auto;
      flex: 1;
    }

    .ml-ex-ui-layer-table {
      width: 100%;
      border-collapse: collapse;
    }

    .ml-ex-ui-layer-table th,
    .ml-ex-ui-layer-table td {
      padding: 4px 8px;
      border-bottom: 1px solid var(--ml-ui-border, #dcdfe6);
      text-align: left;
    }

    .ml-ex-ui-layer-table th {
      position: sticky;
      top: 0;
      background: var(--ml-ui-bg, #ffffff);
      z-index: 1;
    }

    .ml-ex-ui-layer-table td.center,
    .ml-ex-ui-layer-table th.center {
      text-align: center;
      vertical-align: middle;
    }

    .ml-ex-ui-layer-name-header.is-sortable {
      padding: 0;
    }

    .ml-ex-ui-layer-name-sort {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      width: 100%;
      margin: 0;
      padding: 4px 8px;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    .ml-ex-ui-layer-name-sort:hover {
      color: var(--ml-ui-accent, #409eff);
    }

    .ml-ex-ui-layer-name-header.is-sorted-asc .ml-ex-ui-layer-name-sort,
    .ml-ex-ui-layer-name-header.is-sorted-desc .ml-ex-ui-layer-name-sort {
      color: var(--ml-ui-accent, #409eff);
    }

    .ml-ex-ui-layer-sort-indicator {
      display: inline-block;
      min-width: 0.75em;
      font-size: 10px;
      line-height: 1;
      opacity: 0.85;
    }

    .ml-ex-ui-layer-header-on {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .ml-ex-ui-layer-header-on span {
      line-height: 1;
    }

    .ml-ex-ui-layer-header-on input[type='checkbox'] {
      margin: 0;
    }

    .ml-ex-ui-layer-name {
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }

    .ml-ex-ui-layer-current-marker {
      color: var(--ml-ui-accent, #409eff);
      font-weight: 600;
    }

    .ml-ex-ui-layer-color {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 3px;
      cursor: pointer;
    }

    .ml-ex-ui-color-dialog-backdrop {
      position: fixed;
      inset: 0;
      z-index: 120;
      background: var(--ml-ui-overlay, rgba(0, 0, 0, 0.18));
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ml-ex-ui-color-dialog {
      width: fit-content;
      max-width: calc(100vw - 24px);
      background: var(--ml-ui-bg, #ffffff);
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 8px;
      box-shadow: var(--ml-ui-shadow, 0 6px 18px rgba(0, 0, 0, 0.35));
      padding: 12px;
      color: var(--ml-ui-text, #303133);
      font-family: Arial, sans-serif;
      font-size: 12px;
    }

    .ml-ex-ui-color-dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .ml-ex-ui-color-dialog-title {
      font-weight: 600;
    }

    .ml-ex-ui-color-dialog-close {
      border: none;
      background: transparent;
      color: var(--ml-ui-text-muted, #606266);
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 2px 6px;
    }

    .ml-ex-ui-dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
    }

    .ml-ex-ui-btn {
      padding: 4px 12px;
      border-radius: 4px;
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      background: var(--ml-ui-bg, #ffffff);
      color: var(--ml-ui-text, #303133);
      cursor: pointer;
      font-size: 12px;
    }

    .ml-ex-ui-btn-primary {
      border-color: var(--ml-ui-accent, #409eff);
      background: var(--ml-ui-accent, #409eff);
      color: #fff;
    }

    .ml-ex-ui-toast {
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 200;
      padding: 8px 14px;
      border-radius: 6px;
      background: var(--ml-ui-bg, #ffffff);
      color: var(--ml-ui-text, #303133);
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      box-shadow: var(--ml-ui-shadow, 0 2px 6px rgba(0, 0, 0, 0.12));
    }

    .ml-ex-ui-layer-list {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }

    .ml-ex-ui-review-palette {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      gap: 8px;
      padding: 8px;
      box-sizing: border-box;
      color: var(--ml-ui-text, #303133);
      font-size: 12px;
    }

    .ml-ex-ui-review-toolbar {
      display: flex;
      gap: 8px;
      align-items: center;
      flex: 0 0 auto;
    }

    .ml-ex-ui-review-search,
    .ml-ex-ui-review-input,
    .ml-ex-ui-review-select,
    .ml-ex-ui-review-textarea {
      box-sizing: border-box;
      width: 100%;
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 4px;
      background: var(--ml-ui-bg, #ffffff);
      color: var(--ml-ui-text, #303133);
      font: inherit;
      padding: 4px 8px;
    }

    .ml-ex-ui-review-search {
      flex: 1;
      min-width: 0;
    }

    .ml-ex-ui-review-textarea {
      resize: vertical;
      min-height: 44px;
    }

    .ml-ex-ui-review-btn {
      flex: 0 0 auto;
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 4px;
      background: var(--ml-ui-bg, #ffffff);
      color: var(--ml-ui-text, #303133);
      font: inherit;
      padding: 4px 8px;
      cursor: pointer;
    }

    .ml-ex-ui-review-btn:hover:not(:disabled) {
      background: var(--ml-ui-border, rgba(0, 0, 0, 0.06));
    }

    .ml-ex-ui-review-btn:disabled {
      opacity: 0.5;
      cursor: default;
    }

    .ml-ex-ui-review-btn-danger {
      color: var(--ml-ui-danger, #f56c6c);
      border-color: var(--ml-ui-danger, #f56c6c);
    }

    .ml-ex-ui-review-table-wrap {
      flex: 1;
      min-height: 120px;
      overflow: auto;
    }

    .ml-ex-ui-review-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .ml-ex-ui-review-table th,
    .ml-ex-ui-review-table td {
      padding: 4px 6px;
      text-align: left;
      border-bottom: 1px solid var(--ml-ui-border, #dcdfe6);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ml-ex-ui-review-table th {
      font-weight: 600;
      position: sticky;
      top: 0;
      background: var(--ml-ui-bg, #ffffff);
    }

    .ml-ex-ui-review-table th:nth-child(1),
    .ml-ex-ui-review-table td:nth-child(1) {
      width: 88px;
    }

    .ml-ex-ui-review-table th:nth-child(2),
    .ml-ex-ui-review-table td:nth-child(2) {
      width: 96px;
    }

    .ml-ex-ui-review-row {
      cursor: pointer;
    }

    .ml-ex-ui-review-row:hover {
      background: var(--ml-ui-border, rgba(0, 0, 0, 0.06));
    }

    .ml-ex-ui-review-row.is-selected {
      background: var(--ml-ui-accent-soft, rgba(64, 158, 255, 0.12));
    }

    .ml-ex-ui-review-empty-row td {
      text-align: center;
      color: var(--ml-ui-muted, #909399);
      white-space: normal;
      padding: 16px 8px;
    }

    .ml-ex-ui-review-detail {
      border-top: 1px solid var(--ml-ui-border, #dcdfe6);
      padding-top: 6px;
      max-height: 46%;
      overflow: auto;
      flex: 0 0 auto;
    }

    .ml-ex-ui-review-detail-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      margin-bottom: 4px;
    }

    .ml-ex-ui-review-detail-title {
      font-weight: 600;
    }

    .ml-ex-ui-review-detail-close {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      margin-left: auto;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: var(--ml-ui-text, #303133);
      cursor: pointer;
      padding: 0;
    }

    .ml-ex-ui-review-detail-close:hover {
      background: var(--ml-ui-border, rgba(0, 0, 0, 0.06));
    }

    .ml-ex-ui-review-field {
      margin-bottom: 4px;
    }

    .ml-ex-ui-review-field-label {
      display: block;
      margin-bottom: 2px;
      line-height: 1.2;
    }

    .ml-ex-ui-review-detail-actions {
      display: flex;
      flex-direction: row;
      justify-content: flex-start;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
    }

    .ml-ex-ui-review-detail-actions .ml-ex-ui-review-btn {
      flex: 0 0 auto;
      width: auto;
    }

    .ml-ex-ui-measure-palette {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      gap: 8px;
      padding: 8px;
      box-sizing: border-box;
      color: var(--ml-ui-text, #303133);
      font-size: 12px;
    }

    .ml-ex-ui-measure-toolbar {
      display: flex;
      gap: 8px;
      align-items: center;
      flex: 0 0 auto;
    }

    .ml-ex-ui-measure-filter {
      display: flex;
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 4px;
    }

    .ml-ex-ui-measure-filter-btn {
      flex: 1 1 0;
      min-width: 0;
      border: none;
      border-right: 1px solid var(--ml-ui-border, #dcdfe6);
      background: var(--ml-ui-bg, #ffffff);
      color: var(--ml-ui-text, #303133);
      font: inherit;
      font-size: 11px;
      padding: 4px 2px;
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ml-ex-ui-measure-filter-btn:last-child {
      border-right: none;
    }

    .ml-ex-ui-measure-filter-btn:hover:not(.is-active) {
      background: var(--ml-ui-border, rgba(0, 0, 0, 0.06));
    }

    .ml-ex-ui-measure-filter-btn.is-active {
      background: var(--ml-ui-accent-soft, rgba(64, 158, 255, 0.16));
      color: var(--ml-ui-accent, #409eff);
    }

    .ml-ex-ui-measure-btn {
      flex: 0 0 auto;
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 4px;
      background: var(--ml-ui-bg, #ffffff);
      color: var(--ml-ui-text, #303133);
      font: inherit;
      padding: 4px 8px;
      cursor: pointer;
    }

    .ml-ex-ui-measure-btn:hover:not(:disabled) {
      background: var(--ml-ui-border, rgba(0, 0, 0, 0.06));
    }

    .ml-ex-ui-measure-btn:disabled {
      opacity: 0.5;
      cursor: default;
    }

    .ml-ex-ui-measure-btn-danger {
      color: #f56c6c;
      border-color: rgba(245, 108, 108, 0.55);
    }

    .ml-ex-ui-measure-table-wrap {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
    }

    .ml-ex-ui-measure-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .ml-ex-ui-measure-table th,
    .ml-ex-ui-measure-table td {
      padding: 6px 8px;
      text-align: left;
      border-bottom: 1px solid var(--ml-ui-border, #dcdfe6);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ml-ex-ui-measure-table th {
      font-weight: 600;
      color: var(--ml-ui-text-muted, #606266);
    }

    .ml-ex-ui-measure-table th:nth-child(1),
    .ml-ex-ui-measure-table td:nth-child(1) {
      width: 28%;
    }

    .ml-ex-ui-measure-actions-col {
      width: 72px;
      text-align: right;
    }

    .ml-ex-ui-measure-row {
      cursor: pointer;
    }

    .ml-ex-ui-measure-row:hover {
      background: var(--ml-ui-border, rgba(0, 0, 0, 0.04));
    }

    .ml-ex-ui-measure-row.is-selected {
      background: var(--ml-ui-accent-soft, rgba(64, 158, 255, 0.12));
    }

    .ml-ex-ui-measure-empty-row td {
      text-align: center;
      color: var(--ml-ui-text-muted, #606266);
      cursor: default;
    }

    .ml-ex-ui-measure-row-delete {
      padding: 2px 6px;
      font-size: 11px;
    }

    .ml-ex-ui-layer-list .ml-ex-ui-layer-table-wrap {
      flex: 1;
      min-height: 0;
    }

    .ml-ex-ui-host-dock {
      min-height: 0;
      min-width: 0;
    }

    .ml-ex-ui-host-dock:not([class*='ml-ex-ui-host-dock-']) {
      display: flex;
      flex-direction: column;
    }

    .ml-ex-ui-host-dock-top,
    .ml-ex-ui-host-dock-bottom,
    .ml-ex-ui-host-dock-sheet {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .ml-ex-ui-host-dock-left,
    .ml-ex-ui-host-dock-right {
      display: flex;
      flex-direction: row;
      min-width: 0;
      min-height: 0;
    }

    .ml-ex-ui-dock-main {
      flex: 1 1 auto;
      min-height: 0;
      min-width: 0;
      position: relative;
      overflow: hidden;
    }

    .ml-ex-ui-dock-panel {
      --ml-ex-ui-dock-size: 240px;
      display: flex;
      flex-direction: column;
      flex: 0 0 auto;
      background: var(--ml-ui-bg, #ffffff);
      color: var(--ml-ui-text, #303133);
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      font-size: 12px;
      z-index: 25;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
    }

    .ml-ex-ui-dock-panel[data-open='false'] {
      display: none;
    }

    .ml-ex-ui-dock-panel[data-side='bottom'],
    .ml-ex-ui-dock-panel[data-side='top'] {
      width: 100%;
      height: var(--ml-ex-ui-dock-size);
      border-left: none;
      border-right: none;
    }

    .ml-ex-ui-dock-panel[data-side='bottom'] {
      border-bottom: none;
      border-top: none;
    }

    .ml-ex-ui-dock-panel[data-side='top'] {
      border-top: none;
      border-bottom: none;
    }

    .ml-ex-ui-dock-panel[data-side='left'],
    .ml-ex-ui-dock-panel[data-side='right'] {
      flex-direction: row;
      height: 100%;
      width: var(--ml-ex-ui-dock-size);
      border-top: none;
      border-bottom: none;
    }

    .ml-ex-ui-dock-content {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
    }

    .ml-ex-ui-dock-panel[data-side='left'] {
      border-left: none;
      border-right: none;
    }

    .ml-ex-ui-dock-panel[data-side='right'] {
      border-right: none;
      border-left: none;
    }

    .ml-ex-ui-dock-resize-handle {
      flex: 0 0 auto;
      background: transparent;
      touch-action: none;
      z-index: 1;
    }

    .ml-ex-ui-dock-resize-handle:hover,
    .ml-ex-ui-dock-resize-handle:active {
      background: var(--ml-ui-border, rgba(0, 0, 0, 0.08));
    }

    .ml-ex-ui-dock-panel[data-side='bottom'] .ml-ex-ui-dock-resize-handle {
      order: -1;
      width: 100%;
      height: 6px;
      cursor: ns-resize;
      border-top: 1px solid var(--ml-ui-border, #dcdfe6);
    }

    .ml-ex-ui-dock-panel[data-side='top'] .ml-ex-ui-dock-resize-handle {
      order: 2;
      width: 100%;
      height: 6px;
      cursor: ns-resize;
      border-bottom: 1px solid var(--ml-ui-border, #dcdfe6);
    }

    .ml-ex-ui-dock-panel[data-side='left'] .ml-ex-ui-dock-resize-handle {
      order: 2;
      align-self: stretch;
      width: 6px;
      cursor: ew-resize;
      border-right: 1px solid var(--ml-ui-border, #dcdfe6);
    }

    .ml-ex-ui-dock-panel[data-side='right'] .ml-ex-ui-dock-resize-handle {
      order: -1;
      align-self: stretch;
      width: 6px;
      cursor: ew-resize;
      border-left: 1px solid var(--ml-ui-border, #dcdfe6);
    }

    .ml-ex-ui-dock-sheet-chrome {
      display: none;
      position: relative;
    }

    .ml-ex-ui-dock-sheet-grabber {
      flex: 1 1 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 20px;
      cursor: ns-resize;
      touch-action: none;
    }

    .ml-ex-ui-dock-sheet-grabber::before {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 36px;
      height: 4px;
      border-radius: 2px;
      background: var(--ml-ui-text-muted, #909399);
      opacity: 0.7;
    }

    .ml-ex-ui-dock-sheet-close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 28px;
      border: none;
      background: transparent;
      color: var(--ml-ui-text-muted, #606266);
      cursor: pointer;
      flex: 0 0 auto;
      position: relative;
      z-index: 1;
    }

    .ml-ex-ui-dock-sheet-close:hover {
      color: var(--ml-ui-text, #303133);
    }

    .ml-ex-ui-dock-header {
      display: flex;
      align-items: stretch;
      flex: 0 0 auto;
      border-bottom: 1px solid var(--ml-ui-border, #dcdfe6);
      background: var(--ml-ui-bg, #ffffff);
      min-height: 28px;
    }

    .ml-ex-ui-dock-tabs-wrap {
      display: flex;
      align-items: stretch;
      flex: 1 1 auto;
      min-width: 0;
    }

    .ml-ex-ui-dock-tabs {
      display: flex;
      align-items: stretch;
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
    }

    .ml-ex-ui-dock-tab-overflow-btn {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      border: none;
      border-bottom: 2px solid transparent;
      background: transparent;
      color: var(--ml-ui-text-muted, #606266);
      font-size: 14px;
      line-height: 1;
      cursor: pointer;
    }

    .ml-ex-ui-dock-tab-overflow-btn[hidden] {
      display: none !important;
    }

    .ml-ex-ui-dock-tab-overflow-btn:hover,
    .ml-ex-ui-dock-tab-overflow-btn.is-active {
      color: var(--ml-ui-text, #303133);
      background: var(--ml-ui-border, rgba(0, 0, 0, 0.04));
    }

    .ml-ex-ui-dock-tab-overflow-btn.is-active {
      border-bottom-color: var(--ml-ui-accent, #409eff);
    }

    .ml-ex-ui-dock-tab[hidden] {
      display: none;
    }

    .ml-ex-ui-dock-tab {
      flex: 0 0 auto;
      border: none;
      border-bottom: 2px solid transparent;
      background: transparent;
      color: var(--ml-ui-text-muted, #606266);
      padding: 6px 12px;
      font-size: 12px;
      cursor: pointer;
      white-space: nowrap;
    }

    .ml-ex-ui-dock-tab:hover {
      color: var(--ml-ui-text, #303133);
      background: var(--ml-ui-border, rgba(0, 0, 0, 0.04));
    }

    .ml-ex-ui-dock-tab.is-active {
      color: var(--ml-ui-text, #303133);
      border-bottom-color: var(--ml-ui-accent, #409eff);
    }

    .ml-ex-ui-dock-actions {
      display: flex;
      align-items: center;
      flex: 0 0 auto;
      gap: 2px;
      padding: 0 4px;
    }

    .ml-ex-ui-dock-action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--ml-ui-text-muted, #606266);
      cursor: pointer;
    }

    .ml-ex-ui-dock-action-btn:hover {
      background: var(--ml-ui-border, rgba(0, 0, 0, 0.06));
      color: var(--ml-ui-text, #303133);
    }

    .ml-ex-ui-dock-body {
      flex: 1 1 auto;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
      position: relative;
    }

    .ml-ex-ui-dock-tab-panel {
      position: absolute;
      inset: 0;
      overflow: auto;
    }

    .ml-ex-ui-dock-tab-panel:has(> .ml-ex-ui-review-palette),
    .ml-ex-ui-dock-tab-panel:has(> .ml-ex-ui-measure-palette),
    .ml-ex-ui-dock-tab-panel:has(> .ml-ex-ui-layer-list) {
      overflow: hidden;
    }

    .ml-ex-ui-dock-tab-panel[hidden] {
      display: none;
    }

    .ml-ex-ui-dock-side-menu {
      position: fixed;
      z-index: 110;
      min-width: 160px;
      padding: 4px 0;
      background: var(--ml-ui-bg, #ffffff);
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 6px;
      box-shadow: var(--ml-ui-shadow, 0 6px 18px rgba(0, 0, 0, 0.35));
    }

    .ml-ex-ui-dock-side-menu-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      border: none;
      background: transparent;
      color: var(--ml-ui-text, #303133);
      padding: 6px 12px;
      font-size: 12px;
      cursor: pointer;
      text-align: left;
    }

    .ml-ex-ui-dock-side-menu-item:hover {
      background: var(--ml-ui-border, rgba(0, 0, 0, 0.06));
    }

    .ml-ex-ui-dock-side-menu-item.is-selected {
      color: var(--ml-ui-accent, #409eff);
    }

    .ml-ex-ui-dock-tab-overflow-menu {
      position: fixed;
      z-index: 110;
      min-width: 160px;
      padding: 4px 0;
      background: var(--ml-ui-bg, #ffffff);
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 6px;
      box-shadow: var(--ml-ui-shadow, 0 6px 18px rgba(0, 0, 0, 0.35));
    }

    .ml-ex-ui-dock-tab-overflow-menu-item {
      display: block;
      width: 100%;
      border: none;
      background: transparent;
      color: var(--ml-ui-text, #303133);
      padding: 6px 12px;
      font-size: 12px;
      cursor: pointer;
      text-align: left;
      white-space: nowrap;
    }

    .ml-ex-ui-dock-tab-overflow-menu-item:hover {
      background: var(--ml-ui-border, rgba(0, 0, 0, 0.06));
    }

    .ml-ex-ui-dock-tab-overflow-menu-item.is-selected {
      color: var(--ml-ui-accent, #409eff);
    }

    @media (max-width: ${ML_UI_MOBILE_MAX_WIDTH}px) {
      .ml-ex-ui-dock-panel[data-open='true'][data-phone-sheet='true'] {
        position: absolute;
        left: 0;
        right: 0;
        top: auto;
        bottom: var(--ml-ex-ui-phone-sheet-inset, 0px);
        width: 100%;
        height: var(--ml-ex-ui-dock-size);
        max-height: calc(100% - var(--ml-ex-ui-phone-sheet-inset, 0px));
        flex: none;
        flex-direction: column;
        z-index: 35;
        border: none;
        border-top: 1px solid var(--ml-ui-border, #dcdfe6);
        border-radius: 12px 12px 0 0;
        box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.18);
      }

      .ml-ex-ui-dock-panel[data-phone-sheet='true'] .ml-ex-ui-dock-resize-handle {
        display: none;
      }

      .ml-ex-ui-dock-panel[data-phone-sheet='true'] .ml-ex-ui-dock-sheet-chrome {
        display: flex;
        align-items: center;
        flex: 0 0 auto;
        min-height: 28px;
      }

      .ml-ex-ui-dock-panel[data-phone-sheet='true'] .ml-ex-ui-dock-header {
        display: none;
      }

      .ml-ex-ui-host-dock-sheet .ml-ex-ui-dock-main {
        flex: 1 1 auto;
      }
    }
  `
  document.head.appendChild(style)
}

/**
 * Removes injected UI styles when no toolbar or layer manager remains in the DOM.
 */
export function acuiRemoveUiStylesIfUnused() {
  if (
    document.querySelector(
      '.ml-ex-ui-toolbar, .ml-ex-ui-subtoolbar, .ml-ex-ui-layer-manager, .ml-ex-ui-dock-panel, .ml-ex-ui-review-palette, .ml-ex-ui-measure-palette'
    )
  )
    return
  document.getElementById(STYLE_ID)?.remove()
}

const STYLE_ID = 'ml-ex-ui-styles'

/**
 * Injects shared plugin UI styles into `document.head` once.
 *
 * Safe to call from multiple components; subsequent calls are no-ops.
 */
export function ensureUiStyles() {
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

    .ml-ex-ui-toolbar.is-horizontal {
      flex-direction: row;
      align-items: center;
    }

    .ml-ex-ui-toolbar.is-vertical {
      flex-direction: column;
      align-items: stretch;
    }

    .ml-ex-ui-toolbar.is-top { top: 8px; left: 50%; transform: translateX(-50%); }
    .ml-ex-ui-toolbar.is-bottom { bottom: 8px; left: 50%; transform: translateX(-50%); }
    .ml-ex-ui-toolbar.is-left { left: 8px; top: 50%; transform: translateY(-50%); }
    .ml-ex-ui-toolbar.is-right { right: 8px; top: 50%; transform: translateY(-50%); }

    .ml-ex-ui-toolbar.is-disabled {
      opacity: 0.55;
      pointer-events: none;
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
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 4px;
      background: var(--ml-ui-bg, #ffffff);
      color: var(--ml-ui-text, #303133);
      cursor: pointer;
      font-size: 12px;
    }

    .ml-ex-ui-toolbar-btn:hover:not(:disabled) {
      border-color: var(--ml-ui-accent, #409eff);
      color: var(--ml-ui-accent, #409eff);
    }

    .ml-ex-ui-toolbar-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .ml-ex-ui-toolbar-btn.has-children::after {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border-style: solid;
    }

    .ml-ex-ui-toolbar.is-right .ml-ex-ui-toolbar-btn.has-children::after {
      left: 2px;
      top: 50%;
      margin-top: -4px;
      border-width: 4px 5px 4px 0;
      border-color: transparent var(--ml-ui-text-muted, #606266) transparent transparent;
    }

    .ml-ex-ui-toolbar.is-left .ml-ex-ui-toolbar-btn.has-children::after {
      right: 2px;
      top: 50%;
      margin-top: -4px;
      border-width: 4px 0 4px 5px;
      border-color: transparent transparent transparent var(--ml-ui-text-muted, #606266);
    }

    .ml-ex-ui-toolbar.is-top .ml-ex-ui-toolbar-btn.has-children::after {
      bottom: 2px;
      left: 50%;
      margin-left: -4px;
      border-width: 5px 4px 0 4px;
      border-color: var(--ml-ui-text-muted, #606266) transparent transparent transparent;
    }

    .ml-ex-ui-toolbar.is-bottom .ml-ex-ui-toolbar-btn.has-children::after {
      top: 2px;
      left: 50%;
      margin-left: -4px;
      border-width: 0 4px 5px 4px;
      border-color: transparent transparent var(--ml-ui-text-muted, #606266) transparent;
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

    .ml-ex-ui-dropdown {
      position: fixed;
      z-index: 100;
      min-width: 160px;
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

    .ml-ex-ui-aci-picker {
      --ml-ex-ui-aci-cell-size: 12px;
      font-size: 12px;
      font-family: Arial, sans-serif;
    }

    .ml-ex-ui-aci-palette-large {
      display: grid;
      grid-template-columns: repeat(24, var(--ml-ex-ui-aci-cell-size));
      gap: 1px;
      margin-bottom: 6px;
    }

    .ml-ex-ui-aci-palette-small {
      display: grid;
      grid-template-columns: repeat(9, var(--ml-ex-ui-aci-cell-size));
      gap: 1px;
    }

    .ml-ex-ui-aci-palette-gray {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 4px;
      margin-bottom: 6px;
    }

    .ml-ex-ui-aci-small-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }

    .ml-ex-ui-aci-small-actions {
      display: flex;
      flex-direction: row;
      gap: 4px;
      margin-left: auto;
    }

    .ml-ex-ui-aci-small-actions button {
      font-size: 11px;
      padding: 2px 6px;
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 4px;
      background: var(--ml-ui-bg, #ffffff);
      color: var(--ml-ui-text, #303133);
      cursor: pointer;
    }

    .ml-ex-ui-aci-cell {
      width: var(--ml-ex-ui-aci-cell-size);
      height: var(--ml-ex-ui-aci-cell-size);
      padding: 0;
      border: 1px solid #999;
      cursor: pointer;
      box-sizing: border-box;
    }

    .ml-ex-ui-aci-cell:hover {
      outline: 1px solid #00a8ff;
    }

    .ml-ex-ui-aci-cell.selected {
      outline: 2px solid var(--ml-ui-accent, #409eff);
      outline-offset: -1px;
    }

    .ml-ex-ui-aci-info-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 4px 0;
      color: var(--ml-ui-text-muted, #606266);
    }

    .ml-ex-ui-aci-info-left {
      text-align: left;
    }

    .ml-ex-ui-aci-info-right {
      text-align: right;
    }

    .ml-ex-ui-aci-bottom-row {
      display: flex;
      align-items: stretch;
      justify-content: flex-start;
      gap: 8px;
      margin-top: 4px;
    }

    .ml-ex-ui-aci-bottom-left {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .ml-ex-ui-aci-input-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
    }

    .ml-ex-ui-aci-input-row input {
      flex: 1;
      padding: 2px 6px;
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 4px;
      background: var(--ml-ui-bg, #ffffff);
      color: var(--ml-ui-text, #303133);
      font-size: 12px;
      font-family: Arial, sans-serif;
    }

    .ml-ex-ui-aci-preview-box {
      width: 32px;
      min-width: 32px;
      margin-left: auto;
      align-self: stretch;
      border: 1px solid #666;
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
  `
  document.head.appendChild(style)
}

/**
 * Removes injected UI styles when no toolbar or layer manager remains in the DOM.
 */
export function removeUiStylesIfUnused() {
  if (document.querySelector('.ml-ex-ui-toolbar, .ml-ex-ui-layer-manager')) return
  document.getElementById(STYLE_ID)?.remove()
}

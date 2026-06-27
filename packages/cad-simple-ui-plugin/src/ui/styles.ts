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
      min-width: 32px;
      min-height: 32px;
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
      position: fixed;
      z-index: 90;
      width: min(280px, calc(100vw - 24px));
      min-height: 120px;
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

    .ml-ex-ui-layer-manager.is-contained {
      position: absolute;
      width: min(280px, calc(100% - 16px));
      max-height: 100%;
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
      cursor: move;
      user-select: none;
      font-weight: 600;
    }

    .ml-ex-ui-layer-manager-close {
      border: none;
      background: transparent;
      color: var(--ml-ui-text-muted, #606266);
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 2px 6px;
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

    .ml-ex-ui-layer-manager-resize {
      flex: 0 0 auto;
      height: 6px;
      cursor: ns-resize;
      background: transparent;
    }

    .ml-ex-ui-layer-manager-resize:hover {
      background: var(--ml-ui-border, rgba(0, 0, 0, 0.06));
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
      width: min(520px, calc(100vw - 24px));
      background: var(--ml-ui-bg, #ffffff);
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 8px;
      box-shadow: var(--ml-ui-shadow, 0 6px 18px rgba(0, 0, 0, 0.35));
      padding: 12px;
      color: var(--ml-ui-text, #303133);
    }

    .ml-ex-ui-color-dialog-title {
      font-weight: 600;
      margin-bottom: 8px;
    }

    .ml-ex-ui-aci-palette-large {
      display: grid;
      grid-template-columns: repeat(24, 1fr);
      gap: 1px;
      margin-bottom: 6px;
    }

    .ml-ex-ui-aci-palette-small,
    .ml-ex-ui-aci-palette-gray {
      display: grid;
      gap: 1px;
      margin-bottom: 6px;
    }

    .ml-ex-ui-aci-palette-small {
      grid-template-columns: repeat(9, 1fr);
    }

    .ml-ex-ui-aci-palette-gray {
      grid-template-columns: repeat(6, 1fr);
    }

    .ml-ex-ui-aci-cell {
      width: 100%;
      aspect-ratio: 1;
      border: 1px solid rgba(0, 0, 0, 0.15);
      cursor: pointer;
    }

    .ml-ex-ui-aci-cell.selected {
      outline: 2px solid var(--ml-ui-accent, #409eff);
      outline-offset: -1px;
    }

    .ml-ex-ui-aci-info {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
      color: var(--ml-ui-text-muted, #606266);
    }

    .ml-ex-ui-aci-input-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .ml-ex-ui-aci-input-row input {
      flex: 1;
      padding: 4px 6px;
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 4px;
      background: var(--ml-ui-bg, #ffffff);
      color: var(--ml-ui-text, #303133);
    }

    .ml-ex-ui-dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
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

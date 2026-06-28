const STYLE_ID = 'ml-ann-ui-styles'

export function ensureAnnotationStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .ml-ann-toolbar {
      position: absolute;
      left: 8px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 35;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 6px;
      background: var(--ml-ui-bg, #ffffff);
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      box-shadow: var(--ml-ui-shadow, 0 2px 6px rgba(0,0,0,0.12));
      border-radius: 6px;
    }
    .ml-ann-toolbar-btn {
      width: 32px;
      height: 32px;
      border: 1px solid transparent;
      border-radius: 4px;
      background: transparent;
      color: var(--ml-ui-text, #303133);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .ml-ann-toolbar-btn:hover { background: var(--ml-ui-overlay, rgba(0,0,0,0.06)); }
    .ml-ann-toolbar-btn.is-active {
      border-color: var(--ml-ui-accent, #409eff);
      color: var(--ml-ui-accent, #409eff);
    }
    .ml-ann-toolbar-sep {
      height: 1px;
      background: var(--ml-ui-border, #dcdfe6);
      margin: 2px 0;
    }
    .ml-ann-panel {
      position: absolute;
      right: 8px;
      top: 8px;
      bottom: 8px;
      width: 280px;
      z-index: 34;
      background: var(--ml-ui-bg, #ffffff);
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      box-shadow: var(--ml-ui-shadow, 0 2px 6px rgba(0,0,0,0.12));
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      color: var(--ml-ui-text, #303133);
      font-size: 12px;
    }
    .ml-ann-panel-header {
      padding: 8px 10px;
      border-bottom: 1px solid var(--ml-ui-border, #dcdfe6);
      font-weight: 600;
    }
    .ml-ann-panel-body {
      flex: 1;
      overflow: auto;
      padding: 8px;
    }
    .ml-ann-panel-tabs {
      display: flex;
      gap: 4px;
      padding: 6px 8px;
      border-bottom: 1px solid var(--ml-ui-border, #dcdfe6);
    }
    .ml-ann-panel-tab {
      flex: 1;
      padding: 4px 6px;
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 4px;
      background: transparent;
      cursor: pointer;
      color: var(--ml-ui-text, #303133);
    }
    .ml-ann-panel-tab.is-active {
      background: var(--ml-ui-accent, #409eff);
      color: #fff;
      border-color: var(--ml-ui-accent, #409eff);
    }
    .ml-ann-list-item {
      padding: 6px 8px;
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 4px;
      margin-bottom: 6px;
      cursor: pointer;
    }
    .ml-ann-list-item.is-selected {
      border-color: var(--ml-ui-accent, #409eff);
    }
    .ml-ann-list-actions {
      display: flex;
      gap: 4px;
      margin-top: 4px;
    }
    .ml-ann-list-actions button {
      font-size: 11px;
      padding: 2px 6px;
      cursor: pointer;
    }
    .ml-ann-filter-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 8px;
    }
    .ml-ann-filter-row input, .ml-ann-filter-row select {
      padding: 4px 6px;
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 4px;
      background: var(--ml-ui-bg, #fff);
      color: var(--ml-ui-text, #303133);
    }
    .ml-ann-property-bar {
      position: absolute;
      left: 52px;
      top: 8px;
      z-index: 33;
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 6px 10px;
      background: var(--ml-ui-bg, #ffffff);
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 6px;
      box-shadow: var(--ml-ui-shadow, 0 2px 6px rgba(0,0,0,0.12));
      color: var(--ml-ui-text, #303133);
      font-size: 12px;
    }
    .ml-ann-property-bar label { display: flex; align-items: center; gap: 4px; }
    .ml-ann-color-input {
      width: 28px;
      height: 22px;
      padding: 0;
      border: 1px solid var(--ml-ui-border, #dcdfe6);
    }
    .ml-ann-prompt-overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: var(--ml-ui-overlay, rgba(0,0,0,0.35));
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ml-ann-prompt-box {
      background: var(--ml-ui-bg, #fff);
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 6px;
      padding: 12px;
      min-width: 280px;
      color: var(--ml-ui-text, #303133);
    }
    .ml-ann-prompt-box textarea {
      width: 100%;
      margin: 8px 0;
      box-sizing: border-box;
    }
    .ml-ann-prompt-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .ml-ann-prompt-actions button {
      padding: 4px 12px;
      cursor: pointer;
    }
  `
  document.head.appendChild(style)
}

export function removeAnnotationStylesIfUnused() {
  const el = document.getElementById(STYLE_ID)
  if (el && !document.querySelector('.ml-ann-toolbar')) {
    el.remove()
  }
}
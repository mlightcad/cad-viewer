import { ML_UI_MOBILE_MAX_WIDTH } from '../../editor/global/AcEdUiLayout'

const STYLE_ID = 'ml-ui-dock-panel-styles'

/**
 * Injects dock-panel chrome styles once. Safe to call repeatedly.
 */
export function acuiEnsureDockPanelStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
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
.ml-ex-ui-dock-tab-panel:has(> .ml-ex-ui-find-palette),
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
 * Removes dock-panel styles when no dock panel remains in the DOM.
 */
export function acuiRemoveDockPanelStylesIfUnused() {
  if (typeof document === 'undefined') return
  if (document.querySelector('.ml-ex-ui-dock-panel')) return
  document.getElementById(STYLE_ID)?.remove()
}

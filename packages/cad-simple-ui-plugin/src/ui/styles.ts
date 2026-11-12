import {
  acuiEnsureToolbarStyles,
  acuiRemoveToolbarStylesIfUnused
} from '@mlightcad/cad-simple-viewer'

const STYLE_ID = 'ml-ex-ui-styles'

/**
 * Injects plugin chrome styles (layer / palettes) into `document.head`.
 * Also ensures toolbar styles from cad-simple-viewer.
 *
 * Safe to call from multiple components; subsequent calls are no-ops.
 */
export function acuiEnsureUiStyles() {
  acuiEnsureToolbarStyles()
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
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
      gap: 8px;
    }

    .ml-ex-ui-layer-toolbar {
      display: flex;
      gap: 8px;
      align-items: center;
      flex: 0 0 auto;
      padding: 0 8px;
      box-sizing: border-box;
    }

    .ml-ex-ui-layer-list > .ml-ex-ui-layer-toolbar:first-child {
      padding-top: 8px;
    }

    .ml-ex-ui-layer-search {
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      flex: 1;
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 4px;
      background: var(--ml-ui-bg, #ffffff);
      color: var(--ml-ui-text, #303133);
      font: inherit;
      font-size: 12px;
      padding: 4px 8px;
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

    .ml-ex-ui-find-palette {
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

    .ml-ex-ui-find-form {
      display: flex;
      gap: 8px;
      align-items: center;
      flex: 0 0 auto;
    }

    .ml-ex-ui-find-input {
      flex: 1 1 auto;
      min-width: 0;
      box-sizing: border-box;
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 4px;
      background: var(--ml-ui-bg, #ffffff);
      color: var(--ml-ui-text, #303133);
      font: inherit;
      /* 16px avoids iOS focus zoom on touch screens. */
      font-size: 16px;
      padding: 4px 8px;
    }

    .ml-ex-ui-find-option {
      display: flex;
      gap: 6px;
      align-items: center;
      flex: 0 0 auto;
      cursor: pointer;
    }

    .ml-ex-ui-find-status {
      flex: 0 0 auto;
      color: var(--ml-ui-text-muted, #606266);
    }

    .ml-ex-ui-find-list {
      flex: 1 1 auto;
      min-height: 0;
      margin: 0;
      padding: 0;
      list-style: none;
      overflow: auto;
      touch-action: pan-y;
    }

    .ml-ex-ui-find-row {
      padding: 6px 8px;
      border-bottom: 1px solid var(--ml-ui-border, #dcdfe6);
      cursor: pointer;
    }

    .ml-ex-ui-find-row:hover {
      background: var(--ml-ui-border, rgba(0, 0, 0, 0.04));
    }

    .ml-ex-ui-find-row.is-selected {
      background: var(--ml-ui-accent-soft, rgba(64, 158, 255, 0.12));
    }

    .ml-ex-ui-find-layout {
      color: var(--ml-ui-text-muted, #606266);
      font-size: 11px;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ml-ex-ui-find-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ml-ex-ui-find-meta {
      color: var(--ml-ui-text-muted, #606266);
      font-size: 11px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ml-ex-ui-layer-list .ml-ex-ui-layer-table-wrap {
      flex: 1;
      min-height: 0;
    }

  `
  document.head.appendChild(style)
}

/**
 * Removes injected UI styles when no toolbar or layer manager remains in the DOM.
 */
export function acuiRemoveUiStylesIfUnused() {
  acuiRemoveToolbarStylesIfUnused()
  if (
    document.querySelector(
      '.ml-ex-ui-layer-manager, .ml-ex-ui-review-palette, .ml-ex-ui-measure-palette, .ml-ex-ui-find-palette'
    )
  )
    return
  document.getElementById(STYLE_ID)?.remove()
}

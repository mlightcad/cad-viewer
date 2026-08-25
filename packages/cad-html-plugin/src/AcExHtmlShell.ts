import { ML_UI_MOBILE_MAX_WIDTH } from '@mlightcad/cad-simple-viewer'

import { acExHtmlIcons, acExToolbarButton } from './AcExHtmlIcons'
import {
  buildAcExHtmlLocaleStrip,
  buildAcExHtmlSnapStrip,
  buildAcExLanguageToolbarButton
} from './AcExHtmlMeasureSettings'
import type { AcExViewerMode } from './AcExSnapshotTypes'

/**
 * Shared CSS for the offline HTML viewer chrome (toolbar, layer drawer, status bar).
 * Injected into the `<style>` block by {@link packHtml}.
 */
export const ACEX_HTML_SHELL_CSS = `
  :root {
    --mlcad-ui-bg: rgba(24, 26, 30, 0.94);
    --mlcad-ui-bg-elevated: rgba(32, 35, 40, 0.98);
    --mlcad-ui-border: rgba(255, 255, 255, 0.1);
    --mlcad-ui-text: #e8eaed;
    --mlcad-ui-muted: #9aa0a6;
    --mlcad-accent: #08e8de;
    --mlcad-accent-active: #1a8cff;
    --mlcad-measure-accent: #08e8de;
    --mlcad-measure-accent-border: rgba(8, 232, 222, 0.45);
    --mlcad-measure-accent-fill: rgba(8, 232, 222, 0.2);
    --mlcad-markup-accent: #e53935;
    --mlcad-markup-accent-border: rgba(229, 57, 53, 0.45);
    --mlcad-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
    --mlcad-toolbar-width: 44px;
    --mlcad-drawer-width: 220px;
    --mlcad-drawer-gap: 8px;
    --mlcad-ui-inset: 12px;
    --mlcad-review-max-height: calc(100vh - 2 * var(--mlcad-ui-inset) - 48px);
    --mlcad-z-chrome: 7;
    --mlcad-z-measure: 5;
    --mlcad-z-markup: 6;
  }
  html, body {
    margin: 0; height: 100%; overflow: hidden;
    background: #121418;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    color: var(--mlcad-ui-text);
  }
  #mlcad-root { position: relative; width: 100%; height: 100%; }
  #mlcad-root canvas {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
  }

  #mlcad-sidebar {
    position: absolute;
    left: var(--mlcad-ui-inset);
    top: 50%;
    z-index: var(--mlcad-z-chrome);
    transform: translateY(-50%);
    display: flex;
    align-items: flex-start;
    gap: var(--mlcad-drawer-gap);
    max-width: calc(100% - 2 * var(--mlcad-ui-inset));
    box-sizing: border-box;
    pointer-events: none;
  }
  #mlcad-sidebar > * { pointer-events: auto; }

  #mlcad-toolbar {
    flex-shrink: 0;
    display: flex; flex-direction: column; gap: 4px;
    padding: 6px;
    background: var(--mlcad-ui-bg);
    border: 1px solid var(--mlcad-ui-border);
    border-radius: 8px;
    box-shadow: var(--mlcad-shadow);
    backdrop-filter: blur(12px);
  }
  .mlcad-tool-btn {
    position: relative;
    display: flex; align-items: center; justify-content: center;
    width: var(--mlcad-toolbar-width); height: var(--mlcad-toolbar-width);
    margin: 0; padding: 0;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: var(--mlcad-ui-text);
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  .mlcad-tool-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: var(--mlcad-ui-border);
  }
  .mlcad-tool-btn.active,
  .mlcad-tool-btn.is-menu-open {
    background: rgba(26, 140, 255, 0.22);
    border-color: rgba(26, 140, 255, 0.55);
    color: #fff;
  }
  .mlcad-tool-btn svg {
    width: 20px; height: 20px; display: block; flex-shrink: 0;
  }
  /* Flyout mark: opaque corner triangle (cad-simple-ui-plugin is-left style). */
  .mlcad-tool-btn.has-children::after {
    content: '';
    position: absolute;
    right: 1px;
    bottom: 1px;
    width: 6px;
    height: 6px;
    background: currentColor;
    clip-path: polygon(100% 100%, 0 100%, 100% 0);
    pointer-events: none;
  }
  .mlcad-dropdown {
    position: fixed;
    z-index: 40;
    min-width: 180px;
    max-width: min(280px, calc(100vw - 24px));
    max-height: min(360px, calc(100vh - 24px));
    overflow-y: auto;
    padding: 4px;
    background: var(--mlcad-ui-bg-elevated);
    border: 1px solid var(--mlcad-ui-border);
    border-radius: 8px;
    box-shadow: var(--mlcad-shadow);
    backdrop-filter: blur(12px);
  }
  .mlcad-dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    box-sizing: border-box;
    margin: 0;
    padding: 6px 8px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: var(--mlcad-ui-text);
    font-size: 12px;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
  }
  .mlcad-dropdown-item:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  .mlcad-dropdown-item.active,
  .mlcad-dropdown-item.is-toggled {
    background: rgba(26, 140, 255, 0.22);
    color: #fff;
  }
  .mlcad-dropdown-icon {
    display: inline-flex;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
  }
  .mlcad-dropdown-icon svg {
    width: 18px;
    height: 18px;
    display: block;
  }
  .mlcad-dropdown-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mlcad-dropdown-separator {
    height: 1px;
    margin: 4px 6px;
    background: var(--mlcad-ui-border);
  }
  #mlcad-toolbar-toggle {
    height: calc(var(--mlcad-toolbar-width) / 2);
    margin-top: -4px;
    margin-bottom: -4px;
    border-radius: 4px;
  }
  #mlcad-toolbar-toggle svg {
    width: calc(var(--mlcad-toolbar-width) / 2);
    height: calc(var(--mlcad-toolbar-width) / 2);
  }
  .mlcad-tool-separator {
    height: 1px;
    margin: 4px 8px;
    background: var(--mlcad-ui-border);
  }
  .mlcad-locale-option-badge {
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
  }
  #mlcad-lang-btn .mlcad-locale-option-badge {
    font-size: 12px;
  }
  #mlcad-zoom-window-rect {
    position: fixed;
    z-index: 25;
    box-sizing: border-box;
    pointer-events: none;
    border: 1px dashed var(--mlcad-accent, #08e8de);
    background: rgba(8, 232, 222, 0.12);
  }
  #mlcad-zoom-window-rect[hidden] { display: none; }

  #mlcad-layer-drawer,
  #mlcad-review-drawer {
    flex-shrink: 1;
    min-width: 0;
    width: var(--mlcad-drawer-width);
    max-height: min(420px, var(--mlcad-review-max-height));
    display: flex; flex-direction: column;
    background: var(--mlcad-ui-bg-elevated);
    border: 1px solid var(--mlcad-ui-border);
    border-radius: 8px;
    box-shadow: var(--mlcad-shadow);
    backdrop-filter: blur(12px);
    overflow: hidden;
    box-sizing: border-box;
  }
  #mlcad-markup-strip-wrap {
    position: relative;
  }
  #mlcad-review-drawer {
    position: absolute;
    left: 100%;
    top: 0;
    margin-left: var(--mlcad-drawer-gap);
    width: min(320px, calc(100vw - 2 * var(--mlcad-ui-inset) - var(--mlcad-toolbar-width) - var(--mlcad-drawer-gap)));
    height: 100%;
    max-height: var(--mlcad-review-max-height);
  }
  #mlcad-layer-drawer[hidden],
  #mlcad-review-drawer[hidden] { display: none; }

  .mlcad-drawer-header {
    display: flex; align-items: center; justify-content: space-between;
    gap: 6px; padding: 8px 10px;
    border-bottom: 1px solid var(--mlcad-ui-border);
    font-size: 13px; font-weight: 600;
  }
  .mlcad-drawer-close {
    width: 28px; height: 28px; padding: 0;
    border: none; border-radius: 4px;
    background: transparent; color: var(--mlcad-ui-muted);
    cursor: pointer; font-size: 18px; line-height: 1;
  }
  .mlcad-drawer-close:hover {
    background: rgba(255, 255, 255, 0.08); color: var(--mlcad-ui-text);
  }

  .mlcad-layer-actions {
    display: flex; gap: 4px; padding: 6px 8px;
    border-bottom: 1px solid var(--mlcad-ui-border);
  }
  .mlcad-layer-action-btn {
    flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    min-height: 30px; padding: 4px 8px;
    border: 1px solid var(--mlcad-ui-border);
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.04);
    color: var(--mlcad-ui-text);
    font-size: 12px; cursor: pointer;
  }
  .mlcad-layer-action-btn:hover { background: rgba(255, 255, 255, 0.1); }
  .mlcad-layer-action-btn svg { width: 14px; height: 14px; flex-shrink: 0; }

  #mlcad-layer-list {
    flex: 1; overflow: auto; padding: 4px 0;
  }
  .mlcad-layer-item {
    display: grid;
    grid-template-columns: auto auto 1fr auto;
    align-items: center; gap: 6px;
    padding: 5px 8px;
    font-size: 12px; cursor: pointer;
  }
  .mlcad-layer-item:hover { background: rgba(255, 255, 255, 0.05); }
  .mlcad-layer-item input { margin: 0; cursor: pointer; }
  .mlcad-layer-swatch {
    width: 12px; height: 12px; border-radius: 2px;
    border: 1px solid rgba(255, 255, 255, 0.28);
  }
  .mlcad-layer-name {
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .mlcad-layer-zoom {
    display: flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; padding: 0;
    border: 1px solid transparent; border-radius: 4px;
    background: transparent; color: var(--mlcad-ui-muted);
    cursor: pointer;
  }
  .mlcad-layer-zoom svg {
    width: 14px; height: 14px; display: block;
  }
  .mlcad-layer-zoom:hover:not(:disabled) {
    color: var(--mlcad-accent);
    border-color: var(--mlcad-ui-border);
    background: rgba(255, 255, 255, 0.06);
  }
  .mlcad-layer-zoom:disabled { opacity: 0.35; cursor: not-allowed; }

  .mlcad-review-toolbar {
    display: flex; gap: 6px; align-items: center;
    padding: 6px 8px;
    border-bottom: 1px solid var(--mlcad-ui-border);
  }
  .mlcad-review-search {
    flex: 1; min-width: 0;
    box-sizing: border-box;
    padding: 4px 8px;
    border: 1px solid var(--mlcad-ui-border);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.04);
    color: var(--mlcad-ui-text);
    font-size: 12px;
  }
  .mlcad-review-clear,
  .mlcad-review-zoom,
  .mlcad-review-delete {
    flex: 0 0 auto;
    padding: 4px 8px;
    border: 1px solid var(--mlcad-ui-border);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.04);
    color: var(--mlcad-ui-text);
    font-size: 12px; cursor: pointer;
  }
  .mlcad-review-clear:disabled { opacity: 0.5; cursor: default; }
  .mlcad-review-delete { color: #f56c6c; border-color: rgba(245, 108, 108, 0.55); }
  .mlcad-review-table-wrap { flex: 1 1 auto; min-height: 0; overflow: auto; }
  .mlcad-review-table {
    width: 100%; border-collapse: collapse; font-size: 12px;
  }
  .mlcad-review-table th,
  .mlcad-review-table td {
    padding: 4px 8px; text-align: left;
    border-bottom: 1px solid var(--mlcad-ui-border);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    max-width: 90px;
  }
  .mlcad-review-table tr.is-selected td {
    background: rgba(26, 140, 255, 0.22);
  }
  .mlcad-review-table tr { cursor: pointer; }
  .mlcad-review-empty td { text-align: center; color: var(--mlcad-ui-muted); cursor: default; }
  .mlcad-review-detail {
    flex: 0 1 auto;
    max-height: 52%;
    overflow: auto;
    border-top: 1px solid var(--mlcad-ui-border);
    padding: 8px 10px 14px;
    display: flex; flex-direction: column; gap: 6px;
    box-sizing: border-box;
  }
  .mlcad-review-detail[hidden] { display: none; }
  .mlcad-review-detail-header {
    display: flex; align-items: center; justify-content: space-between; gap: 4px;
  }
  .mlcad-review-detail-title { font-weight: 600; font-size: 12px; }
  .mlcad-review-detail-close {
    flex-shrink: 0;
    width: 24px; height: 24px; padding: 0;
    border: none; border-radius: 4px;
    background: transparent; color: var(--mlcad-ui-muted);
    cursor: pointer; font-size: 16px; line-height: 1;
  }
  .mlcad-review-detail-close:hover {
    background: rgba(255, 255, 255, 0.08); color: var(--mlcad-ui-text);
  }
  .mlcad-review-field { display: flex; flex-direction: column; gap: 2px; }
  .mlcad-review-field-label { font-size: 11px; color: var(--mlcad-ui-muted); }
  .mlcad-review-status,
  .mlcad-review-author,
  .mlcad-review-text,
  .mlcad-review-comment {
    box-sizing: border-box; width: 100%;
    padding: 4px 6px;
    border: 1px solid var(--mlcad-ui-border);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.04);
    color: var(--mlcad-ui-text);
    font-size: 12px;
  }
  .mlcad-review-author:disabled { opacity: 0.7; }
  .mlcad-review-comment { min-height: 44px; resize: vertical; }
  .mlcad-review-detail-actions { display: flex; gap: 6px; margin-top: 2px; }

  #mlcad-status-bar {
    position: absolute; left: 12px; right: 12px; bottom: 10px; z-index: var(--mlcad-z-chrome);
    display: flex; align-items: center; min-height: 28px; padding: 0 12px;
    border: 1px solid var(--mlcad-ui-border);
    border-radius: 6px;
    background: var(--mlcad-ui-bg);
    color: var(--mlcad-ui-muted);
    font-size: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(10px);
    pointer-events: none;
  }

  #mlcad-sidebar.mlcad-sidebar--collapsed #mlcad-snap-strip-wrap,
  #mlcad-sidebar.mlcad-sidebar--collapsed #mlcad-measure-strip-wrap,
  #mlcad-sidebar.mlcad-sidebar--collapsed #mlcad-markup-strip-wrap,
  #mlcad-sidebar.mlcad-sidebar--collapsed #mlcad-zoom-strip-wrap,
  #mlcad-sidebar.mlcad-sidebar--collapsed #mlcad-locale-strip-wrap,
  #mlcad-sidebar.mlcad-sidebar--collapsed #mlcad-layer-drawer,
  #mlcad-sidebar.mlcad-sidebar--collapsed #mlcad-review-drawer {
    display: none !important;
  }
  #mlcad-sidebar.mlcad-sidebar--collapsed #mlcad-toolbar .mlcad-tool-btn:not(#mlcad-toolbar-toggle) {
    display: none;
  }
  #mlcad-sidebar.mlcad-sidebar--collapsed #mlcad-toolbar .mlcad-tool-separator {
    display: none;
  }

  #mlcad-snap-strip-wrap,
  #mlcad-measure-strip-wrap,
  #mlcad-markup-strip-wrap,
  #mlcad-zoom-strip-wrap,
  #mlcad-locale-strip-wrap {
    flex-shrink: 0;
    min-width: 0;
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: var(--mlcad-drawer-gap);
  }
  #mlcad-snap-strip-wrap[hidden],
  #mlcad-measure-strip-wrap[hidden],
  #mlcad-markup-strip-wrap[hidden],
  #mlcad-zoom-strip-wrap[hidden],
  #mlcad-locale-strip-wrap[hidden] { display: none; }

  #mlcad-snap-strip,
  #mlcad-measure-strip,
  #mlcad-markup-strip,
  #mlcad-zoom-strip,
  #mlcad-locale-strip {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    padding: 6px;
    background: var(--mlcad-ui-bg);
    border: 1px solid var(--mlcad-ui-border);
    border-radius: 8px;
    box-shadow: var(--mlcad-shadow);
    backdrop-filter: blur(12px);
  }
  #mlcad-measure-strip .mlcad-tool-separator,
  #mlcad-markup-strip .mlcad-tool-separator {
    margin: 2px 4px;
  }

  #mlcad-polar-angles {
    flex-shrink: 0;
    display: inline-flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    padding: 6px;
    max-width: min(280px, calc(100vw - 2 * var(--mlcad-ui-inset) - 3 * var(--mlcad-toolbar-width) - 3 * var(--mlcad-drawer-gap)));
    background: var(--mlcad-ui-bg);
    border: 1px solid var(--mlcad-ui-border);
    border-radius: 8px;
    box-shadow: var(--mlcad-shadow);
    backdrop-filter: blur(12px);
  }
  #mlcad-polar-angles[hidden] { display: none; }

  .mlcad-color-input {
    position: absolute;
    width: 0;
    height: 0;
    opacity: 0;
    pointer-events: none;
  }
  .mlcad-settings-option-btn {
    width: 100%;
    box-sizing: border-box;
    height: var(--mlcad-toolbar-width);
    justify-content: flex-start;
    gap: 8px;
    padding: 0 10px;
    font-size: 11px;
    font-weight: 500;
  }
  .mlcad-settings-option-indicator {
    flex-shrink: 0;
    width: 10px;
    height: 10px;
    border: 1px solid var(--mlcad-ui-muted);
    border-radius: 2px;
    box-sizing: border-box;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .mlcad-settings-option-btn.active .mlcad-settings-option-indicator {
    background: var(--mlcad-accent);
    border-color: var(--mlcad-accent);
  }
  .mlcad-settings-option-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    pointer-events: none;
    line-height: 1.2;
  }

  #mlcad-measure-overlays {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: var(--mlcad-z-measure);
    overflow: hidden;
  }
  .mlcad-measure-canvas {
    position: absolute;
    left: 0;
    top: 0;
    pointer-events: none;
  }
  .mlcad-measure-dot {
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--mlcad-measure-accent);
    border: 2px solid rgba(255, 255, 255, 0.9);
    box-sizing: border-box;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
  .mlcad-measure-badge {
    position: absolute;
    padding: 3px 10px;
    border-radius: 14px;
    background: var(--mlcad-ui-bg-elevated);
    border: 1px solid var(--mlcad-measure-accent-border);
    color: var(--mlcad-measure-accent);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    transform: translate(-50%, -50%);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
    pointer-events: none;
  }
  .mlcad-measure-badge--coordinate {
    transform: translate(-50%, calc(-50% - 16px));
  }
  .mlcad-measure-dot.mlcad-measure-selected {
    box-shadow:
      0 0 0 2px rgba(255, 213, 79, 0.75),
      0 0 10px rgba(255, 213, 79, 0.95),
      0 0 18px rgba(255, 213, 79, 0.55);
  }
  .mlcad-measure-badge.mlcad-measure-selected {
    outline: 2px solid rgba(255, 213, 79, 0.85);
    outline-offset: 1px;
    box-shadow:
      0 0 0 2px rgba(255, 213, 79, 0.4),
      0 0 12px rgba(255, 213, 79, 0.75),
      0 2px 8px rgba(0, 0, 0, 0.35);
  }
  .mlcad-measure-canvas.mlcad-measure-selected {
    filter:
      drop-shadow(0 0 1.5px #ffd54f)
      drop-shadow(0 0 4px rgba(255, 213, 79, 0.95))
      drop-shadow(0 0 8px rgba(255, 213, 79, 0.55));
  }
  .mlcad-measure-live-label {
    position: absolute;
    pointer-events: none;
    color: var(--mlcad-measure-accent);
    font-size: 12px;
    font-weight: 600;
    text-shadow: 0 0 4px #000, 0 1px 3px #000;
    transform: translate(-50%, -120%);
    display: none;
  }

  #mlcad-markup-overlays {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: var(--mlcad-z-markup);
    overflow: hidden;
  }
  .mlcad-markup-canvas {
    position: absolute;
    left: 0;
    top: 0;
    pointer-events: none;
  }
  .mlcad-markup-badge,
  .mlcad-markup-stamp {
    position: absolute;
    padding: 3px 10px;
    border-radius: 14px;
    background: var(--mlcad-ui-bg-elevated);
    border: 1px solid var(--mlcad-markup-accent-border);
    color: var(--mlcad-markup-accent);
    font-size: 12px;
    font-weight: 600;
    white-space: pre-wrap;
    max-width: 240px;
    min-width: 80px;
    min-height: 1.75em;
    box-sizing: border-box;
    transform: translate(-50%, -50%);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
    pointer-events: auto;
    cursor: grab;
    touch-action: none;
    user-select: none;
  }
  .mlcad-markup-stamp {
    border-radius: 4px;
    border-width: 2px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 11px;
    white-space: nowrap;
    min-width: 0;
  }
  .mlcad-markup-dot {
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--mlcad-markup-accent);
    border: 2px solid rgba(255, 255, 255, 0.9);
    box-sizing: border-box;
    transform: translate(-50%, -50%);
    pointer-events: auto;
    cursor: grab;
    touch-action: none;
  }
  .mlcad-markup-dot.mlcad-markup-selected {
    box-shadow:
      0 0 0 2px rgba(255, 213, 79, 0.75),
      0 0 10px rgba(255, 213, 79, 0.95),
      0 0 18px rgba(255, 213, 79, 0.55);
  }
  .mlcad-markup-badge.mlcad-markup-selected,
  .mlcad-markup-stamp.mlcad-markup-selected {
    outline: 2px solid rgba(255, 213, 79, 0.85);
    outline-offset: 1px;
    box-shadow:
      0 0 0 2px rgba(255, 213, 79, 0.4),
      0 0 12px rgba(255, 213, 79, 0.75),
      0 2px 8px rgba(0, 0, 0, 0.35);
  }
  .mlcad-markup-canvas.mlcad-markup-selected {
    filter:
      drop-shadow(0 0 1.5px #ffd54f)
      drop-shadow(0 0 4px rgba(255, 213, 79, 0.95))
      drop-shadow(0 0 8px rgba(255, 213, 79, 0.55));
  }

  #mlcad-loading {
    position: fixed; inset: 0; z-index: 100;
    display: flex; align-items: center; justify-content: center;
    background: #121418;
    transition: opacity 0.35s ease, visibility 0.35s ease;
  }
  #mlcad-loading.mlcad-loading--done {
    opacity: 0; visibility: hidden; pointer-events: none;
  }
  #mlcad-loading.mlcad-loading--gate .mlcad-loading-spinner {
    display: none;
  }
  .mlcad-loading-spinner {
    width: 48px; height: 48px; box-sizing: border-box;
    border: 3px solid rgba(255, 255, 255, 0.12);
    border-top-color: var(--mlcad-accent);
    border-radius: 50%;
    animation: mlcad-spin 0.85s linear infinite;
  }
  @keyframes mlcad-spin { to { transform: rotate(360deg); } }

  #mlcad-access-gate {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    max-width: 360px;
    padding: 0 20px;
    box-sizing: border-box;
  }
  #mlcad-access-gate[hidden] {
    display: none !important;
  }
  .mlcad-access-card {
    width: 100%;
    padding: 24px 20px;
    border-radius: 10px;
    border: 1px solid var(--mlcad-ui-border);
    background: var(--mlcad-ui-bg-elevated);
    box-shadow: var(--mlcad-shadow);
    box-sizing: border-box;
  }
  .mlcad-access-title {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 600;
    color: var(--mlcad-ui-text);
    text-align: center;
  }
  .mlcad-access-hint {
    margin: 0 0 16px;
    font-size: 13px;
    line-height: 1.45;
    color: var(--mlcad-ui-muted);
    text-align: center;
  }
  .mlcad-access-expiry {
    margin: -8px 0 16px;
    font-size: 12px;
    line-height: 1.4;
    color: var(--mlcad-ui-muted);
    text-align: center;
  }
  .mlcad-access-expiry[hidden] {
    display: none;
  }
  .mlcad-access-expiry.mlcad-expiry-countdown {
    width: fit-content;
    max-width: 100%;
    margin-left: auto;
    margin-right: auto;
    margin-bottom: 16px;
    padding: 6px 10px;
    border-radius: 6px;
    box-sizing: border-box;
  }
  .mlcad-access-field {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  .mlcad-access-field input {
    flex: 1 1 auto;
    min-width: 0;
    height: 36px;
    padding: 0 12px;
    border-radius: 6px;
    border: 1px solid var(--mlcad-ui-border);
    background: rgba(0, 0, 0, 0.25);
    color: var(--mlcad-ui-text);
    font: inherit;
    box-sizing: border-box;
  }
  .mlcad-access-field input:focus {
    outline: none;
    border-color: rgba(26, 140, 255, 0.65);
    box-shadow: 0 0 0 2px rgba(26, 140, 255, 0.2);
  }
  .mlcad-access-submit {
    width: 100%;
    height: 36px;
    border: 1px solid rgba(26, 140, 255, 0.55);
    border-radius: 6px;
    background: rgba(26, 140, 255, 0.22);
    color: #fff;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .mlcad-access-submit:hover {
    background: rgba(26, 140, 255, 0.32);
  }
  .mlcad-access-error {
    margin: 0;
    font-size: 12px;
    line-height: 1.4;
    color: #ff8a80;
    text-align: center;
  }
  .mlcad-access-error[hidden] {
    display: none;
  }
  .mlcad-access-gate--locked .mlcad-access-submit:disabled,
  .mlcad-access-gate--locked .mlcad-access-field input:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .mlcad-access-field[hidden],
  .mlcad-access-submit[hidden],
  .mlcad-access-gate--expired .mlcad-access-field,
  .mlcad-access-gate--expired .mlcad-access-submit,
  .mlcad-access-gate--expired #mlcad-access-expiry,
  .mlcad-access-gate--expired #mlcad-access-error {
    display: none !important;
  }
  .mlcad-expiry-badge {
    position: fixed;
    top: var(--mlcad-ui-inset);
    right: var(--mlcad-ui-inset);
    z-index: 40;
    max-width: min(360px, calc(100vw - 2 * var(--mlcad-ui-inset)));
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid var(--mlcad-ui-border);
    background: var(--mlcad-ui-bg-elevated);
    box-shadow: var(--mlcad-shadow);
    color: var(--mlcad-ui-text);
    font-size: 12px;
    line-height: 1.4;
    pointer-events: none;
  }
  .mlcad-expiry-badge[hidden] {
    display: none !important;
  }
  .mlcad-expiry-countdown {
    border-color: rgba(255, 152, 0, 0.55);
    background: rgba(255, 152, 0, 0.16);
    color: #ffcc80;
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: ${ML_UI_MOBILE_MAX_WIDTH}px) {
    :root {
      --mlcad-drawer-width: min(200px, calc(100vw - 2 * var(--mlcad-ui-inset) - var(--mlcad-toolbar-width) - var(--mlcad-drawer-gap)));
      --mlcad-ui-inset: 8px;
    }
    #mlcad-sidebar {
      left: var(--mlcad-ui-inset);
      right: var(--mlcad-ui-inset);
      width: auto;
    }
    #mlcad-layer-drawer {
      margin-left: auto;
      max-width: calc(100vw - 2 * var(--mlcad-ui-inset) - var(--mlcad-toolbar-width) - var(--mlcad-drawer-gap));
    }
    #mlcad-review-drawer {
      max-width: calc(100vw - 2 * var(--mlcad-ui-inset) - var(--mlcad-toolbar-width) - var(--mlcad-drawer-gap));
    }
    .mlcad-layer-action-btn {
      min-height: 28px;
      padding: 3px 6px;
      font-size: 11px;
      gap: 4px;
    }
    .mlcad-layer-action-btn svg { width: 12px; height: 12px; }
    .mlcad-layer-zoom {
      width: 20px;
      height: 20px;
    }
    .mlcad-layer-zoom svg {
      width: 12px;
      height: 12px;
    }
  }
`

/**
 * Body markup for the offline viewer (loading overlay, canvas root, sidebar).
 * Excludes snapshot and runtime `<script>` tags — those are appended by {@link packHtml}.
 *
 * @param loadingBg - CSS color for the initial loading screen (matches drawing background).
 * @param viewerMode - `'view'` shows pan/zoom/layers only; `'measure'` adds measurement and markup tools.
 * @param exportLayouts - When `false`, the layout switcher is omitted from the toolbar.
 * @returns HTML fragment inserted inside `<body>`.
 */
export function buildAcExHtmlShellBody(
  loadingBg: string,
  viewerMode: AcExViewerMode = 'measure',
  exportLayouts = true
): string {
  const measureToolbar =
    viewerMode === 'measure' ? buildAcExMeasureMenuButton() : ''
  const markupToolbar =
    viewerMode === 'measure' ? buildAcExMarkupMenuButton() : ''
  const snapToolbar = viewerMode === 'measure' ? buildAcExSnapMenuButton() : ''
  const languageToolbar = buildAcExLanguageToolbarButton()
  const submenuTemplates = ''
  const toolStrips = `${buildAcExHtmlZoomStrip()}${
    viewerMode === 'measure'
      ? `${buildAcExMeasureToolStrip()}${buildAcExMarkupToolStrip()}${buildAcExHtmlSnapStrip()}`
      : ''
  }${buildAcExHtmlLocaleStrip()}`

  return `
  <div id="mlcad-loading" aria-hidden="true" style="background:${loadingBg}">
    <div class="mlcad-loading-spinner"></div>
    <div id="mlcad-access-gate" hidden>
      <form id="mlcad-access-form" class="mlcad-access-card">
        <h2 class="mlcad-access-title" data-i18n-key="access.title" data-i18n-text>Protected drawing</h2>
        <p class="mlcad-access-hint" data-i18n-key="access.passwordPrompt" data-i18n-text>Enter the password to open this file.</p>
        <p id="mlcad-access-expiry" class="mlcad-access-expiry" hidden></p>
        <div class="mlcad-access-field">
          <input
            id="mlcad-access-password"
            type="password"
            autocomplete="off"
            data-i18n-key="access.passwordPlaceholder"
            data-i18n-attr="placeholder aria-label"
            placeholder="Password"
            aria-label="Password"
          />
        </div>
        <button type="submit" class="mlcad-access-submit" data-i18n-key="access.unlock" data-i18n-text>Unlock</button>
        <p id="mlcad-access-error" class="mlcad-access-error" hidden></p>
      </form>
    </div>
  </div>
  <div id="mlcad-root">
    <aside id="mlcad-sidebar">
      <nav id="mlcad-toolbar" data-i18n-attr="aria-label" data-i18n-key="toolbar.viewerTools" aria-label="Viewer tools">
        ${acExToolbarButton(acExHtmlIcons.select, 'Select', {
          'data-action': 'select',
          'aria-pressed': 'false',
          'data-i18n-key': 'toolbar.select',
          'data-i18n-attr': 'title aria-label'
        })}
        ${acExToolbarButton(acExHtmlIcons.pan, 'Pan', {
          'data-action': 'pan',
          'aria-pressed': 'true',
          'data-i18n-key': 'toolbar.pan',
          'data-i18n-attr': 'title aria-label'
        })}
        ${buildAcExZoomMenuButton()}
        ${viewerMode === 'measure' ? buildAcExToolbarSeparator() : ''}
        ${measureToolbar}
        ${markupToolbar}
        ${viewerMode === 'measure' ? buildAcExToolbarSeparator() : ''}
        ${acExToolbarButton(acExHtmlIcons.layer, 'Layers', {
          id: 'mlcad-layers-btn',
          'aria-haspopup': 'dialog',
          'aria-expanded': 'false',
          'data-i18n-key': 'toolbar.layers',
          'data-i18n-attr': 'title aria-label'
        })}
        ${exportLayouts ? buildAcExLayoutMenuButton() : ''}
        ${snapToolbar}
        ${languageToolbar}
        ${acExToolbarButton(acExHtmlIcons.chevronUp, 'Collapse toolbar', {
          id: 'mlcad-toolbar-toggle',
          'aria-expanded': 'true',
          'data-i18n-key': 'toolbar.collapse',
          'data-i18n-attr': 'title aria-label'
        })}
      </nav>
      ${toolStrips}
      <div id="mlcad-layer-drawer" role="dialog" data-i18n-attr="aria-label" data-i18n-key="layers.title" aria-label="Layers" hidden>
        <div class="mlcad-drawer-header">
          <span data-i18n-key="layers.title" data-i18n-text>Layers</span>
          <button type="button" class="mlcad-drawer-close" id="mlcad-layer-close" data-i18n-key="layers.close" data-i18n-attr="aria-label" aria-label="Close layers">×</button>
        </div>
        <div class="mlcad-layer-actions">
          <button type="button" class="mlcad-layer-action-btn" id="mlcad-layer-show-all">
            ${acExHtmlIcons.layerOn}<span data-i18n-key="layers.showAll" data-i18n-text>Show all</span>
          </button>
          <button type="button" class="mlcad-layer-action-btn" id="mlcad-layer-hide-all">
            ${acExHtmlIcons.layerOff}<span data-i18n-key="layers.hideAll" data-i18n-text>Hide all</span>
          </button>
        </div>
        <div id="mlcad-layer-list"></div>
      </div>
    </aside>
    <footer id="mlcad-status-bar" aria-live="polite"></footer>
  </div>
  ${submenuTemplates}`
}

function buildAcExToolbarSeparator(): string {
  return '<div class="mlcad-tool-separator" aria-hidden="true"></div>'
}

function buildAcExReviewDrawer(): string {
  return `<div id="mlcad-review-drawer" role="dialog" data-i18n-attr="aria-label" data-i18n-key="review.title" aria-label="Review" hidden>
        <div class="mlcad-drawer-header">
          <span data-i18n-key="review.title" data-i18n-text>Review</span>
          <button type="button" class="mlcad-drawer-close" id="mlcad-review-close" data-i18n-key="review.close" data-i18n-attr="aria-label" aria-label="Close review">×</button>
        </div>
        <div class="mlcad-review-toolbar">
          <input type="search" class="mlcad-review-search" data-i18n-key="review.searchPlaceholder" data-i18n-attr="placeholder" placeholder="Search markups" />
          <button type="button" class="mlcad-review-clear" data-i18n-key="review.clear" data-i18n-text>Clear all</button>
        </div>
        <div class="mlcad-review-table-wrap">
          <table class="mlcad-review-table">
            <thead>
              <tr>
                <th data-review-col="type" data-i18n-key="review.type" data-i18n-text>Type</th>
                <th data-review-col="status" data-i18n-key="review.status" data-i18n-text>Status</th>
                <th data-review-col="author" data-i18n-key="review.author" data-i18n-text>Author</th>
                <th data-review-col="summary" data-i18n-key="review.summary" data-i18n-text>Summary</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <div class="mlcad-review-detail" hidden>
          <div class="mlcad-review-detail-header">
            <div class="mlcad-review-detail-title" data-i18n-key="review.details" data-i18n-text>Details</div>
            <button type="button" class="mlcad-review-detail-close" data-i18n-key="review.closeDetails" data-i18n-attr="title aria-label" title="Close details" aria-label="Close details">×</button>
          </div>
          <div class="mlcad-review-field">
            <label class="mlcad-review-field-label" data-review-field="status" data-i18n-key="review.status" data-i18n-text>Status</label>
            <select class="mlcad-review-status"></select>
          </div>
          <div class="mlcad-review-field">
            <label class="mlcad-review-field-label" data-review-field="author" data-i18n-key="review.author" data-i18n-text>Author</label>
            <input type="text" class="mlcad-review-author" disabled />
          </div>
          <div class="mlcad-review-field">
            <label class="mlcad-review-field-label" data-review-field="label" data-i18n-key="review.label" data-i18n-text>Label</label>
            <input type="text" class="mlcad-review-text" />
          </div>
          <div class="mlcad-review-field">
            <label class="mlcad-review-field-label" data-review-field="comment" data-i18n-key="review.comment" data-i18n-text>Comment</label>
            <textarea class="mlcad-review-comment" rows="2"></textarea>
          </div>
          <div class="mlcad-review-detail-actions">
            <button type="button" class="mlcad-review-zoom" data-i18n-key="review.zoomTo" data-i18n-text>Zoom to</button>
            <button type="button" class="mlcad-review-delete" data-i18n-key="review.delete" data-i18n-text>Delete</button>
          </div>
        </div>
      </div>`
}

function buildAcExLayoutMenuButton(): string {
  return acExToolbarButton(acExHtmlIcons.layout, 'Layout', {
    id: 'mlcad-layout-menu-btn',
    'aria-haspopup': 'menu',
    'aria-expanded': 'false',
    'data-action': 'layout-menu',
    'data-i18n-key': 'toolbar.layout',
    'data-i18n-attr': 'title aria-label',
    'data-children-ui': 'menu'
  }).replace('class="mlcad-tool-btn"', 'class="mlcad-tool-btn has-children"')
}

function buildAcExZoomMenuButton(): string {
  return acExToolbarButton(acExHtmlIcons.zoomExtent, 'Zoom', {
    id: 'mlcad-zoom-menu-btn',
    'aria-haspopup': 'true',
    'aria-expanded': 'false',
    'data-action': 'zoom-menu',
    'data-i18n-key': 'toolbar.zoom',
    'data-i18n-attr': 'title aria-label',
    'data-children-ui': 'toolbar'
  }).replace('class="mlcad-tool-btn"', 'class="mlcad-tool-btn has-children"')
}

function buildAcExHtmlZoomStrip(): string {
  return `<div id="mlcad-zoom-strip-wrap" hidden>
        <div id="mlcad-zoom-strip" role="toolbar" data-i18n-attr="aria-label" data-i18n-key="toolbar.zoom" aria-label="Zoom">
          ${acExToolbarButton(acExHtmlIcons.zoomExtent, 'Zoom extents', {
            'data-action': 'fit',
            'data-i18n-key': 'toolbar.zoomExtents',
            'data-i18n-attr': 'title aria-label'
          })}
          ${acExToolbarButton(acExHtmlIcons.zoomWindow, 'Zoom window', {
            'data-action': 'zoom-window',
            'aria-pressed': 'false',
            'data-i18n-key': 'toolbar.zoomWindow',
            'data-i18n-attr': 'title aria-label'
          })}
          ${acExToolbarButton(acExHtmlIcons.zoomOriginal, 'Original view', {
            'data-action': 'zoom-original',
            'data-i18n-key': 'toolbar.zoomOriginal',
            'data-i18n-attr': 'title aria-label'
          })}
        </div>
      </div>`
}

function buildAcExMeasureMenuButton(): string {
  return acExToolbarButton(acExHtmlIcons.measure, 'Measurement', {
    id: 'mlcad-measure-menu-btn',
    'aria-haspopup': 'true',
    'aria-expanded': 'false',
    'data-action': 'measure-menu',
    'data-i18n-key': 'toolbar.measure',
    'data-i18n-attr': 'title aria-label',
    'data-children-ui': 'sticky-toolbar'
  }).replace('class="mlcad-tool-btn"', 'class="mlcad-tool-btn has-children"')
}

function buildAcExMarkupMenuButton(): string {
  return acExToolbarButton(acExHtmlIcons.annotation, 'Review', {
    id: 'mlcad-markup-menu-btn',
    'aria-haspopup': 'true',
    'aria-expanded': 'false',
    'data-action': 'markup-menu',
    'data-i18n-key': 'toolbar.annotation',
    'data-i18n-attr': 'title aria-label',
    'data-children-ui': 'sticky-toolbar'
  }).replace('class="mlcad-tool-btn"', 'class="mlcad-tool-btn has-children"')
}

function buildAcExMeasureToolStrip(): string {
  return `<div id="mlcad-measure-strip-wrap" hidden>
    <div id="mlcad-measure-strip" role="toolbar" data-i18n-attr="aria-label" data-i18n-key="toolbar.measure" aria-label="Measurement">
      ${acExToolbarButton(acExHtmlIcons.measureDistance, 'Measure distance', {
        'data-action': 'measure',
        'data-measure-mode': 'distance',
        'data-i18n-key': 'toolbar.measureDistance',
        'data-i18n-attr': 'title aria-label'
      })}
      ${acExToolbarButton(acExHtmlIcons.measureAngle, 'Measure angle', {
        'data-action': 'measure',
        'data-measure-mode': 'angle',
        'data-i18n-key': 'toolbar.measureAngle',
        'data-i18n-attr': 'title aria-label'
      })}
      ${acExToolbarButton(acExHtmlIcons.measureArc, 'Measure arc length', {
        'data-action': 'measure',
        'data-measure-mode': 'arc',
        'data-i18n-key': 'toolbar.measureArc',
        'data-i18n-attr': 'title aria-label'
      })}
      ${acExToolbarButton(acExHtmlIcons.measureArea, 'Measure area', {
        'data-action': 'measure',
        'data-measure-mode': 'area',
        'data-i18n-key': 'toolbar.measureArea',
        'data-i18n-attr': 'title aria-label'
      })}
      ${acExToolbarButton(
        acExHtmlIcons.measureCoordinate,
        'Measure coordinates',
        {
          'data-action': 'measure',
          'data-measure-mode': 'coordinate',
          'data-i18n-key': 'toolbar.measureCoordinate',
          'data-i18n-attr': 'title aria-label'
        }
      )}
      ${acExToolbarButton(acExHtmlIcons.markupShow, 'Hide measurements', {
        'data-action': 'measure-visibility',
        'data-i18n-key': 'toolbar.measureHide',
        'data-i18n-attr': 'title aria-label'
      })}
      ${acExToolbarButton(
        acExHtmlIcons.clearMeasurements,
        'Clear measurements',
        {
          'data-action': 'clear-measurements',
          'data-i18n-key': 'toolbar.clearMeasurements',
          'data-i18n-attr': 'title aria-label'
        }
      )}
      ${buildAcExToolbarSeparator()}
      ${acExToolbarButton(acExHtmlIcons.markupImport, 'Import measurements', {
        'data-action': 'measure-import',
        'data-i18n-key': 'toolbar.measureImport',
        'data-i18n-attr': 'title aria-label'
      })}
      ${acExToolbarButton(acExHtmlIcons.markupExport, 'Export measurements', {
        'data-action': 'measure-export',
        'data-i18n-key': 'toolbar.measureExport',
        'data-i18n-attr': 'title aria-label'
      })}
    </div>
  </div>`
}

function buildAcExMarkupToolStrip(): string {
  return `<div id="mlcad-markup-strip-wrap" hidden>
    <div id="mlcad-markup-strip" role="toolbar" data-i18n-attr="aria-label" data-i18n-key="toolbar.annotation" aria-label="Review">
      ${acExToolbarButton(acExHtmlIcons.markupCloud, 'Cloud', {
        'data-action': 'markup',
        'data-markup-mode': 'cloud',
        'data-i18n-key': 'toolbar.markupCloud',
        'data-i18n-attr': 'title aria-label'
      })}
      ${acExToolbarButton(acExHtmlIcons.markupRect, 'Rectangle', {
        'data-action': 'markup',
        'data-markup-mode': 'rect',
        'data-i18n-key': 'toolbar.markupRect',
        'data-i18n-attr': 'title aria-label'
      })}
      ${acExToolbarButton(acExHtmlIcons.markupCircle, 'Circle', {
        'data-action': 'markup',
        'data-markup-mode': 'circle',
        'data-i18n-key': 'toolbar.markupCircle',
        'data-i18n-attr': 'title aria-label'
      })}
      ${acExToolbarButton(acExHtmlIcons.markupCallout, 'Callout', {
        'data-action': 'markup',
        'data-markup-mode': 'callout',
        'data-i18n-key': 'toolbar.markupCallout',
        'data-i18n-attr': 'title aria-label'
      })}
      ${acExToolbarButton(acExHtmlIcons.markupArrow, 'Arrow', {
        'data-action': 'markup',
        'data-markup-mode': 'arrow',
        'data-i18n-key': 'toolbar.markupArrow',
        'data-i18n-attr': 'title aria-label'
      })}
      ${acExToolbarButton(acExHtmlIcons.markupText, 'Text', {
        'data-action': 'markup',
        'data-markup-mode': 'text',
        'data-i18n-key': 'toolbar.markupText',
        'data-i18n-attr': 'title aria-label'
      })}
      ${acExToolbarButton(acExHtmlIcons.markupStamp, 'Stamp', {
        'data-action': 'markup',
        'data-markup-mode': 'stamp',
        'data-i18n-key': 'toolbar.markupStamp',
        'data-i18n-attr': 'title aria-label'
      })}
      ${acExToolbarButton(acExHtmlIcons.markupPanel, 'Review', {
        'data-action': 'markup-panel',
        'aria-pressed': 'false',
        'data-i18n-key': 'toolbar.markupPanel',
        'data-i18n-attr': 'title aria-label'
      })}
      ${acExToolbarButton(acExHtmlIcons.markupShow, 'Hide markups', {
        'data-action': 'markup-visibility',
        'data-i18n-key': 'toolbar.markupHide',
        'data-i18n-attr': 'title aria-label'
      })}
      ${acExToolbarButton(acExHtmlIcons.clearMarkups, 'Clear markups', {
        'data-action': 'clear-markups',
        'data-i18n-key': 'toolbar.clearMarkups',
        'data-i18n-attr': 'title aria-label'
      })}
      ${buildAcExToolbarSeparator()}
      ${acExToolbarButton(acExHtmlIcons.markupImport, 'Import markups', {
        'data-action': 'markup-import',
        'data-i18n-key': 'toolbar.markupImport',
        'data-i18n-attr': 'title aria-label'
      })}
      ${acExToolbarButton(acExHtmlIcons.markupExport, 'Export markups', {
        'data-action': 'markup-export',
        'data-i18n-key': 'toolbar.markupExport',
        'data-i18n-attr': 'title aria-label'
      })}
    </div>
    ${buildAcExReviewDrawer()}
  </div>`
}

function buildAcExSnapMenuButton(): string {
  return acExToolbarButton(acExHtmlIcons.osnap, 'Object snap', {
    id: 'mlcad-snap-menu-btn',
    'aria-haspopup': 'true',
    'aria-expanded': 'false',
    'data-action': 'snap-menu',
    'data-i18n-key': 'toolbar.snap',
    'data-i18n-attr': 'title aria-label',
    'data-children-ui': 'sticky-toolbar'
  }).replace('class="mlcad-tool-btn"', 'class="mlcad-tool-btn has-children"')
}

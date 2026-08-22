/** `id` of the injected stylesheet, used to avoid inserting it twice. */
const STYLE_ID = 'ml-diff-viewer-styles'

/** Widget stylesheet injected once by {@link acapInjectDiffViewerStyles}. */
const CSS = `
.ml-diff-root {
  --ml-diff-bg: var(--ml-ui-bg, #1d1e1f);
  --ml-diff-panel: var(--ml-ui-bg, #1d1e1f);
  --ml-diff-border: var(--ml-ui-border, #4c4d4f);
  --ml-diff-text: var(--ml-ui-text, #e5eaf3);
  --ml-diff-muted: var(--ml-ui-text-muted, #cfd3dc);
  --ml-diff-focus: var(--ml-ui-accent, #409eff);
  --ml-diff-added: #22c55e;
  --ml-diff-deleted: #e11d48;
  --ml-diff-modified: #f59e0b;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  color: var(--ml-diff-text);
  background: var(--ml-diff-bg);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.ml-diff-root *,
.ml-diff-root *::before,
.ml-diff-root *::after {
  box-sizing: border-box;
}

.ml-diff-toolbar {
  position: relative;
  z-index: 5;
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.55rem;
  background: var(--ml-diff-panel);
  border-bottom: 1px solid var(--ml-diff-border);
}

.ml-diff-toolbar-group {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding-right: 0.45rem;
  margin-right: 0.25rem;
  border-right: 1px solid var(--ml-diff-border);
}

.ml-diff-toolbar-group:last-child {
  border-right: none;
  margin-right: 0;
  padding-right: 0;
}

.ml-diff-toolbar-locale {
  margin-left: auto;
  gap: 0.35rem;
}

.ml-diff-tool-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  min-height: 1.85rem;
  padding: 0.2rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--ml-diff-muted);
  font-size: 0.75rem;
  cursor: pointer;
}

.ml-diff-tool-btn.is-icon {
  width: 1.85rem;
  padding: 0.2rem;
}

.ml-diff-root.is-overlay .ml-diff-sync-btn {
  display: none;
}

.ml-diff-tool-btn:hover,
.ml-diff-tool-btn:focus-visible {
  color: var(--ml-diff-text);
  background: rgba(255, 255, 255, 0.06);
  outline: none;
}

.ml-diff-tool-btn.is-active {
  color: var(--ml-diff-text);
  border-color: var(--ml-diff-focus);
  background: color-mix(in srgb, var(--ml-diff-focus) 18%, transparent);
}

.ml-diff-tool-btn svg {
  width: 1rem;
  height: 1rem;
  display: block;
}

.ml-diff-lang-select {
  position: relative;
  width: 110px;
}

.ml-diff-lang-select__trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 100%;
  height: 24px;
  padding: 0 22px 0 8px;
  border: 1px solid var(--ml-diff-border);
  border-radius: 4px;
  background: var(--ml-diff-bg);
  color: var(--ml-diff-text);
  font-size: 12px;
  font-family: inherit;
  line-height: 22px;
  text-align: left;
  cursor: pointer;
}

.ml-diff-lang-select__trigger:hover,
.ml-diff-lang-select.is-open .ml-diff-lang-select__trigger {
  border-color: var(--ml-diff-focus);
}

.ml-diff-lang-select__trigger:focus-visible {
  outline: none;
  border-color: var(--ml-diff-focus);
  box-shadow: 0 0 0 1px var(--ml-diff-focus);
}

.ml-diff-lang-select__label {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ml-diff-lang-select__caret {
  position: absolute;
  right: 6px;
  top: 50%;
  width: 10px;
  height: 10px;
  margin-top: -5px;
  color: var(--ml-diff-muted);
  pointer-events: none;
  transition: transform 0.15s ease;
}

.ml-diff-lang-select.is-open .ml-diff-lang-select__caret {
  transform: rotate(180deg);
}

.ml-diff-lang-select__menu {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  z-index: 40;
  min-width: 100%;
  padding: 4px 0;
  border: 1px solid var(--ml-diff-border);
  border-radius: 4px;
  background: var(--ml-diff-panel);
  box-shadow: var(--ml-ui-shadow, 0 6px 16px rgba(0, 0, 0, 0.45));
}

.ml-diff-lang-select__option {
  display: block;
  width: 100%;
  margin: 0;
  padding: 5px 12px;
  border: none;
  background: transparent;
  color: var(--ml-diff-text);
  font-size: 12px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.ml-diff-lang-select__option:hover {
  background: rgba(255, 255, 255, 0.08);
}

.ml-diff-lang-select__option.is-selected {
  color: var(--ml-diff-text);
  background: color-mix(in srgb, var(--ml-diff-focus) 22%, transparent);
  font-weight: 600;
}

.ml-diff-body {
  flex: 1 1 auto;
  display: flex;
  min-height: 0;
  min-width: 0;
}

.ml-diff-panes {
  flex: 1 1 auto;
  display: flex;
  min-width: 0;
  min-height: 0;
}

.ml-diff-pane {
  flex: 1 1 50%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 2px solid transparent;
}

.ml-diff-pane.is-empty {
  cursor: pointer;
}

.ml-diff-root.is-overlay .ml-diff-pane[data-side='right'] {
  display: none;
}

.ml-diff-root.is-overlay .ml-diff-pane[data-side='left'] {
  flex: 1 1 100%;
}

.ml-diff-pane.is-focused {
  position: relative;
  z-index: 1;
  border-color: var(--ml-diff-focus);
}

.ml-diff-pane + .ml-diff-pane {
  border-left: 1px solid var(--ml-diff-border);
}

/* Adjacent-sibling divider must not replace the focused pane's left edge. */
.ml-diff-pane + .ml-diff-pane.is-focused {
  border-left: 2px solid var(--ml-diff-focus);
}

.ml-diff-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.45rem 0.35rem 0.7rem;
  background: var(--ml-diff-panel);
  border-bottom: 1px solid var(--ml-diff-border);
}

.ml-diff-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.85rem;
}

.ml-diff-title.is-empty {
  color: var(--ml-diff-muted);
}

.ml-diff-open {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.85rem;
  height: 1.85rem;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ml-diff-muted);
  cursor: pointer;
}

.ml-diff-open:hover,
.ml-diff-open:focus-visible {
  color: var(--ml-diff-text);
  background: rgba(255, 255, 255, 0.08);
  outline: none;
}

.ml-diff-open svg,
.ml-diff-icon svg {
  display: block;
  width: 1.15rem;
  height: 1.15rem;
}

.ml-diff-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.ml-diff-canvas-slot {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  background: #000;
}

.ml-diff-canvas {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 1;
}

.ml-diff-empty {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  color: var(--ml-diff-muted);
  cursor: pointer;
}

.ml-diff-empty.is-hidden {
  display: none;
}

.ml-diff-empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  max-width: 18rem;
  padding: 1.75rem 1.5rem;
  border: 1px dashed var(--ml-diff-border);
  border-radius: 10px;
  text-align: center;
  background: color-mix(in srgb, var(--ml-diff-panel) 70%, transparent);
}

.ml-diff-empty-icon {
  color: var(--ml-diff-muted);
}

.ml-diff-empty-icon svg {
  display: block;
  width: 2.25rem;
  height: 2.25rem;
}

.ml-diff-empty-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ml-diff-text);
}

.ml-diff-empty-hint {
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--ml-diff-muted);
}

.ml-diff-empty-error {
  font-size: 0.8rem;
  color: #fca5a5;
}

.ml-diff-empty-error.is-hidden,
.ml-diff-banner.is-hidden {
  display: none;
}

.ml-diff-banner {
  position: absolute;
  left: 50%;
  top: 0.7rem;
  z-index: 4;
  transform: translateX(-50%);
  max-width: calc(100% - 1.5rem);
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  background: #7f1d1d;
  color: #fecaca;
  font-size: 0.8rem;
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ml-diff-pane.is-dragover .ml-diff-canvas-slot::after {
  content: '';
  position: absolute;
  inset: 0.55rem;
  z-index: 3;
  pointer-events: none;
  border: 2px dashed var(--ml-diff-focus);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ml-diff-focus) 12%, transparent);
}

.ml-diff-pane.is-dragover .ml-diff-empty-card {
  border-color: var(--ml-diff-focus);
  background: color-mix(in srgb, var(--ml-diff-focus) 12%, transparent);
}

.ml-diff-pane:not(.is-focused) canvas {
  pointer-events: none;
}

.ml-diff-root.is-overlay .ml-diff-pane canvas {
  pointer-events: auto;
}

.ml-diff-sidepanel {
  flex: 0 0 280px;
  max-width: 40%;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--ml-diff-border);
  background: var(--ml-diff-panel);
}

.ml-diff-sidepanel.is-collapsed {
  display: none;
}

.ml-diff-sidepanel-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.6rem;
  border-bottom: 1px solid var(--ml-diff-border);
}

.ml-diff-sidepanel-title {
  flex: 1 1 auto;
  font-size: 0.85rem;
  font-weight: 600;
}

.ml-diff-sidepanel-tabs {
  flex: 0 0 auto;
  display: flex;
  border-bottom: 1px solid var(--ml-diff-border);
}

.ml-diff-sidepanel-tab {
  flex: 1 1 50%;
  padding: 0.45rem;
  border: none;
  background: transparent;
  color: var(--ml-diff-muted);
  font-size: 0.8rem;
  cursor: pointer;
}

.ml-diff-sidepanel-tab.is-active {
  color: var(--ml-diff-text);
  box-shadow: inset 0 -2px 0 var(--ml-diff-focus);
}

.ml-diff-sidepanel-toolbar {
  flex: 0 0 auto;
  display: flex;
  gap: 0.35rem;
  padding: 0.4rem 0.55rem;
  border-bottom: 1px solid var(--ml-diff-border);
}

.ml-diff-sidepanel-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 0.4rem 0;
}

.ml-diff-group {
  margin-bottom: 0.35rem;
}

.ml-diff-group-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  width: 100%;
  padding: 0.3rem 0.7rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--ml-diff-muted);
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.ml-diff-group-title::-webkit-details-marker,
.ml-diff-group-title::marker {
  display: none;
  content: none;
}

.ml-diff-group-title::before {
  content: '';
  flex: 0 0 auto;
  width: 0.35rem;
  height: 0.35rem;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(-45deg);
  transition: transform 0.15s ease;
}

.ml-diff-group[open] .ml-diff-group-title::before {
  transform: rotate(45deg);
}

.ml-diff-group-title:hover,
.ml-diff-group-title:focus-visible {
  color: var(--ml-diff-text);
  background: rgba(255, 255, 255, 0.05);
  outline: none;
}

.ml-diff-result-item,
.ml-diff-markup-item {
  display: block;
  width: 100%;
  padding: 0.4rem 0.7rem;
  border: none;
  border-left: 3px solid transparent;
  background: transparent;
  color: var(--ml-diff-text);
  text-align: left;
  font-size: 0.8rem;
  cursor: pointer;
}

.ml-diff-result-item:hover,
.ml-diff-markup-item:hover,
.ml-diff-result-item.is-active {
  background: rgba(255, 255, 255, 0.05);
}

.ml-diff-result-item[data-kind='added'] {
  border-left-color: var(--ml-diff-added);
}

.ml-diff-result-item[data-kind='deleted'] {
  border-left-color: var(--ml-diff-deleted);
}

.ml-diff-result-item[data-kind='modified'] {
  border-left-color: var(--ml-diff-modified);
}

.ml-diff-result-meta,
.ml-diff-markup-meta {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.7rem;
  color: var(--ml-diff-muted);
}

.ml-diff-empty-list {
  padding: 1rem 0.8rem;
  color: var(--ml-diff-muted);
  font-size: 0.8rem;
  text-align: center;
}
`.trim()

/** Injects widget CSS into `document.head` once per page. */
export function acapInjectDiffViewerStyles(): void {
  if (document.getElementById(STYLE_ID)) {
    return
  }
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.appendChild(style)
}

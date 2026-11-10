/**
 * CSS for {@link AcUiLlmSettingsDialog}. Colors come from the `--ml-ui-*`
 * theme tokens set on the dialog backdrop, so light and dark themes both work.
 */
export const LLM_SETTINGS_STYLES = `
.ml-ui-dialog.ml-llm-settings-dialog {
  display: flex;
  flex-direction: column;
  width: min(860px, calc(100% - 32px));
  max-width: none;
  max-height: calc(100% - 24px);
  overflow: hidden;
  font-size: 12px;
}

.ml-llm-settings-dialog .ml-ui-dialog-header {
  flex-shrink: 0;
  margin-bottom: 10px;
}

/* Only the body scrolls, and only on very short hosts: the footer buttons
   always stay in view. */
.ml-llm-settings-dialog .ml-ui-dialog-body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow-y: auto;
}

.ml-llm-settings-dialog .ml-ui-dialog-footer:not(:empty) {
  flex-shrink: 0;
  align-items: center;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--ml-ui-border, #dcdfe6);
}

/* "Model in use": label and picker on one row. */
.ml-llm-section > .ml-llm-field {
  flex-direction: row;
  align-items: center;
  gap: 10px;
}

.ml-llm-section > .ml-llm-field > select {
  flex: 1 1 auto;
}

.ml-llm-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.ml-llm-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

@media (max-width: 720px) {
  .ml-llm-columns {
    grid-template-columns: minmax(0, 1fr);
  }
}

.ml-llm-footer-message {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.ml-llm-settings-dialog input,
.ml-llm-settings-dialog select {
  box-sizing: border-box;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 4px;
  background: var(--ml-ui-bg, #ffffff);
  color: var(--ml-ui-text, #303133);
  font: inherit;
}

.ml-llm-settings-dialog input:focus,
.ml-llm-settings-dialog select:focus {
  outline: none;
  border-color: var(--ml-ui-accent, #0b84ff);
}

.ml-llm-settings-dialog input:disabled {
  color: var(--ml-ui-text-muted, #606266);
  cursor: not-allowed;
}

.ml-llm-settings-dialog input[type='checkbox'] {
  margin: 0;
  padding: 0;
  accent-color: var(--ml-ui-accent, #0b84ff);
}

.ml-llm-settings-dialog [hidden] {
  display: none !important;
}

.ml-llm-section,
.ml-llm-group,
.ml-llm-catalog {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ml-llm-section-title,
.ml-llm-field-label {
  font-weight: 600;
}

.ml-llm-field-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
}

.ml-llm-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ml-llm-hint,
.ml-llm-warning,
.ml-llm-error,
.ml-llm-validation,
.ml-llm-status {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
}

.ml-llm-hint,
.ml-llm-meta {
  color: var(--ml-ui-text-muted, #606266);
}

.ml-llm-meta {
  font-size: 11px;
  font-weight: normal;
}

.ml-llm-warning,
.ml-llm-validation {
  color: #b7791f;
}

.ml-llm-error {
  color: var(--ml-ui-danger, #f56c6c);
  word-break: break-word;
}

.ml-llm-status {
  color: var(--ml-ui-accent, #0b84ff);
}

.ml-llm-divider {
  flex-shrink: 0;
  height: 1px;
  margin: 2px 0;
  background: var(--ml-ui-border, #dcdfe6);
}

.ml-llm-segmented {
  display: flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 6px;
}

.ml-llm-segmented-item {
  flex: 1 1 0;
  min-width: 0;
  padding: 5px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--ml-ui-text-muted, #606266);
  font: inherit;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ml-llm-segmented-item:hover:not(.is-active) {
  color: var(--ml-ui-text, #303133);
}

.ml-llm-segmented-item.is-active {
  border-color: var(--ml-ui-accent, #0b84ff);
  background: var(--ml-ui-accent, #0b84ff);
  color: #ffffff;
}

.ml-llm-disclosure {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 4px;
  padding: 2px 4px 2px 0;
  border: none;
  background: transparent;
  color: var(--ml-ui-text, #303133);
  font: inherit;
  cursor: pointer;
}

.ml-llm-disclosure-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.15s ease;
}

.ml-llm-disclosure-icon.is-open {
  transform: rotate(90deg);
}

.ml-llm-link-btn {
  padding: 2px 0;
  border: none;
  background: transparent;
  color: var(--ml-ui-accent, #0b84ff);
  font: inherit;
  cursor: pointer;
  white-space: nowrap;
}

.ml-llm-link-btn:hover:not(:disabled) {
  text-decoration: underline;
}

.ml-llm-link-btn:disabled {
  color: var(--ml-ui-text-muted, #606266);
  opacity: 0.6;
  cursor: not-allowed;
}

.ml-llm-catalog-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.ml-llm-catalog-heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ml-llm-catalog-actions {
  display: flex;
  flex-shrink: 0;
  gap: 12px;
}

.ml-llm-empty {
  margin: 0;
  padding: 14px 10px;
  border: 1px dashed var(--ml-ui-border, #dcdfe6);
  border-radius: 6px;
  color: var(--ml-ui-text-muted, #606266);
  text-align: center;
  line-height: 1.5;
}

.ml-llm-model-rows,
.ml-llm-picker-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ml-llm-model-rows {
  max-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ml-llm-model-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ml-llm-settings-dialog .ml-llm-model-id {
  flex: 1 1 auto;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.ml-llm-model-vision {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--ml-ui-text-muted, #606266);
  cursor: pointer;
  white-space: nowrap;
}

.ml-llm-model-remove {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--ml-ui-text-muted, #606266);
  cursor: pointer;
}

.ml-llm-model-remove:hover {
  color: var(--ml-ui-danger, #f56c6c);
}

.ml-llm-model-remove svg,
.ml-llm-add-model svg {
  width: 14px;
  height: 14px;
}

.ml-llm-settings-dialog .ml-llm-add-model {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 4px;
}

.ml-llm-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 6px;
}

.ml-llm-picker-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-weight: 600;
}

.ml-llm-picker-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ml-llm-picker-toolbar input {
  flex: 1 1 auto;
}

.ml-llm-picker-list {
  max-height: 180px;
  overflow-y: auto;
}

.ml-llm-picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
}

.ml-llm-picker-item:hover {
  background: color-mix(in srgb, var(--ml-ui-accent, #0b84ff) 10%, transparent);
}

.ml-llm-picker-id {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.ml-llm-picker-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.ml-llm-settings-dialog .ml-ui-dialog-btn:disabled {
  opacity: 0.5;
  filter: none;
  cursor: not-allowed;
}

.ml-llm-settings-dialog .ml-llm-danger {
  color: var(--ml-ui-danger, #f56c6c);
}

`.trim()

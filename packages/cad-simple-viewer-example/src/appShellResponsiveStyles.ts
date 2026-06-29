import { ML_UI_COMPACT_MAX_WIDTH } from '@mlightcad/cad-simple-viewer'

const STYLE_ID = 'ml-app-shell-responsive-styles'

/**
 * Injects compact-layout responsive rules for the example app shell.
 *
 * Kept in TypeScript so the breakpoint stays aligned with {@link ML_UI_COMPACT_MAX_WIDTH}.
 */
export function injectAppShellResponsiveStyles() {
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @media (max-width: ${ML_UI_COMPACT_MAX_WIDTH}px) {
      .app-shell {
        flex-direction: column;
        min-height: 0;
      }

      .file-sidebar {
        flex: 0 0 auto;
        flex-shrink: 0;
        max-width: 100%;
        min-width: 0;
        width: 100%;
        height: auto;
        padding: 0;
        overflow: hidden;
        border-right: none;
        border-bottom: 1px solid #1f2937;
      }

      .sidebar-title-desktop {
        display: none;
      }

      .file-sidebar-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 0.75rem;
        padding: 0.65rem 0.85rem;
        border: none;
        background: #0f172a;
        color: inherit;
        cursor: pointer;
        text-align: left;
      }

      .file-sidebar-toggle:hover {
        background: #111827;
      }

      .file-sidebar-toggle-label {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        min-width: 0;
      }

      .file-sidebar-toggle-subtitle {
        font-size: 0.75rem;
        font-weight: 400;
        color: #9ca3af;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .file-sidebar-chevron {
        flex: 0 0 auto;
        font-size: 0.7rem;
        color: #9ca3af;
        transition: transform 0.2s ease;
      }

      .file-sidebar.expanded .file-sidebar-chevron {
        transform: rotate(180deg);
      }

      .file-sidebar-body {
        display: none;
      }

      .file-sidebar-body.file-sidebar-popover {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
        position: fixed;
        z-index: 200;
        left: 8px;
        right: 8px;
        padding: 0.75rem 0.85rem;
        overflow: auto;
        background: #0f172a;
        border: 1px solid #374151;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
      }

      .viewer-pane {
        flex: 1;
        min-height: 0;
        min-width: 0;
      }

      .dev-toolbar {
        display: none !important;
      }
    }
  `
  document.head.appendChild(style)
}

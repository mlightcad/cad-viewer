import { AcApDocManager } from '../app'
import { AcEdMTextEditor } from '../editor/input/ui/AcEdMTextEditor'
import type { AcTrView2d } from './AcTrView2d'

/**
 * Document-level undo/redo shortcut resolved from a keyboard event.
 *
 * - Windows: Ctrl+Z (undo), Ctrl+Y (redo)
 * - macOS: Cmd+Z (undo), Shift+Cmd+Z (redo)
 *
 * Ctrl/Cmd+Shift+Z is also accepted as redo on Windows for convenience.
 */
export type AcEdUndoRedoShortcut = 'undo' | 'redo'

/**
 * Handles global keyboard shortcuts for a CAD view.
 *
 * Shortcuts are suppressed while the user is typing in editable fields, during
 * IME composition, while a command is acquiring input, or while MText is being
 * edited inline.
 */
export class AcEdViewKeyHandler {
  private static readonly COMMAND_LINE_INPUT_CLASS = 'ml-cli-text'

  constructor(private readonly view: AcTrView2d) {}

  /**
   * Handles a document `keydown` event for global view shortcuts.
   *
   * @returns `true` when the event was consumed and default action prevented.
   */
  handleKeyDown(e: KeyboardEvent): boolean {
    const undoRedoShortcut = this.resolveUndoRedoShortcut(e)
    const ignoreEditableTarget = this.shouldIgnoreEditableTargetShortcut(e)

    if (ignoreEditableTarget && !undoRedoShortcut) {
      return false
    }

    if (undoRedoShortcut) {
      if (
        !this.shouldHandleUndoRedoShortcut(e) ||
        AcEdMTextEditor.getActiveInputBox() ||
        this.view.editor.isActive
      ) {
        return false
      }

      AcApDocManager.instance.sendStringToExecute(undoRedoShortcut)
      e.preventDefault()
      return true
    }

    switch (e.code) {
      case 'Escape':
        this.view.selectionSet.clear()
        return false

      case 'Delete':
      case 'Backspace':
        // Only dispatch erase when no command is currently active.
        // Dispatching erase mid-command (e.g. while LINE awaits the next
        // point) corrupts the active command's input pipeline because
        // sendStringToExecute clears scripted inputs unconditionally.
        if (!this.view.editor.isActive) {
          AcApDocManager.instance.sendStringToExecute('erase')
        }
        return false
    }

    return false
  }

  private resolveUndoRedoShortcut(
    e: Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey'>
  ): AcEdUndoRedoShortcut | null {
    if (!e.ctrlKey && !e.metaKey) {
      return null
    }

    if (e.code === 'KeyY') {
      return 'redo'
    }

    if (e.code === 'KeyZ') {
      return e.shiftKey ? 'redo' : 'undo'
    }

    return null
  }

  private shouldIgnoreEditableTargetShortcut(
    e: Pick<KeyboardEvent, 'target' | 'isComposing' | 'keyCode'>
  ): boolean {
    if (e.isComposing || e.keyCode === 229) {
      return true
    }

    const target = e.target as HTMLElement | null
    if (target?.tagName === 'TEXTAREA') {
      return true
    }

    if (target?.isContentEditable) {
      return true
    }

    return target?.tagName === 'INPUT'
  }

  private shouldHandleUndoRedoShortcut(
    e: Pick<KeyboardEvent, 'target' | 'isComposing' | 'keyCode'>
  ): boolean {
    if (e.isComposing || e.keyCode === 229) {
      return false
    }

    const target = e.target as HTMLElement | null
    if (target?.tagName === 'TEXTAREA') {
      return false
    }

    if (target?.isContentEditable) {
      return false
    }

    if (target?.tagName === 'INPUT') {
      const input = target as HTMLInputElement
      if (
        input.classList.contains(AcEdViewKeyHandler.COMMAND_LINE_INPUT_CLASS)
      ) {
        return input.value.trim() === '' && !input.readOnly
      }
      return false
    }

    return true
  }
}

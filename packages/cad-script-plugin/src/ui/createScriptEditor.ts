import {
  acceptCompletion,
  ifNotIn,
  nextSnippetField,
  prevSnippetField
} from '@codemirror/autocomplete'
import { indentLess, indentMore } from '@codemirror/commands'
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript'
import { indentUnit } from '@codemirror/language'
import { Compartment, EditorState, Prec } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import {
  EditorView,
  keymap,
  placeholder as placeholderExtension,
  tooltips
} from '@codemirror/view'
import { basicSetup } from 'codemirror'

import { cadCompletionSource } from './cadScriptCompletions'

/** Strings CodeMirror should not complete inside. */
const SKIP_COMPLETION = [
  'LineComment',
  'BlockComment',
  'String',
  'TemplateString',
  'RegExp'
]

export interface ScriptEditor {
  /** Current script text. */
  readonly value: string
  /**
   * Sets the empty-editor hint.
   *
   * @param text - Placeholder shown before the user types.
   */
  setPlaceholder(text: string): void
  /**
   * Sets the accessible name of the editor.
   *
   * @param text - Label announced for the editor.
   */
  setAriaLabel(text: string): void
  /**
   * Replaces the whole script.
   *
   * @param text - New function body.
   */
  setValue(text: string): void
  /** Moves focus into the editor. */
  focus(): void
  /** Removes the editor from the page. */
  destroy(): void
  /**
   * Switches the editor between the light and dark color schemes.
   *
   * @param theme - Active viewer theme.
   */
  setTheme(theme: ScriptEditorTheme): void
}

/** Viewer color scheme the script editor can follow. */
export type ScriptEditorTheme = 'light' | 'dark'

/**
 * Light editor chrome. Syntax colors come from CodeMirror's default highlight
 * style. Dark mode uses {@link oneDark} instead.
 */
const lightEditorTheme = EditorView.theme(
  {
    '&': {
      color: 'var(--ml-ui-text, #303133)',
      backgroundColor: 'var(--ml-ui-bg, #fff)'
    },
    '.cm-content': {
      caretColor: 'var(--ml-ui-text, #303133)'
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: 'var(--ml-ui-text, #303133)'
    },
    '.cm-gutters': {
      backgroundColor: 'var(--ml-ui-bg, #fff)',
      color: 'var(--ml-ui-text-muted, #606266)',
      borderRight: '1px solid var(--ml-ui-border, #dcdfe6)'
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent'
    },
    '.cm-tooltip': {
      backgroundColor: 'var(--ml-ui-bg, #fff)',
      color: 'var(--ml-ui-text, #303133)',
      border: '1px solid var(--ml-ui-border, #dcdfe6)'
    }
  },
  { dark: false }
)

function editorTheme(theme: ScriptEditorTheme) {
  return theme === 'dark' ? oneDark : lightEditorTheme
}

/**
 * Mounts a JavaScript editor with completion for the `cad` host.
 *
 * CodeMirror supplies highlighting, snippets, and the completion popup.
 *
 * @param parent - Element that fills the editor area.
 * @param doc - Initial script text.
 * @param onChange - Called after the text changes.
 * @param onRun - Called for Ctrl/Cmd+Enter.
 * @param theme - Initial color scheme. Later changes go through {@link ScriptEditor.setTheme}.
 * @returns Controls used by the script panel.
 */
export function createScriptEditor(
  parent: HTMLElement,
  doc: string,
  onChange: () => void,
  onRun: () => void,
  theme: ScriptEditorTheme
): ScriptEditor {
  const placeholderConfig = new Compartment()
  const ariaConfig = new Compartment()
  const themeConfig = new Compartment()
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        basicSetup,
        themeConfig.of(editorTheme(theme)),
        tooltips({ parent: document.body }),
        javascript(),
        javascriptLanguage.data.of({
          autocomplete: ifNotIn(SKIP_COMPLETION, cadCompletionSource)
        }),
        indentUnit.of('  '),
        EditorState.tabSize.of(2),
        EditorView.lineWrapping,
        placeholderConfig.of(placeholderExtension('')),
        ariaConfig.of(
          EditorView.contentAttributes.of({
            spellcheck: 'false'
          })
        ),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': {
            fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
            fontSize: '12px',
            lineHeight: '1.5'
          },
          '.cm-content': { minHeight: '100%' },
          '&.cm-focused': { outline: 'none' }
        }),
        EditorView.updateListener.of(update => {
          if (update.docChanged) onChange()
        }),
        Prec.highest(
          keymap.of([
            {
              key: 'Mod-Enter',
              run() {
                onRun()
                return true
              }
            },
            {
              key: 'Tab',
              run: target =>
                acceptCompletion(target) ||
                nextSnippetField(target) ||
                indentMore(target),
              shift: target => prevSnippetField(target) || indentLess(target)
            }
          ])
        )
      ]
    })
  })

  return {
    get value() {
      return view.state.doc.toString()
    },
    setPlaceholder(text: string) {
      view.dispatch({
        effects: placeholderConfig.reconfigure(placeholderExtension(text))
      })
    },
    setAriaLabel(text: string) {
      view.dispatch({
        effects: ariaConfig.reconfigure(
          EditorView.contentAttributes.of({
            'aria-label': text,
            spellcheck: 'false'
          })
        )
      })
    },
    setValue(text: string) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
        selection: { anchor: 0 }
      })
    },
    focus() {
      view.focus()
    },
    setTheme(next: ScriptEditorTheme) {
      view.dispatch({
        effects: themeConfig.reconfigure(editorTheme(next))
      })
    },
    destroy() {
      view.destroy()
    }
  }
}

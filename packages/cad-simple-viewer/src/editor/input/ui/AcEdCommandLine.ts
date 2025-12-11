import { AcApDocManager } from '../../../app'
import { AcApI18n } from '../../../i18n'
import { AcEdCommandStack } from '../../command'

/**
 * AutoCAD-style floating command line with Promise-based execution.
 *
 * Features:
 *  - Floating command bar with left terminal glyph + down toggle and right up toggle
 *  - Command history popup
 *  - Message panel above the bar
 *  - Enter repeats last command if input empty
 *  - Esc cancels current command
 *  - Inline clickable options
 *  - Keyboard navigation
 *  - Promise-based execution for async command handling
 *  - Auto-complete popup for matching commands
 */
export class AcEdCommandLine {
  container: HTMLElement
  history: string[]
  historyIndex: number
  lastExecuted: string | null
  isCmdPopupOpen: boolean
  isMsgPanelOpen: boolean
  minWidth: number
  widthRatio: number
  cliContainer!: HTMLDivElement
  wrapper!: HTMLDivElement
  bar!: HTMLDivElement
  leftGroup!: HTMLDivElement
  termGlyph!: HTMLDivElement
  downBtn!: HTMLButtonElement
  input!: HTMLDivElement
  upBtn!: HTMLButtonElement
  cmdPopup!: HTMLDivElement
  msgPanel!: HTMLDivElement
  autoCompleteIndex: number

  constructor(container: HTMLElement = document.body) {
    this.container = container
    this.history = []
    this.historyIndex = -1
    this.lastExecuted = null
    this.isCmdPopupOpen = false
    this.isMsgPanelOpen = false
    this.minWidth = 420
    this.widthRatio = 0.66
    this.autoCompleteIndex = -1

    this.injectCSS()
    this.createUI()
    this.bindEvents()
    this.resizeHandler()
    window.addEventListener('resize', () => this.resizeHandler())
    AcApI18n.events.localeChanged.addEventListener(() => this.refreshLocale())
  }

  /** Visibility of the command line */
  get visible(): boolean {
    return this.cliContainer.style.display !== 'none'
  }

  set visible(val: boolean) {
    this.cliContainer.style.display = val ? 'block' : 'none'
  }

  /**
   * Localize a text key using AcApI18n.t().
   *
   * This helper centralizes localization calls for the class and makes
   * it easier to adjust localization behavior in one place if needed.
   *
   * @param key - Localization key (flat key style, e.g. "command.placeholder")
   * @param defaultText - Default English (or fallback) text to use if the key is missing
   * @returns localized string from AcApI18n or the provided defaultText
   *
   * @example
   * ```ts
   * const placeholder = this.localize('main.commandLine.placeholder', 'Type command')
   * ```
   */
  private localize(key: string, defaultText?: string): string {
    return AcApI18n.t(key, { fallback: defaultText })
  }

  /** Refresh all messages when locale changes */
  private refreshLocale() {
    Array.from(this.msgPanel.children).forEach(child => {
      const div = child as HTMLDivElement
      const key = div.dataset.msgKey
      if (key) {
        if (key === 'main.commandLine.executed') {
          // Preserve the command name part
          const cmdName = div.textContent?.split(':')[1]?.trim() ?? ''
          div.textContent = `${this.localize(key)}: ${cmdName}`
        } else if (key === 'main.commandLine.unknownCommand') {
          const cmd = div.textContent?.split(':')[1]?.trim() ?? ''
          div.textContent = `${this.localize(key)}: ${cmd}`
        } else {
          div.textContent = this.localize(key)
        }
      }
    })

    // Refresh input placeholder
    this.input.setAttribute(
      'data-placeholder',
      this.localize('main.commandLine.placeholder')
    )

    // Refresh button titles
    this.downBtn.title = this.localize('main.commandLine.showHistory')
    this.upBtn.title = this.localize('main.commandLine.showMessages')
  }

  /**
   * Execute a command line string.
   * Returns a Promise that resolves when the command is completed.
   * @param cmdLine - Command string
   * @returns Promise<void>
   */
  executeCommand(cmdLine: string) {
    if (!cmdLine || !cmdLine.trim()) {
      if (this.lastExecuted) cmdLine = this.lastExecuted
      else {
        this.printMessage(
          this.localize('main.commandLine.noLast', '(no last command)')
        )
        return
      }
    }

    const command = this.resolveCommand(cmdLine)
    if (!command) {
      const unknown = this.localize('main.commandLine.unknownCommand')
      this.printError(`${unknown}: ${cmdLine}`)
      return
    }

    this.history.push(command.globalName)
    this.historyIndex = this.history.length
    this.lastExecuted = command.globalName

    this.printHistoryLine(cmdLine)
    const executed = this.localize('main.commandLine.executed')
    this.printMessage(`${executed}: ${command.localName}`)

    AcApDocManager.instance.sendStringToExecute(cmdLine)
    this.renderCommandLine('')
  }

  /** Inject CSS styles */
  injectCSS() {
    const style = document.createElement('style')
    style.textContent = `
      .ml-cli-container {
        position: fixed;
        bottom: 45px;
        left: 50%;
        transform: translateX(-50%);
        font-family: "Segoe UI", Arial, sans-serif;
        font-size: 13px;
        box-sizing: border-box;
        user-select: none;
      }

      .ml-cli-bar {
        display: flex;
        align-items: center;
        gap: 6px;
        border-radius: 6px;
        background: linear-gradient(#ededed, #e0e0e0);
        border: 1px solid rgba(0, 0, 0, 0.35);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
        min-width: 300px;
        height: 30px;
      }

      .ml-cli-left {
        display: flex;
        align-items: center;
        gap: 4px;
        background: rgba(0, 0, 0, 0.06);
        border-radius: 4px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        height: 100%;
      }

      .ml-cli-term {
        width: 18px;
        height: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 3px;
        border: 1px solid rgba(0, 0, 0, 0.15);
        font-weight: 700;
        color: #222;
        font-size: 12px;
      }

      .ml-cli-down,
      .ml-cli-up {
        width: 16px;
        height: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 3px;
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 16px;
        color: #222;
        padding: 0;
      }

      .ml-cli-up {
        transform: rotate(180deg);
        transform-origin: center;
      }

      .ml-cli-right {
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.06);
        border-radius: 4px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        height: 100%;
      }

      .ml-cli-input {
        flex: 1;
        display: flex;
        align-items: center;
        min-height: 22px;
        padding: 0 6px;
        border-radius: 3px;
        background: transparent;
        outline: none;
        border: none;
        font-family: monospace;
        color: #333;
        white-space: nowrap;
        overflow: hidden;
        line-height: normal;
      }

      .ml-cli-input[data-placeholder]:empty:before {
        content: attr(data-placeholder);
        color: #9a9a9a;
        font-weight: 400;
        display: flex;
        align-items: center;
        height: 100%;
      }

      .ml-cli-option {
        display: inline-block;
        color: #222;
        background: #f7f7f7;
        border: 1px solid rgba(0, 0, 0, 0.06);
        padding: 2px 6px;
        border-radius: 3px;
        margin: 0 4px;
        cursor: pointer;
        font-size: 12px;
      }

      .ml-cli-option:hover {
        background: #eaeaea;
      }

      .ml-cli-cmd-popup {
        position: absolute;
        bottom: 100%;
        left: 0;
        transform: translate(0, 0);
        max-height: 220px;
        overflow-y: auto;
        background: #333;
        border: 1px solid rgba(0, 0, 0, 0.5);
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
        border-radius: 4px;
        padding: 6px 0;
        color: #fff;
      }

      .ml-cli-cmd-popup .item {
        padding: 8px 14px;
        cursor: pointer;
        color: #fff;
        font-size: 14px;
      }

      .ml-cli-cmd-popup .item:hover {
        background: #444;
      }

      .ml-cli-msg-panel {
        position: absolute;
        bottom: 100%;
        left: 0;
        transform: translate(0, 0);
        max-height: 340px;
        overflow-y: auto;
        background: #333;
        border: 1px solid rgba(0, 0, 0, 0.5);
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
        border-radius: 4px;
        padding: 6px 0;
        font-family: "Microsoft YaHei", Arial, sans-serif;
        color: #fff;
        font-size: 14px;
        white-space: pre-wrap;
        line-height: 1.35;
      }

      .ml-cli-history-line {
        padding: 4px 6px;
        color: #fff;
      }

      .ml-cli-msg-error {
        color: #ff5555;
      }

      .ml-cli-wrapper {
        position: relative;
        width: 100%;
      }

      .hidden {
        display: none !important;
      }

      .ml-cli-cmd-popup::-webkit-scrollbar,
      .ml-cli-msg-panel::-webkit-scrollbar {
        width: 10px;
      }

      .ml-cli-cmd-popup::-webkit-scrollbar-thumb,
      .ml-cli-msg-panel::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 6px;
      }
    `
    document.head.appendChild(style)
  }

  /** Create the command line UI elements */
  createUI() {
    this.cliContainer = document.createElement('div')
    this.cliContainer.className = 'ml-cli-container'
    this.wrapper = document.createElement('div')
    this.wrapper.className = 'ml-cli-wrapper'
    this.cliContainer.appendChild(this.wrapper)

    this.bar = document.createElement('div')
    this.bar.className = 'ml-cli-bar'
    this.wrapper.appendChild(this.bar)

    this.leftGroup = document.createElement('div')
    this.leftGroup.className = 'ml-cli-left'
    this.bar.appendChild(this.leftGroup)

    this.termGlyph = document.createElement('div')
    this.termGlyph.className = 'ml-cli-term'
    this.termGlyph.textContent = '>'
    this.leftGroup.appendChild(this.termGlyph)

    this.downBtn = document.createElement('button')
    this.downBtn.className = 'ml-cli-down'
    this.downBtn.title = this.localize('main.commandLine.showHistory')
    this.downBtn.innerHTML = '&#9662;'
    this.leftGroup.appendChild(this.downBtn)

    this.input = document.createElement('div')
    this.input.className = 'ml-cli-input'
    this.input.contentEditable = 'true'
    this.input.setAttribute('spellcheck', 'false')
    this.input.setAttribute(
      'data-placeholder',
      this.localize('main.commandLine.placeholder')
    )
    this.bar.appendChild(this.input)

    const rightGroup = document.createElement('div')
    rightGroup.className = 'ml-cli-right'
    this.bar.appendChild(rightGroup)

    this.upBtn = document.createElement('button')
    this.upBtn.className = 'ml-cli-up'
    this.upBtn.title = this.localize('main.commandLine.showMessages')
    this.upBtn.innerHTML = '&#9662;'
    rightGroup.appendChild(this.upBtn)

    this.cmdPopup = document.createElement('div')
    this.cmdPopup.className = 'ml-cli-cmd-popup hidden'
    this.wrapper.appendChild(this.cmdPopup)

    this.msgPanel = document.createElement('div')
    this.msgPanel.className = 'ml-cli-msg-panel hidden'
    this.wrapper.appendChild(this.msgPanel)

    this.container.appendChild(this.cliContainer)
  }

  /** Bind event listeners */
  bindEvents() {
    this.downBtn.addEventListener('click', e => {
      e.stopPropagation()
      this.isCmdPopupOpen = !this.isCmdPopupOpen
      this.updatePopups({ showCmd: this.isCmdPopupOpen, showMsg: false })
      if (this.isCmdPopupOpen) this.showCommandHistoryPopup()
    })

    this.upBtn.addEventListener('click', e => {
      e.stopPropagation()
      this.isMsgPanelOpen = !this.isMsgPanelOpen
      this.updatePopups({ showCmd: false, showMsg: this.isMsgPanelOpen })
      if (this.isMsgPanelOpen) this.showMessagePanel()
    })

    document.addEventListener('click', e => {
      if (!this.cliContainer.contains(e.target as Node)) {
        this.updatePopups({ showCmd: false, showMsg: false })
      }
    })

    this.input.addEventListener('keydown', e => this.handleKeyDown(e))
    this.input.addEventListener('keydown', e => this.handleArrowKeys(e))
    this.input.addEventListener('input', () => this.handleInputChange())
    this.input.addEventListener('focus', () =>
      this.updatePopups({ showCmd: false, showMsg: false })
    )

    this.cmdPopup.addEventListener('click', e => {
      const item = (e.target as HTMLElement).closest('.item') as HTMLElement
      if (item) {
        this.setInputText(item.dataset.value || '')
        this.input.focus()
        this.updatePopups({ showCmd: false, showMsg: false })
      }
    })
  }

  /** Handle Enter/Escape keys */
  handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const text = this.getInputText()
      this.executeCommand(text)
      this.updatePopups({ showCmd: false, showMsg: false })
    } else if (e.key === 'Escape') {
      e.preventDefault()
      this.setInputText('')
      this.printMessage(this.localize('main.commandLine.canceled'))
      this.updatePopups({ showCmd: false, showMsg: false })
    }
  }

  /** Handle Up/Down keys for history or auto-complete */
  handleArrowKeys(e: KeyboardEvent) {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (this.isCmdPopupOpen) this.navigateAutoComplete(-1)
      else this.navigateHistory(-1)
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (this.isCmdPopupOpen) this.navigateAutoComplete(1)
      else this.navigateHistory(1)
    }
  }

  /** Handle input change to show auto-complete */
  handleInputChange() {
    const text = this.getInputText()
    if (!text) {
      this.updatePopups({ showCmd: false })
      return
    }

    const matches = AcEdCommandStack.instance.searchCommandsByPrefix(text)
    if (matches.length) {
      this.autoCompleteIndex = -1
      this.cmdPopup.innerHTML = ''
      matches.forEach((item, idx) => {
        const div = document.createElement('div')
        div.className = 'item'
        div.dataset.value = item.command.globalName
        const description = AcApI18n.cmdDescription(
          item.commandGroup,
          item.command.globalName
        )
        div.innerHTML = `<strong>${item.command.globalName} - ${description}</strong>`
        if (idx === this.autoCompleteIndex) div.classList.add('selected')
        this.cmdPopup.appendChild(div)
      })
      this.updatePopups({ showCmd: true })
    } else {
      this.updatePopups({ showCmd: false })
    }
  }

  /** Navigate auto-complete list with arrow keys */
  navigateAutoComplete(dir: number) {
    const items = Array.from(
      this.cmdPopup.querySelectorAll('.item')
    ) as HTMLElement[]

    if (!items.length) return

    this.autoCompleteIndex += dir
    if (this.autoCompleteIndex < 0) this.autoCompleteIndex = 0
    if (this.autoCompleteIndex >= items.length)
      this.autoCompleteIndex = items.length - 1

    items.forEach((el, idx) => {
      el.classList.toggle('selected', idx === this.autoCompleteIndex)
    })

    const selected = items[this.autoCompleteIndex]
    if (selected) {
      this.setInputText(selected.dataset.value ?? '')
    }
  }

  /** Navigate command history */
  navigateHistory(dir: number) {
    if (!this.history.length) return
    if (this.historyIndex === -1) this.historyIndex = this.history.length
    this.historyIndex += dir
    if (this.historyIndex < 0) this.historyIndex = 0
    if (this.historyIndex > this.history.length)
      this.historyIndex = this.history.length
    if (this.historyIndex >= 0 && this.historyIndex < this.history.length) {
      this.setInputText(this.history[this.historyIndex])
    } else {
      this.setInputText('')
    }
  }

  /** Get current input text */
  getInputText(): string {
    const clone = this.input.cloneNode(true) as HTMLElement
    clone.querySelectorAll('.ml-cli-option').forEach(n => n.remove())
    return clone.innerText.replace(/\u00A0/g, ' ').trim()
  }

  /** Set input text */
  setInputText(text = '') {
    this.input.innerHTML = ''
    if (text) this.input.appendChild(document.createTextNode(text + ' '))
    this.setCursorToEnd()
  }

  /** Render command line with options */
  renderCommandLine(cmd: string, options: string[] = []) {
    this.input.innerHTML = ''
    if (cmd) this.input.appendChild(document.createTextNode(cmd + ' '))
    options.forEach(opt => {
      const span = document.createElement('span')
      span.className = 'ml-cli-option'
      span.textContent = opt
      span.addEventListener('click', e => {
        e.stopPropagation()
        this.insertOption(opt)
      })
      this.input.appendChild(span)
      this.input.appendChild(document.createTextNode(' '))
    })
    this.setCursorToEnd()
    this.input.focus()
  }

  /** Insert option into input */
  insertOption(opt: string) {
    this.input.appendChild(document.createTextNode(opt + ' '))
    this.setCursorToEnd()
    this.input.focus()
  }

  /** Move cursor to end of input */
  setCursorToEnd() {
    const range = document.createRange()
    range.selectNodeContents(this.input)
    range.collapse(false)
    const sel = window.getSelection()
    if (!sel) return
    sel.removeAllRanges()
    sel.addRange(range)
    this.input.scrollLeft = this.input.scrollWidth
  }

  /** Resolve command name */
  resolveCommand(cmdLine: string) {
    const parts = cmdLine.trim().split(/\s+/)
    const cmdStr = parts[0].toUpperCase()
    // TODO: Should look up local cmd too
    return AcEdCommandStack.instance.lookupLocalCmd(cmdStr)
  }

  /** Show or hide popups */
  updatePopups({ showCmd = false, showMsg = false } = {}) {
    this.isCmdPopupOpen = showCmd
    this.isMsgPanelOpen = showMsg
    this.cmdPopup.classList.toggle('hidden', !showCmd)
    this.msgPanel.classList.toggle('hidden', !showMsg)
    if (showCmd) this.positionCmdPopup()
    if (showMsg) this.positionMsgPanel()
  }

  /** Show command history popup */
  showCommandHistoryPopup() {
    this.cmdPopup.innerHTML = ''
    if (!this.history.length) {
      const empty = document.createElement('div')
      empty.className = 'item'
      empty.textContent = this.localize('main.commandLine.noHistory')
      this.cmdPopup.appendChild(empty)
    } else {
      for (let i = this.history.length - 1; i >= 0; i--) {
        const item = document.createElement('div')
        item.className = 'item'
        item.dataset.value = this.history[i]
        item.textContent = this.history[i]
        this.cmdPopup.appendChild(item)
      }
    }
    this.positionCmdPopup()
  }

  /** Position command history popup */
  positionCmdPopup() {
    this.cmdPopup.style.left = '0px'
    this.cmdPopup.style.width = this.bar.offsetWidth + 'px'
  }

  /** Show message panel */
  showMessagePanel() {
    // If there is no message history, show a localized "no history" placeholder
    if (!this.msgPanel.children.length) {
      const empty = document.createElement('div')
      empty.className = 'ml-cli-history-line'
      empty.textContent = this.localize('main.commandLine.noHistory')
      empty.dataset.msgKey = 'main.commandLine.noHistory'
      this.msgPanel.appendChild(empty)
    }

    this.msgPanel.scrollTop = this.msgPanel.scrollHeight
    this.positionMsgPanel()
  }

  /** Position message panel */
  positionMsgPanel() {
    this.msgPanel.style.width = this.bar.offsetWidth + 'px'
  }

  /** Remove "no history" placeholder if present */
  private clearNoHistoryPlaceholder() {
    Array.from(this.msgPanel.children).forEach(child => {
      const div = child as HTMLDivElement
      if (div.dataset.msgKey === 'main.commandLine.noHistory') {
        this.msgPanel.removeChild(div)
      }
    })
  }

  /** Print message to message panel with optional localization key */
  printMessage(msg: string, msgKey?: string) {
    this.clearNoHistoryPlaceholder()
    const div = document.createElement('div')
    div.className = 'ml-cli-history-line'
    div.textContent = msg
    if (msgKey) div.dataset.msgKey = msgKey
    this.msgPanel.appendChild(div)
    this.showMessagePanel()
  }

  /** Print error message with optional localization key */
  printError(msg: string, msgKey?: string) {
    this.clearNoHistoryPlaceholder()
    const div = document.createElement('div')
    div.className = 'ml-cli-history-line ml-cli-msg-error'
    div.textContent = msg
    if (msgKey) div.dataset.msgKey = msgKey
    this.msgPanel.appendChild(div)
    this.showMessagePanel()
  }

  /** Print executed command line to history */
  printHistoryLine(cmdLine: string) {
    this.clearNoHistoryPlaceholder()
    const div = document.createElement('div')
    div.className = 'ml-cli-history-line'
    div.textContent = '> ' + cmdLine
    // For executed command messages, also store msgKey
    div.dataset.msgKey = 'main.commandLine.executed'
    this.msgPanel.appendChild(div)
    this.showMessagePanel()
  }

  /** Handle window resize */
  resizeHandler() {
    // Calculate desired width based on ratio and minimum width
    let w = Math.max(this.minWidth, window.innerWidth * this.widthRatio)
    // Clamp width so it never exceeds the window width
    w = Math.min(w, window.innerWidth - 20) // optional 20px margin from edges
    this.bar.style.width = w + 'px'

    // Reposition popups to match new width
    this.positionMsgPanel()
    this.positionCmdPopup()
  }
}

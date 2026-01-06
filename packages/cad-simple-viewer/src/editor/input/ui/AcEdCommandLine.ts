import { AcApDocManager, AcApSettingManager } from '../../../app'
import { AcApI18n } from '../../../i18n'
import { AcEdCommandStack } from '../../command'
import { AcEdPromptKeywordOptions } from '../prompt'
import { AcEdKeywordSession } from '../session'

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
  private container: HTMLElement
  private history: string[]
  private historyIndex: number
  private lastExecuted: string | null
  private isCmdPopupOpen: boolean
  private isMsgPanelOpen: boolean
  private minWidth: number
  private widthRatio: number
  private cliContainer!: HTMLDivElement
  private wrapper!: HTMLDivElement
  private bar!: HTMLDivElement
  private leftGroup!: HTMLDivElement
  private closeBtn!: HTMLDivElement // renamed from termGlyph
  private downBtn!: HTMLButtonElement
  private centerEl!: HTMLDivElement
  private promptEl!: HTMLDivElement
  private textInput!: HTMLInputElement
  private upBtn!: HTMLButtonElement
  private cmdPopup!: HTMLDivElement
  private msgPanel!: HTMLDivElement
  private autoCompleteIndex: number
  private activeSession?: AcEdKeywordSession

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

  setPrompt(message?: string) {
    this.promptEl.innerHTML = message ?? ''
    this.textInput.placeholder = ''
  }

  clear() {
    this.clearPrompt()
    this.clearInput()
  }

  clearPrompt() {
    this.promptEl.innerHTML = ''
    this.textInput.placeholder = this.localize('main.commandLine.placeholder')
  }

  clearInput() {
    this.textInput.value = ''
  }

  focusInput() {
    this.textInput.focus()
  }

  async getKeywords(options: AcEdPromptKeywordOptions): Promise<string> {
    this.activeSession = new AcEdKeywordSession(this, options)
    const result = await this.activeSession.start()
    this.activeSession = undefined
    return result
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
    this.centerEl.setAttribute(
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
    this.clearInput()
  }

  /** Inject CSS styles */
  private injectCSS() {
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

      .ml-cli-close-btn {
        width: 18px;
        height: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: #222;
        font-size: 12px;
        background: transparent;
        cursor: pointer;
        padding: 0;
      }

      .ml-cli-close-btn:hover {
        background: rgba(0,0,0,0.10);
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

      .ml-cli-center {
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;
        color: #333;
        height: 100%; 
      }

      .ml-cli-prompt,
      .ml-cli-text {
        font-family: Consolas, "Courier New", monospace;
      }

      .ml-cli-prompt {
        display: flex;
        align-items: center;
        white-space: nowrap;
        user-select: none;
        margin-right: 4px;
        line-height: 1;
      }

      .ml-cli-text {
        flex: 1;
        height: 100%;
        border: none;
        outline: none;
        background: transparent;

        font-size: 13px;
        line-height: 1;
        padding: 0;
        margin: 0;

        display: flex;
        align-items: center;
        color: #333;
      }

      .ml-cli-option {
        display: inline-block;
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
  private createUI() {
    this.cliContainer = document.createElement('div')
    this.cliContainer.className = 'ml-cli-container'

    this.wrapper = document.createElement('div')
    this.wrapper.className = 'ml-cli-wrapper'
    this.cliContainer.appendChild(this.wrapper)

    this.bar = document.createElement('div')
    this.bar.className = 'ml-cli-bar'
    this.wrapper.appendChild(this.bar)

    /* ---------- left group ---------- */
    this.leftGroup = document.createElement('div')
    this.leftGroup.className = 'ml-cli-left'
    this.bar.appendChild(this.leftGroup)

    this.closeBtn = document.createElement('div')
    this.closeBtn.className = 'ml-cli-close-btn'
    this.closeBtn.innerHTML = '&#10005;'
    this.leftGroup.appendChild(this.closeBtn)

    this.downBtn = document.createElement('button')
    this.downBtn.className = 'ml-cli-down'
    this.downBtn.innerHTML = '&#9662;'
    this.leftGroup.appendChild(this.downBtn)

    /* ---------- center (prompt + input) ---------- */
    this.centerEl = document.createElement('div')
    this.centerEl.className = 'ml-cli-center'
    this.bar.appendChild(this.centerEl)

    this.promptEl = document.createElement('div')
    this.promptEl.className = 'ml-cli-prompt'
    this.centerEl.appendChild(this.promptEl)

    this.textInput = document.createElement('input')
    this.textInput.className = 'ml-cli-text'
    this.textInput.type = 'text'
    this.textInput.spellcheck = false
    this.textInput.autocomplete = 'off'
    this.textInput.placeholder = this.localize('main.commandLine.placeholder')
    this.centerEl.appendChild(this.textInput)

    /* ---------- right group ---------- */
    const rightGroup = document.createElement('div')
    rightGroup.className = 'ml-cli-right'
    this.bar.appendChild(rightGroup)

    this.upBtn = document.createElement('button')
    this.upBtn.className = 'ml-cli-up'
    this.upBtn.innerHTML = '&#9662;'
    rightGroup.appendChild(this.upBtn)

    /* ---------- popups ---------- */
    this.cmdPopup = document.createElement('div')
    this.cmdPopup.className = 'ml-cli-cmd-popup hidden'
    this.wrapper.appendChild(this.cmdPopup)

    this.msgPanel = document.createElement('div')
    this.msgPanel.className = 'ml-cli-msg-panel hidden'
    this.wrapper.appendChild(this.msgPanel)

    this.container.appendChild(this.cliContainer)
  }

  /** Bind event listeners */
  private bindEvents() {
    // Close command line when clicking the button
    this.closeBtn.addEventListener('click', e => {
      e.stopPropagation()
      this.visible = false
      AcApSettingManager.instance.isShowCommandLine = false
    })

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

    this.textInput.addEventListener('keydown', e => this.handleKeyDown(e))
    this.textInput.addEventListener('input', () => this.handleInputChange())
    this.centerEl.addEventListener('focus', () =>
      this.updatePopups({ showCmd: false, showMsg: false })
    )

    this.cmdPopup.addEventListener('click', e => {
      const item = (e.target as HTMLElement).closest('.item') as HTMLElement
      if (item) {
        this.setInputText(item.dataset.value || '')
        this.centerEl.focus()
        this.updatePopups({ showCmd: false, showMsg: false })
      }
    })
  }

  /** Handle Enter/Escape keys */
  private handleKeyDown(e: KeyboardEvent) {
    // IME / composition safety (important!)
    if (e.isComposing) return

    switch (e.key) {
      case 'Enter': {
        e.preventDefault()
        e.stopImmediatePropagation()

        if (this.activeSession) {
          const handled = this.activeSession.handleEnter(this.getInputText())
          if (!handled) {
            this.printError(this.localize('main.commandLine.invalidKeyword'))
          }
          return
        }

        this.executeCommand(this.getInputText())
        this.historyIndex = this.history.length
        this.updatePopups({ showCmd: false, showMsg: false })
        return
      }

      case 'Escape': {
        e.preventDefault()
        e.stopImmediatePropagation()

        if (this.activeSession) {
          this.activeSession.handleEscape()
          this.activeSession = undefined
          return
        }

        this.clear()
        this.printMessage(this.localize('main.commandLine.canceled'))
        this.updatePopups({ showCmd: false, showMsg: false })
        return
      }

      case 'ArrowUp': {
        e.preventDefault()
        if (this.isCmdPopupOpen) this.navigateAutoComplete(-1)
        else this.navigateHistory(-1)
        return
      }

      case 'ArrowDown': {
        e.preventDefault()
        if (this.isCmdPopupOpen) this.navigateAutoComplete(1)
        else this.navigateHistory(1)
        return
      }
    }
  }

  /** Handle input change to show auto-complete */
  private handleInputChange() {
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
  private navigateAutoComplete(dir: number) {
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
  private navigateHistory(dir: number) {
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
  private getInputText(): string {
    return this.textInput.value.trim()
  }

  /** Set input text */
  private setInputText(text = '') {
    this.textInput.value = text
    this.textInput.focus()
  }

  /** Render prompt message and keyword options in command line */
  renderKeywordPrompt(
    options: AcEdPromptKeywordOptions,
    onClick: (kw: string) => void
  ) {
    this.promptEl.innerHTML = ''

    if (options.message) {
      this.promptEl.append(options.message.trim() + ' ')
    }

    const keywords = options.keywords?.toArray().filter(k => k.visible) ?? []
    if (!keywords.length) return

    this.promptEl.append('[')

    keywords.forEach((kw, i) => {
      if (i > 0) this.promptEl.append('/')

      const span = document.createElement('span')
      span.className = 'ml-cli-option'
      span.textContent = kw.displayName

      if (!kw.enabled) {
        span.style.opacity = '0.45'
        span.style.pointerEvents = 'none'
      } else {
        span.onclick = () => onClick(kw.globalName)
      }

      this.promptEl.append(span)
    })

    this.promptEl.append(']: ')
  }

  /** Resolve command name */
  private resolveCommand(cmdLine: string) {
    const parts = cmdLine.trim().split(/\s+/)
    const cmdStr = parts[0].toUpperCase()
    // TODO: Should look up local cmd too
    return AcEdCommandStack.instance.lookupLocalCmd(cmdStr)
  }

  /** Show or hide popups */
  private updatePopups({ showCmd = false, showMsg = false } = {}) {
    this.isCmdPopupOpen = showCmd
    this.isMsgPanelOpen = showMsg
    this.cmdPopup.classList.toggle('hidden', !showCmd)
    this.msgPanel.classList.toggle('hidden', !showMsg)
    if (showCmd) this.positionCmdPopup()
    if (showMsg) this.positionMsgPanel()
  }

  /** Show command history popup */
  private showCommandHistoryPopup() {
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
  private positionCmdPopup() {
    this.cmdPopup.style.left = '0px'
    this.cmdPopup.style.width = this.bar.offsetWidth + 'px'
  }

  /** Show message panel */
  private showMessagePanel() {
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
  private positionMsgPanel() {
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
  private printMessage(msg: string, msgKey?: string) {
    this.clearNoHistoryPlaceholder()
    const div = document.createElement('div')
    div.className = 'ml-cli-history-line'
    div.textContent = msg
    if (msgKey) div.dataset.msgKey = msgKey
    this.msgPanel.appendChild(div)
    this.showMessagePanel()
  }

  /** Print error message with optional localization key */
  private printError(msg: string, msgKey?: string) {
    this.clearNoHistoryPlaceholder()
    const div = document.createElement('div')
    div.className = 'ml-cli-history-line ml-cli-msg-error'
    div.textContent = msg
    if (msgKey) div.dataset.msgKey = msgKey
    this.msgPanel.appendChild(div)
    this.showMessagePanel()
  }

  /** Print executed command line to history */
  private printHistoryLine(cmdLine: string) {
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
  private resizeHandler() {
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

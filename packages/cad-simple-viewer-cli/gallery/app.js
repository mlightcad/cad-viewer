const STORAGE_KEY = 'cad-simple-viewer-cli.examples.params'
const CUSTOM_ID = 'custom'

const DEFAULT_CUSTOM_SCRIPT = `; Custom .scr — one token / Enter per line
; Example: open blank, zoom extents, export PNG
zoom
e
pngout

2048
quit
`

const listEl = document.getElementById('list')
const emptyEl = document.getElementById('empty')
const detailEl = document.getElementById('detail')
const titleEl = document.getElementById('title')
const descriptionEl = document.getElementById('description')
const metaEl = document.getElementById('meta')
const scriptEl = document.getElementById('script')
const scriptEditEl = document.getElementById('script-edit')
const logEl = document.getElementById('log')
const runBtn = document.getElementById('run')
const copyBtn = document.getElementById('copy')
const statusEl = document.getElementById('status')
const inputFieldEl = document.getElementById('input-field')
const inputLabelEl = document.getElementById('input-label')
const inputPathEl = document.getElementById('input-path')
const inputHintEl = document.getElementById('input-hint')
const outputPathEl = document.getElementById('output-path')
const customKindFieldEl = document.getElementById('custom-kind-field')
const customModeFieldEl = document.getElementById('custom-mode-field')
const customInputKindEl = document.getElementById('custom-input-kind')
const customModeEl = document.getElementById('custom-mode')

/** @type {any | null} */
let catalog = null
/** @type {any | null} */
let selected = null
/** @type {string[]} */
let lastCommand = []

function customExample() {
  return {
    id: CUSTOM_ID,
    title: 'Custom script',
    description:
      'Write your own AutoCAD-style .scr, set input / output, and run it with the CLI.',
    script: 'tmp/examples-gallery/custom/custom.scr',
    mode: 'write',
    inputKind: 'none',
    runnable: true,
    kind: 'custom'
  }
}

function setStatus(text, kind = '') {
  statusEl.textContent = text
  statusEl.className = `status${kind ? ` ${kind}` : ''}`
}

function loadStoredParams() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveStoredParams(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

function getExampleParams(exampleId) {
  const all = loadStoredParams()
  return all[exampleId] || {}
}

function setExampleParams(exampleId, patch) {
  const all = loadStoredParams()
  all[exampleId] = { ...(all[exampleId] || {}), ...patch }
  saveStoredParams(all)
}

function isCustom(example = selected) {
  return example?.id === CUSTOM_ID || example?.kind === 'custom'
}

function inputKind(example) {
  if (isCustom(example)) {
    return customInputKindEl.value === 'file' ? 'file' : 'none'
  }
  return example.inputKind || (example.requiresInput ? 'file' : 'none')
}

function tagLabel(example) {
  if (example.runnable === false) return { text: 'docs only', muted: true }
  if (isCustom(example)) return { text: 'editable', muted: false }
  const kind = inputKind(example)
  if (kind === 'directory') return { text: 'needs folder', muted: false }
  if (kind === 'file') return { text: 'needs file', muted: false }
  return { text: 'no input', muted: false }
}

function defaultInputFor(example) {
  const kind = inputKind(example)
  if (kind === 'file') {
    return (
      catalog.fixtureDrawingRelative ||
      catalog.fixtureDrawing ||
      'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/data/canteen.dwg'
    )
  }
  return ''
}

function defaultOutputFor(example) {
  const base = (
    catalog.defaultOutputDirRelative ||
    catalog.defaultOutputDir ||
    'tmp/examples-gallery'
  ).replace(/[\\/]+$/, '')
  return `${base}/${example.id}`
}

/** Prefer package-relative paths (or keep http(s) URLs) in the form fields. */
function toPackageRelative(filePath) {
  if (!filePath) return ''
  const normalized = String(filePath).replace(/\\/g, '/')
  if (/^https?:\/\//i.test(normalized)) {
    return normalized
  }
  const isAbs =
    /^[A-Za-z]:\//.test(normalized) || normalized.startsWith('/')
  if (!isAbs) {
    return normalized.replace(/\/+/g, '/')
  }
  const root = (catalog.packageRoot || '')
    .replace(/\\/g, '/')
    .replace(/\/+$/, '')
  if (!root) return normalized
  const lowerRoot = root.toLowerCase()
  const lowerPath = normalized.toLowerCase()
  if (lowerPath === lowerRoot) return '.'
  if (lowerPath.startsWith(`${lowerRoot}/`)) {
    return normalized.slice(root.length + 1)
  }
  return normalized
}

function currentInput() {
  return inputPathEl.value.trim()
}

function currentOutput() {
  return outputPathEl.value.trim()
}

function currentCustomScript() {
  return scriptEditEl.value
}

function allExamples() {
  return [customExample(), ...(catalog?.examples || [])]
}

function renderList() {
  listEl.innerHTML = ''
  for (const example of allExamples()) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = `item${selected?.id === example.id ? ' active' : ''}`
    btn.dataset.id = example.id

    const title = document.createElement('span')
    title.className = 'item-title'
    title.textContent = example.title

    const desc = document.createElement('span')
    desc.className = 'item-desc'
    desc.textContent = example.description

    const tag = document.createElement('span')
    const info = tagLabel(example)
    tag.className = `item-tag${info.muted ? ' muted' : ''}`
    tag.textContent = info.text

    btn.append(title, desc, tag)
    btn.addEventListener('click', () => {
      void selectExample(example.id)
    })
    listEl.append(btn)
  }
}

function syncParamFields(example) {
  const stored = getExampleParams(example.id)
  const custom = isCustom(example)

  customKindFieldEl.classList.toggle('hidden', !custom)
  customModeFieldEl.classList.toggle('hidden', !custom)

  if (custom) {
    customInputKindEl.value =
      stored.inputKind === 'file' || stored.inputKind === 'none'
        ? stored.inputKind
        : 'none'
    customModeEl.value =
      stored.mode === 'read' || stored.mode === 'write'
        ? stored.mode
        : customInputKindEl.value === 'file'
          ? 'read'
          : 'write'
  }

  const kind = inputKind(example)

  if (kind === 'none') {
    inputFieldEl.classList.add('hidden')
    inputPathEl.value = ''
  } else {
    inputFieldEl.classList.remove('hidden')
    if (kind === 'directory') {
      inputLabelEl.textContent = 'Input directory'
      inputPathEl.placeholder = 'path/to/drawings'
      inputHintEl.textContent =
        'Folder of .dwg / .dxf files. Relative to the package root, or absolute.'
    } else {
      inputLabelEl.textContent = 'Input drawing'
      inputPathEl.placeholder =
        'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/data/canteen.dwg'
      inputHintEl.textContent =
        'Local path (relative to the package root or absolute) or an http(s) URL ending in .dxf / .dwg.'
    }
    inputPathEl.value = toPackageRelative(
      stored.input || defaultInputFor(example)
    )
  }

  outputPathEl.value = toPackageRelative(
    stored.output || defaultOutputFor(example)
  )
}

function persistCurrentFields() {
  if (!selected) return
  const patch = {
    input: currentInput() || undefined,
    output: currentOutput() || undefined
  }
  if (isCustom(selected)) {
    patch.inputKind = customInputKindEl.value
    patch.mode = customModeEl.value
    patch.script = currentCustomScript()
  }
  setExampleParams(selected.id, patch)
}

function setScriptEditable(editable, text) {
  if (editable) {
    scriptEl.classList.add('hidden')
    scriptEditEl.classList.remove('hidden')
    scriptEditEl.value = text
  } else {
    scriptEditEl.classList.add('hidden')
    scriptEl.classList.remove('hidden')
    scriptEl.textContent = text
  }
}

async function selectExample(id) {
  const example = allExamples().find(item => item.id === id)
  if (!example) return
  selected = example
  renderList()

  emptyEl.classList.add('hidden')
  detailEl.classList.remove('hidden')
  titleEl.textContent = example.title
  descriptionEl.textContent = example.description

  syncParamFields(example)

  const kind = inputKind(example)
  const bits = [`script: ${example.script}`]
  if (isCustom(example)) bits.unshift('custom')
  if (example.mode && !isCustom(example)) bits.push(`mode: ${example.mode}`)
  if (isCustom(example)) bits.push(`mode: ${customModeEl.value}`)
  if (kind === 'file') bits.push('needs input drawing')
  else if (kind === 'directory') bits.push('needs input directory')
  else bits.push('starts blank')
  if (example.kind === 'batch') bits.push('batch runner')
  metaEl.textContent = bits.join(' · ')

  runBtn.disabled = example.runnable === false || !catalog.cliBuilt
  copyBtn.disabled = false
  logEl.hidden = true
  logEl.textContent = ''

  if (isCustom(example)) {
    const stored = getExampleParams(CUSTOM_ID)
    setScriptEditable(true, stored.script || DEFAULT_CUSTOM_SCRIPT)
  } else {
    const scriptRes = await fetch(`/api/script/${encodeURIComponent(id)}`)
    const scriptJson = await scriptRes.json()
    setScriptEditable(false, scriptJson.text ?? '')
  }

  lastCommand = buildCommandPreview(example)
}

function buildCommandPreview(example) {
  const out = currentOutput() || defaultOutputFor(example)
  const kind = inputKind(example)
  const input = currentInput() || defaultInputFor(example) || '<input-path>'

  if (isCustom(example)) {
    const mode = customModeEl.value || 'write'
    const args = [
      'node',
      'dist/cli.js',
      '-s',
      'tmp/examples-gallery/custom/custom.scr',
      '-o',
      out,
      '--mode',
      mode
    ]
    if (kind === 'file') {
      args.splice(2, 0, '-i', input)
    }
    return args
  }

  if (example.kind === 'batch' || String(example.script).endsWith('.mjs')) {
    return ['node', `examples/${example.script}`, input, out]
  }

  const args = ['node', 'dist/cli.js', '-s', `examples/${example.script}`]
  if (example.mode) {
    args.push('--mode', example.mode)
  }
  args.push('-o', out)
  if (kind === 'file') {
    args.splice(2, 0, '-i', input)
  }
  return args
}

async function runSelected() {
  if (!selected || selected.runnable === false) return
  persistCurrentFields()
  runBtn.disabled = true
  setStatus(`Running ${selected.id}…`)
  logEl.hidden = false
  logEl.textContent = 'Running…'

  try {
    let res
    if (isCustom(selected)) {
      res = await fetch('/api/run-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: currentCustomScript(),
          input: currentInput() || undefined,
          output: currentOutput() || undefined,
          mode: customModeEl.value,
          inputKind: customInputKindEl.value
        })
      })
    } else {
      res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selected.id,
          input: currentInput() || undefined,
          output: currentOutput() || undefined
        })
      })
    }

    const json = await res.json()
    if (json.error) {
      setStatus(json.error, 'err')
      logEl.textContent = json.error
      return
    }
    lastCommand = json.command || lastCommand
    if (json.outputDir) {
      const relativeOut = toPackageRelative(json.outputDir)
      outputPathEl.value = relativeOut
      setExampleParams(selected.id, { output: relativeOut })
    }
    if (json.inputPath && inputKind(selected) !== 'none') {
      const relativeIn = toPackageRelative(json.inputPath)
      inputPathEl.value = relativeIn
      setExampleParams(selected.id, { input: relativeIn })
    }
    const lines = [
      `$ ${json.command.join(' ')}`,
      '',
      json.stdout || '(no stdout)',
      json.stderr ? `\n[stderr]\n${json.stderr}` : '',
      '',
      json.savedFiles?.length
        ? `Saved:\n${json.savedFiles.map(f => `  ${f}`).join('\n')}`
        : 'No files captured.',
      `exit: ${json.exitCode}`
    ]
    logEl.textContent = lines.filter(Boolean).join('\n')
    setStatus(
      json.ok ? `Finished ${selected.id}` : `Failed ${selected.id}`,
      json.ok ? 'ok' : 'err'
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    setStatus(message, 'err')
    logEl.textContent = message
  } finally {
    runBtn.disabled = selected.runnable === false || !catalog.cliBuilt
  }
}

async function copyCommand() {
  if (!selected) return
  persistCurrentFields()
  lastCommand = buildCommandPreview(selected)
  const text = lastCommand.join(' ')
  await navigator.clipboard.writeText(text)
  setStatus('Copied CLI command', 'ok')
}

runBtn.addEventListener('click', () => {
  void runSelected()
})
copyBtn.addEventListener('click', () => {
  void copyCommand()
})
inputPathEl.addEventListener('change', persistCurrentFields)
outputPathEl.addEventListener('change', persistCurrentFields)
scriptEditEl.addEventListener('change', persistCurrentFields)
scriptEditEl.addEventListener('input', () => {
  if (selected && isCustom(selected)) {
    lastCommand = buildCommandPreview(selected)
  }
})
customInputKindEl.addEventListener('change', () => {
  if (!selected || !isCustom(selected)) return
  if (customInputKindEl.value === 'file' && customModeEl.value === 'write') {
    // Keep user choice; only suggest read when switching to file the first time.
  }
  if (customInputKindEl.value === 'file' && !getExampleParams(CUSTOM_ID).mode) {
    customModeEl.value = 'read'
  }
  if (customInputKindEl.value === 'none' && !getExampleParams(CUSTOM_ID).mode) {
    customModeEl.value = 'write'
  }
  syncParamFields(selected)
  persistCurrentFields()
  lastCommand = buildCommandPreview(selected)
})
customModeEl.addEventListener('change', () => {
  persistCurrentFields()
  if (selected) lastCommand = buildCommandPreview(selected)
})
inputPathEl.addEventListener('input', () => {
  if (selected) lastCommand = buildCommandPreview(selected)
})
outputPathEl.addEventListener('input', () => {
  if (selected) lastCommand = buildCommandPreview(selected)
})

async function boot() {
  const res = await fetch('/api/examples')
  catalog = await res.json()
  renderList()

  if (!catalog.cliBuilt) {
    setStatus(
      'CLI not built — run package build before executing examples',
      'err'
    )
  } else {
    setStatus('')
  }
}

void boot()

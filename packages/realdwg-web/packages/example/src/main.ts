import {
  AcDbDatabase,
  AcDbDatabaseConverterManager,
  AcDbDxfConverter,
  AcDbFileType,
  acdbHostApplicationServices,
  AcDbOpenDatabaseOptions
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'

const fileInput = document.getElementById('fileInput') as HTMLInputElement
const modeSelect = document.getElementById('modeSelect') as HTMLSelectElement
const runButton = document.getElementById('runButton') as HTMLButtonElement
const status = document.getElementById('status') as HTMLDivElement
const output = document.getElementById('output') as HTMLPreElement
const exportButton = document.createElement('button')

exportButton.type = 'button'
exportButton.textContent = 'Export DXF'
exportButton.hidden = true
exportButton.disabled = true
exportButton.style.marginLeft = '8px'
runButton.insertAdjacentElement('afterend', exportButton)

type ParseMode = 'compare' | 'main' | 'worker'

let lastFile: File | null = null
let lastBuffer: ArrayBuffer | null = null
let lastParsedDatabase: AcDbDatabase | null = null
let lastDownloadUrl: string | null = null

const registerConverters = (useWorker: boolean) => {
  // Register DXF converter
  try {
    const converter = new AcDbDxfConverter({
      convertByEntityType: false,
      useWorker,
      parserWorkerUrl: './assets/dxf-parser-worker.js'
    })
    AcDbDatabaseConverterManager.instance.register(AcDbFileType.DXF, converter)
  } catch (error) {
    console.error('Failed to register dxf converter: ', error)
  }

  // Register DWG converter (worker-only)
  try {
    const converter = new AcDbLibreDwgConverter({
      convertByEntityType: false,
      useWorker,
      parserWorkerUrl: './assets/libredwg-parser-worker.js'
    })
    AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, converter)
  } catch (error) {
    console.error('Failed to register dwg converter: ', error)
  }
}

const getFileType = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLocaleLowerCase()
  return extension === 'dwg' ? AcDbFileType.DWG : AcDbFileType.DXF
}

const formatMs = (value: number) => `${value.toFixed(2)} ms`

const collectLayers = (database: AcDbDatabase) => {
  const layers = database.tables.layerTable.newIterator()
  const names: string[] = []
  for (const layer of layers) {
    names.push(layer.name)
  }
  return {
    count: layers.count,
    names
  }
}

type ParseResult =
  | { skipped: true; reason: string }
  | {
      database: AcDbDatabase
      skipped: false
      durationMs: number
      layers: { count: number; names: string[] }
    }

const parseOnce = async (
  buffer: ArrayBuffer,
  fileType: AcDbFileType,
  useWorker: boolean
): Promise<ParseResult> => {
  registerConverters(useWorker)

  const database = new AcDbDatabase()
  acdbHostApplicationServices().workingDatabase = database
  const options: AcDbOpenDatabaseOptions = {
    minimumChunkSize: 1000,
    readOnly: true
  }

  const start = performance.now()
  await database.read(buffer, options, fileType)
  const end = performance.now()

  return {
    database,
    skipped: false,
    durationMs: end - start,
    layers: collectLayers(database)
  }
}

const compareTimes = (mainMs: number, workerMs: number) => {
  const diff = workerMs - mainMs
  const percent = (Math.abs(diff) / Math.max(mainMs, 1)) * 100
  if (diff === 0) return 'Worker and main thread are the same speed.'
  if (diff < 0) {
    return `Worker is ${percent.toFixed(1)}% faster than main thread.`
  }
  return `Worker is ${percent.toFixed(1)}% slower than main thread.`
}

const setStatus = (message: string) => {
  status.textContent = message
}

const getExportFileName = (fileName: string) => {
  const suffixIndex = fileName.lastIndexOf('.')
  const baseName = suffixIndex >= 0 ? fileName.slice(0, suffixIndex) : fileName
  return `${baseName}.dxf`
}

const updateExportButton = () => {
  const shouldShow =
    lastFile != null && getFileType(lastFile.name) === AcDbFileType.DWG
  exportButton.hidden = !shouldShow
  exportButton.disabled = !shouldShow || lastParsedDatabase == null
}

const renderLayers = (layerInfo?: { count: number; names: string[] }) => {
  if (!layerInfo) return []
  const lines = [`Layers (${layerInfo.count})`]
  layerInfo.names.forEach(name => lines.push(`- ${name}`))
  return lines
}

const updateModeOptions = (fileType: AcDbFileType) => {
  const compareOption = modeSelect.querySelector(
    'option[value="compare"]'
  ) as HTMLOptionElement | null
  const mainOption = modeSelect.querySelector(
    'option[value="main"]'
  ) as HTMLOptionElement | null

  const disableMainThreadModes = fileType === AcDbFileType.DWG
  if (compareOption) compareOption.disabled = disableMainThreadModes
  if (mainOption) mainOption.disabled = disableMainThreadModes

  if (disableMainThreadModes && modeSelect.value !== 'worker') {
    modeSelect.value = 'worker'
  }
}

const runParse = async () => {
  if (!lastFile || !lastBuffer) {
    output.textContent = 'Please select a DWG or DXF file first.'
    return
  }

  let mode = modeSelect.value as ParseMode
  const fileType = getFileType(lastFile.name)
  const lines: string[] = []
  let parsedDatabase: AcDbDatabase | null = null

  lastParsedDatabase = null
  updateExportButton()

  if (fileType === AcDbFileType.DWG && mode !== 'worker') {
    mode = 'worker'
    modeSelect.value = 'worker'
    lines.push(
      'Mode forced to worker because DWG parsing cannot run on main thread.'
    )
    lines.push('')
  }

  runButton.disabled = true
  modeSelect.disabled = true
  fileInput.disabled = true
  exportButton.disabled = true

  try {
    setStatus('')
    lines.push(`File: ${lastFile.name}`)
    lines.push(`Mode: ${mode}`)
    lines.push('')

    if (mode === 'compare') {
      setStatus('Parsing on main thread. The UI may freeze during this step.')
      const mainResult = await parseOnce(lastBuffer.slice(0), fileType, false)
      setStatus('Parsing in web worker.')
      if (mainResult.skipped) {
        lines.push(`Main thread: skipped (${mainResult.reason})`)
      } else {
        lines.push(`Main thread: ${formatMs(mainResult.durationMs)}`)
      }

      const workerResult = await parseOnce(lastBuffer.slice(0), fileType, true)
      setStatus('')
      if (workerResult.skipped) {
        lines.push(`Worker: skipped (${workerResult.reason})`)
      } else {
        lines.push(`Worker: ${formatMs(workerResult.durationMs)}`)
      }

      if (
        !mainResult.skipped &&
        !workerResult.skipped &&
        mainResult.durationMs != null &&
        workerResult.durationMs != null
      ) {
        lines.push('')
        lines.push(compareTimes(mainResult.durationMs, workerResult.durationMs))
      }

      lines.push('')
      let layerSource: { count: number; names: string[] } | undefined
      if (!workerResult.skipped) {
        layerSource = workerResult.layers
        parsedDatabase = workerResult.database
      } else if (!mainResult.skipped) {
        layerSource = mainResult.layers
        parsedDatabase = mainResult.database
      }
      lines.push(...renderLayers(layerSource))
    } else if (mode === 'main') {
      setStatus('Parsing on main thread. The UI may freeze during this step.')
      const result = await parseOnce(lastBuffer.slice(0), fileType, false)
      setStatus('')
      if (result.skipped) {
        lines.push(`Main thread: skipped (${result.reason})`)
      } else {
        parsedDatabase = result.database
        lines.push(`Main thread: ${formatMs(result.durationMs)}`)
        lines.push('')
        lines.push(...renderLayers(result.layers))
      }
    } else {
      setStatus('Parsing in web worker.')
      const result = await parseOnce(lastBuffer.slice(0), fileType, true)
      setStatus('')
      if (result.skipped) {
        lines.push(`Worker: skipped (${result.reason})`)
      } else {
        parsedDatabase = result.database
        lines.push(`Worker: ${formatMs(result.durationMs)}`)
        lines.push('')
        lines.push(...renderLayers(result.layers))
      }
    }
  } catch (error) {
    console.error(error)
    lines.push(`Error: ${(error as Error).message}`)
  } finally {
    lastParsedDatabase = fileType === AcDbFileType.DWG ? parsedDatabase : null
    setStatus('')
    output.textContent = lines.join('\n')
    runButton.disabled = false
    modeSelect.disabled = false
    fileInput.disabled = false
    updateExportButton()
  }
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0]
  if (!file) return
  lastFile = file
  lastParsedDatabase = null
  updateModeOptions(getFileType(file.name))
  updateExportButton()
  output.textContent = 'Loading file...\n'
  lastBuffer = await file.arrayBuffer()
  await runParse()
})

runButton.addEventListener('click', async () => {
  await runParse()
})

exportButton.addEventListener('click', () => {
  if (!lastFile || !lastParsedDatabase) return

  exportButton.disabled = true

  try {
    setStatus('Generating DXF export...')
    const dxf = lastParsedDatabase.dxfOut(undefined, 6)
    const fileName = getExportFileName(lastFile.name)
    const blob = new Blob([dxf], {
      type: 'application/dxf;charset=utf-8'
    })

    if (lastDownloadUrl) {
      URL.revokeObjectURL(lastDownloadUrl)
    }

    lastDownloadUrl = URL.createObjectURL(blob)

    const anchor = document.createElement('a')
    anchor.href = lastDownloadUrl
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setStatus(`DXF exported: ${fileName}`)
  } catch (error) {
    console.error(error)
    setStatus(`DXF export failed: ${(error as Error).message}`)
  } finally {
    updateExportButton()
  }
})

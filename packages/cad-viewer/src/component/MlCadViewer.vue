<!--
  MlCadViewer - Main CAD Viewer Component
  
  This is the primary component for displaying and interacting with CAD files (DWG, DXF, etc.).
  It provides a complete CAD viewing experience with file loading, layer management, 
  command execution, and various viewing tools.
  
  USAGE EXAMPLE:
  MlCadViewer with locale="en", url="path/to/file.dwg"
  
  FEATURES:
  - File loading from local files (drag & drop or file dialog) or remote URLs
  - Layer management and visibility control
  - Command line interface for CAD operations
  - Toolbars with common CAD tools (zoom, pan, select, etc.)
  - Entity information display
  - Multi-language support (English/Chinese)
  - Dark/light theme support
  - Status bar with progress and settings
  - Customizable base URL for fonts, templates, and example files
  
  COMPONENTS INCLUDED:
  - Main menu and language selector
  - Toolbars with CAD commands
  - Layer manager for controlling entity visibility
  - Command line for text-based commands
  - Status bar with various controls
  - File reader for local file uploads (supports drag & drop and file dialog)
  - Entity info panel for object details
  
  EVENTS HANDLED:
  - File loading and error handling
  - Font loading notifications
  - General message display
  - File opening failures
  
  DEPENDENCIES:
  - @mlightcad/cad-simple-viewer: Core CAD functionality
  - @mlightcad/data-model: File format support
  - Element Plus: UI components
  - Vue 3 Composition API
-->

<script setup lang="ts">
/**
 * MlCadViewer Component
 *
 * A comprehensive CAD viewer component that provides a complete interface for viewing
 * and interacting with CAD files (DWG, DXF, etc.). This component integrates multiple
 * sub-components to deliver a full-featured CAD viewing experience.
 *
 * @example
 * ```vue
 * // Basic usage with remote file
 * <MlCadViewer
 *   :locale="'en'"
 *   :url="'https://example.com/drawing.dwg'"
 * />
 *
 * // Basic usage with local file (File object)
 * <MlCadViewer
 *   :locale="'en'"
 *   :local-file="selectedFile"
 * />
 *
 * // Basic usage for manual file loading (no URL or localFile needed)
 * <MlCadViewer
 *   :locale="'en'"
 * />
 *
 * // Usage with custom baseUrl for fonts and templates
 * <MlCadViewer
 *   :locale="'en'"
 *   :base-url="'https://my-cdn.com/cad-data/'"
 * />
 *
 * // Import statement
 * import { MlCadViewer } from '@mlightcad/cad-viewer'
 * ```
 *
 * @since 1.0.0
 * @version 1.0.0
 * @author MLight Lee (mlight.lee@outlook.com)
 *
 * @see {@link https://github.com/mlightcad/cad-viewer | Project Repository}
 * @see {@link https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-viewer/src/component/MlCadViewer.vue | Source Code}
 */

import { AcApDocManager, eventBus } from '@mlightcad/cad-simple-viewer'
import { AcDbOpenDatabaseOptions } from '@mlightcad/data-model'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { initializeCadViewer, store } from '../app'
import { useLocale, useNotificationCenter } from '../composable'
import { LocaleProp } from '../locale'
import { MlDialogManager, MlFileReader } from './common'
import {
  MlEntityInfo,
  MlLanguageSelector,
  MlMainMenu,
  MlToolBars
} from './layout'
import { MlNotificationCenter } from './notification'
import { MlPaletteManager } from './palette'
import { MlStatusBar } from './statusBar'

// Define component props with their purposes
interface Props {
  /** Language locale for internationalization ('en', 'zh', or 'default') */
  locale?: LocaleProp
  /** Optional URL to automatically load a CAD file on component mount */
  url?: string
  /** Optional local File object to automatically load a CAD file on component mount */
  localFile?: File
  /** Background color as 24-bit hexadecimal RGB number (e.g., 0x000000) */
  background?: number
  /** Base URL for loading fonts, templates, and example files (e.g., 'https://example.com/cad-data/') */
  baseUrl?: string
  /**
   * The flag whether to use main thread or webwork to render drawing.
   * - true: use main thread
   * - false: use web worker
   */
  useMainThreadDraw?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  locale: 'default',
  url: undefined,
  localFile: undefined,
  background: undefined,
  baseUrl: undefined,
  useMainThreadDraw: false
})

const { t } = useI18n()
const { effectiveLocale, elementPlusLocale } = useLocale(props.locale)
const { info, warning, error, success } = useNotificationCenter()

// Canvas element reference
const canvasRef = ref<HTMLCanvasElement>()

// Editor reference that gets updated after initialization
const editorRef = ref<AcApDocManager | null>(null)

// Computed property to ensure proper typing
const editor = computed(() => editorRef.value as AcApDocManager)

// Notification center visibility
const showNotificationCenter = ref(false)

/**
 * Handles file read events from the file reader component
 * Opens the file content using the document manager
 *
 * This function is called when a user selects a local file through:
 * - The main menu "Open" option (triggers file dialog)
 * - Drag and drop functionality (if implemented)
 * - Any other local file selection method
 *
 * @param fileName - Name of the uploaded file
 * @param fileContent - File content as string (DXF) or ArrayBuffer (DWG)
 */
const handleFileRead = async (fileName: string, fileContent: ArrayBuffer) => {
  const options: AcDbOpenDatabaseOptions = { minimumChunkSize: 1000 }
  await AcApDocManager.instance.openDocument(fileName, fileContent, options)
  store.fileName = AcApDocManager.instance.curDocument.docTitle
}

/**
 * Fetches and opens a CAD file from a remote URL
 * Used when the url prop is provided to automatically load files
 *
 * @param url - Remote URL to the CAD file
 */
const openFileFromUrl = async (url: string) => {
  try {
    const options: AcDbOpenDatabaseOptions = { minimumChunkSize: 1000 }
    await AcApDocManager.instance.openUrl(url, options)
    store.fileName = AcApDocManager.instance.curDocument.docTitle
  } catch (error) {
    console.error('Failed to open file from URL:', error)
    ElMessage({
      message: t('main.message.failedToOpenFile', { fileName: url }),
      grouping: true,
      type: 'error',
      showClose: true
    })
  }
}

/**
 * Opens a local CAD file from a File object
 * Used when the localFile prop is provided to automatically load files
 *
 * @param file - Local File object containing the CAD file
 */
const openLocalFile = async (file: File) => {
  try {
    const reader = new FileReader()
    reader.readAsArrayBuffer(file)

    // Wait for file reading to complete
    const fileContent = await new Promise<ArrayBuffer>((resolve, reject) => {
      reader.onload = event => {
        const result = event.target?.result
        if (result) {
          resolve(result as ArrayBuffer)
        } else {
          reject(new Error('Failed to read file content'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
    })

    // Open the file using the document manager
    const options: AcDbOpenDatabaseOptions = { minimumChunkSize: 1000 }
    await AcApDocManager.instance.openDocument(file.name, fileContent, options)
    store.fileName = AcApDocManager.instance.curDocument.docTitle
  } catch (error) {
    console.error('Failed to open local file:', error)
    ElMessage({
      message: t('main.message.failedToOpenFile', { fileName: file.name }),
      grouping: true,
      type: 'error',
      showClose: true
    })
  }
}

// Watch for URL changes and automatically open new files
// This allows dynamic loading of different CAD files without component remounting
watch(
  () => props.url,
  async newUrl => {
    if (newUrl) {
      openFileFromUrl(newUrl)
    }
  }
)

// Watch for local file changes and automatically open new files
// This allows dynamic loading of different local CAD files without component remounting
watch(
  () => props.localFile,
  async newFile => {
    if (newFile) {
      openLocalFile(newFile)
    }
  }
)

// Watch for background color changes and apply to the view
watch(
  () => props.background,
  newBg => {
    if (newBg != null) {
      AcApDocManager.instance.curView.backgroundColor = newBg
    }
  }
)

// Component lifecycle: Initialize and load initial file if URL or localFile is provided
onMounted(async () => {
  // Initialize the CAD viewer with the internal canvas
  if (canvasRef.value) {
    initializeCadViewer({
      canvas: canvasRef.value,
      baseUrl: props.baseUrl,
      useMainThreadDraw: props.useMainThreadDraw
    })
    // Set the editor reference after initialization
    editorRef.value = AcApDocManager.instance
  }

  // If URL prop is provided, automatically load the file on mount
  if (props.url) {
    openFileFromUrl(props.url)
  }
  // If localFile prop is provided, automatically load the file on mount
  else if (props.localFile) {
    openLocalFile(props.localFile)
  }

  // Apply initial background color if provided
  if (props.background != null) {
    AcApDocManager.instance.curView.backgroundColor = props.background
  }
})

// Set up global event listeners for various CAD operations and notifications
// These events are emitted by the underlying CAD engine and other components

// Handle general messages from the CAD system (info, warnings, errors)
eventBus.on('message', params => {
  // Show both ElMessage and notification center
  ElMessage({
    message: params.message,
    grouping: true,
    type: params.type,
    showClose: true
  })

  // Also add to notification center
  switch (params.type) {
    case 'success':
      success('System Message', params.message)
      break
    case 'warning':
      warning('System Warning', params.message)
      break
    case 'error':
      error('System Error', params.message)
      break
    default:
      info('System Info', params.message)
      break
  }
})

// Handle failure that fonts can't be loaded from remote font repository
eventBus.on('fonts-not-loaded', params => {
  const fonts = params.fonts.map(font => font.fontName).join(', ')
  const message = t('main.message.fontsNotLoaded', { fonts })
  error(t('main.notification.title.fontNotFound'), message)
})

// Handle failure that fonts can't be found in remote font repository
eventBus.on('fonts-not-found', params => {
  const message = t('main.message.fontsNotFound', {
    fonts: params.fonts.join(', ')
  })
  warning(t('main.notification.title.fontNotFound'), message)
})

// Handle failures when trying to get available fonts from the system
eventBus.on('failed-to-get-avaiable-fonts', params => {
  ElMessage({
    message: t('main.message.failedToGetAvaiableFonts', { url: params.url }),
    grouping: true,
    type: 'error',
    showClose: true
  })
})

// Handle file opening failures with user-friendly error messages
eventBus.on('failed-to-open-file', params => {
  const message = t('main.message.failedToOpenFile', {
    fileName: params.fileName
  })
  ElMessage({
    message,
    grouping: true,
    type: 'error',
    showClose: true
  })
  error('File Opening Failed', message)
})

// Toggle notification center visibility
const toggleNotificationCenter = () => {
  showNotificationCenter.value = !showNotificationCenter.value
}

// Close notification center
const closeNotificationCenter = () => {
  showNotificationCenter.value = false
}
</script>

<template>
  <!-- Canvas element for CAD rendering - positioned as background -->
  <canvas ref="canvasRef" class="ml-cad-canvas"></canvas>

  <!-- Main CAD viewer container with complete UI layout -->
  <div v-if="editorRef" class="ml-cad-viewer-container">
    <!-- Element Plus configuration provider for internationalization -->
    <el-config-provider :locale="elementPlusLocale">
      <!-- Header section with main menu and language selector -->
      <header>
        <ml-main-menu />
        <ml-language-selector :current-locale="effectiveLocale" />
      </header>

      <!-- Main content area with CAD viewing tools and controls -->
      <main>
        <!-- Display current filename at the top center -->
        <div class="ml-file-name">{{ store.fileName }}</div>

        <!-- Toolbar with common CAD operations (zoom, pan, select, etc.) -->
        <ml-tool-bars />

        <!-- Layer manager palette and entity properties palette for controlling entity visibility and properties -->
        <ml-palette-manager :editor="editor" />

        <!-- Dialog manager for modal dialogs and settings -->
        <ml-dialog-manager />
      </main>

      <!-- Footer section with command line and status information -->
      <footer>
        <!-- Status bar with progress, settings, and theme controls -->
        <ml-status-bar @toggle-notification-center="toggleNotificationCenter" />
      </footer>

      <!-- Hidden components for file handling and entity information -->
      <!-- File reader for local file uploads -->
      <ml-file-reader @file-read="handleFileRead" />

      <!-- Entity info panel for displaying object properties -->
      <ml-entity-info />

      <!-- Notification center -->
      <ml-notification-center
        v-if="showNotificationCenter"
        @close="closeNotificationCenter"
      />
    </el-config-provider>
  </div>
</template>

<!-- Component-specific styles -->
<style>
/* Canvas element styling */
.ml-cad-canvas {
  position: absolute;
  top: 0px;
  left: 0px;
  height: calc(
    100vh - var(--ml-status-bar-height)
  ); /* Adjusts for menu and status bar */
  width: 100%;
  display: block;
  outline: none;
  z-index: 1; /* Canvas above background but below UI */
  pointer-events: auto; /* Ensure canvas can receive mouse events */
}

/* Main CAD viewer container styling */
.ml-cad-viewer-container {
  position: relative;
  width: 100vw;
  z-index: 2;
  pointer-events: auto;
}

/* Position the filename display at the top center of the viewer */
.ml-file-name {
  position: absolute;
  top: 0;
  left: 50%;
  color: var(--el-text-color-regular);
  transform: translateX(-50%);
  text-align: center;
  width: 100%;
  margin-top: 20px;
  pointer-events: none; /* Allow mouse events to pass through to canvas */
  z-index: 1; /* Ensure it's above canvas but doesn't block events */
}
</style>

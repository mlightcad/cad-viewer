# CAD Viewer Component

CAD Viewer is a **high-performance** Vue 3 component for viewing and editing CAD files (DXF, DWG) **entirely in the browser without requiring any backend server**. It provides a modern user interface, state management, and seamless integration with optimized rendering engines for smooth browser-based CAD workflows with exceptional performance.

## Key Features

- **High-performance** CAD editing and viewing with smooth 60+ FPS rendering
- **No backend required** - Files are parsed and processed entirely in the browser
- **Enhanced data security** - Files never leave your device, ensuring complete privacy
- **Local file support** - Load DWG/DXF files directly from your computer via file dialog or drag & drop
- **Remote file support** - Load CAD files from URLs automatically
- **Easy integration** - No server setup or backend infrastructure needed for third-party integration
- **Customizable UI** - Control visibility of toolbars, command line, coordinates, and performance stats
- **Customizable Resources** - Set custom base URLs for fonts, templates, and example files
- Modern UI optimized for large CAD file handling
- State management for layers, entities, and settings
- Integration with optimized SVG and THREE.js renderers
- Dialogs, toolbars, and command line interface
- Vue 3 component for embedding high-performance CAD viewers in your own apps

## When Should You Choose cad-viewer?

Use `cad-viewer` if you want a **ready-to-use Vue 3 component** for viewing and editing CAD files with a modern UI, dialogs, toolbars, and state management. This package is ideal if:

- You want to quickly embed a high-performance CAD viewer/editor into your Vue application with minimal setup.
- You need support for both local file loading (from user's computer) and remote file loading (from URLs).
- You need a solution that handles file loading, rendering, layer/entity management, and user interactions out of the box.
- You want seamless integration with optimized SVG and THREE.js renderers, internationalization, and theming.
- You do **not** want to build your own UI from scratch.

**Recommended for:** Most web applications, dashboards, or platforms that need to display CAD files with a polished user interface.

## Browser-Only Architecture

This Vue 3 component operates entirely in the browser with **no backend dependencies**. DWG/DXF files are parsed and processed locally using WebAssembly and JavaScript, providing:

- **Zero server requirements** - Deploy the component anywhere with just static file hosting
- **Complete data privacy** - CAD files never leave the user's device, whether loaded locally or from URLs
- **Local file support** - Users can load files directly from their computer using the built-in file dialog
- **Remote file support** - Automatically load files from URLs when provided
- **Instant integration** - No complex backend setup or API configuration needed
- **Offline capability** - Works without internet connectivity once loaded
- **Third-party friendly** - Easy to embed in any Vue 3 application without server-side concerns

## File Loading Methods

The MlCadViewer component supports multiple ways to load CAD files:

### 1. Local File Loading
Users can load files directly from their computer:
- **File Dialog**: Click the main menu (☰) and select "Open" to browse and select local DWG/DXF files
- **Drag & Drop**: Drag and drop CAD files directly onto the viewer (if implemented in your application)
- **File Input**: Use the built-in file reader component for programmatic file selection
- **Component Prop**: Pass a File object directly to the `localFile` prop for automatic loading

#### Example: Using localFile prop with file input
```vue
<template>
  <div>
    <input 
      type="file" 
      accept=".dwg,.dxf" 
      @change="handleFileSelect"
    />
    <MlCadViewer 
      :local-file="selectedFile" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MlCadViewer } from '@mlightcad/cad-viewer'

const selectedFile = ref<File | undefined>()

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  selectedFile.value = target.files?.[0]
}
</script>
```

### 2. Remote File Loading
Automatically load files from URLs:
- **URL Prop**: Provide a `url` prop to automatically load a file when the component mounts
- **Dynamic Loading**: Change the `url` prop to load different files without remounting the component

### 3. Supported File Formats
- **DWG files**: Binary AutoCAD drawing format (read as ArrayBuffer)
- **DXF files**: ASCII/binary AutoCAD drawing exchange format (read as text)

## Directory Structure (partial)

- `src/app/` – Application entry, store, and main logic
- `src/component/` – UI components (dialogs, toolbars, status bar, etc.)
- `src/composable/` – Vue composables for state and logic
- `src/locale/` – Internationalization files
- `src/style/` – Stylesheets
- `src/svg/` – SVG assets

## Installation

```bash
npm install @mlightcad/cad-viewer
```

## Usage

Please refer to sub-package `cad-viewer-example` as one example.

### Basic Usage

Firstly, add the following dependencies into your package.json.

- @element-plus/icons-vue
- @mlightcad/cad-simple-viewer
- @mlightcad/cad-viewer
- @mlightcad/data-model
- @vueuse/core
- element-plus
- vue
- vue-i18n

Then create one vue component as follows.

```vue
<template>
  <div>
    <!-- For local file loading (users can open files via menu) -->
    <MlCADViewer :background="0x808080" />
    
    <!-- For remote file loading (automatically loads from URL) -->
    <!-- <MlCADViewer 
      :background="0x808080" 
      :url="'https://example.com/drawing.dwg'" 
    /> -->
    
    <!-- For local file loading (automatically loads from File object) -->
    <!-- <MlCADViewer 
      :background="0x808080" 
      :local-file="selectedFile" 
    /> -->
    
    <!-- With custom base URL for fonts and templates -->
    <!-- <MlCADViewer 
      :background="0x808080" 
      :base-url="'https://my-cdn.com/cad-data/'"
    /> -->
  </div>
</template>

<script setup lang="ts">
import 'uno.css'
import 'element-plus/dist/index.css'
import 'element-plus/dist/index.css'

import {
  i18n,
  MlCadViewer
} from '@mlightcad/cad-viewer'
import ElementPlus from 'element-plus'
import { createApp } from 'vue'

const initApp = () => {
  const app = createApp(MlCadViewer)
  app.use(i18n)
  app.use(ElementPlus)
  app.mount('#app')
}

initApp()
</script>
```

## MlCadViewer Component

The `MlCadViewer` is the main Vue 3 component that provides a complete CAD viewing and editing interface. It includes toolbars, layer management, command line, status bar, and various dialogs for a full-featured CAD experience.

### Component Properties

The `MlCadViewer` component accepts the following props:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `locale` | `'en' \| 'zh' \| 'default'` | `'default'` | Sets the language for the component interface. Use `'en'` for English, `'zh'` for Chinese, or `'default'` to use the browser's default language. |
| `url` | `string` | `undefined` | Optional URL to automatically load a CAD file when the component mounts. The file will be fetched and opened automatically. **Note**: If not provided, users can still load local files using the main menu "Open" option. |
| `localFile` | `File` | `undefined` | Optional local File object to automatically load a CAD file when the component mounts. The file will be read and opened automatically. **Note**: This takes precedence over the `url` prop if both are provided. |
| `background` | `number` | `undefined` | Background color as 24-bit hexadecimal RGB (e.g., `0x000000` for black, `0x808080` for gray). |
| `baseUrl` | `string` | `undefined` | Base URL for loading fonts, templates, and example files. This URL is used by the CAD viewer to load resources like fonts and drawing templates. **Note**: If not provided, uses the default URL. |
| `useMainThreadDraw` | `boolean` | `false` | Optional flag whether to use main thread or webwork to render drawing. The true value means using main thread to render drawing. This approach take less memory and take longer time to show rendering results. The false value means using web worker to render drawing. This approach take more memory and take shorter time to show rendering results. |

### UI Settings

The `MlCadViewer` reads its UI visibility from the global `AcApSettingManager` (provided by `@mlightcad/cad-simple-viewer`). Configure these flags anywhere before rendering the viewer to customize the UI.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `isShowToolbar` | `boolean` | `true` | Controls toolbar visibility |
| `isShowCommandLine` | `boolean` | `true` | Controls command line visibility |
| `isShowCoordinate` | `boolean` | `true` | Controls coordinate display visibility |
| `isShowStats` | `boolean` | `false` | Controls performance statistics display |

#### Example (recommended)
```vue
<template>
  <!-- Local file loading - users can open files via main menu -->
  <MlCadViewer locale="en" />
  
  <!-- Remote file loading - automatically loads from URL -->
  <!-- <MlCadViewer 
    locale="en" 
    :url="'https://example.com/drawing.dwg'" 
  /> -->
  
  <!-- Local file loading - automatically loads from File object -->
  <!-- <MlCadViewer 
    locale="en" 
    :local-file="selectedFile" 
  /> -->
  
  <!-- Custom baseUrl for fonts and templates -->
  <!-- <MlCadViewer 
    locale="en" 
    :base-url="'https://my-cdn.com/cad-data/'"
  /> -->
</template>

<script setup lang="ts">
import { MlCadViewer } from '@mlightcad/cad-viewer'
import { AcApSettingManager } from '@mlightcad/cad-simple-viewer'

// Configure global UI flags before the viewer mounts
AcApSettingManager.instance.isShowCommandLine = false
// Optional toggles
// AcApSettingManager.instance.isShowToolbar = false
// AcApSettingManager.instance.isShowStats = true
// AcApSettingManager.instance.isShowCoordinate = false
</script>
```

#### Notes

- Settings are global and immediately reflected by `MlCadViewer`.
- You can change them at runtime using the same `AcApSettingManager.instance` reference.

### Base URL Configuration

The `baseUrl` property allows you to customize where the CAD viewer loads fonts, templates, and example files from. This is particularly useful for:

- **Self-hosted resources**: Host your own fonts and templates on your CDN or server
- **Corporate environments**: Use internal servers for CAD resources
- **Offline deployments**: Serve resources from local file systems
- **Custom branding**: Use your own templates and fonts

#### Default Behavior
If no `baseUrl` is provided, the viewer uses the default URL: `https://mlightcad.gitlab.io/cad-data/`

#### Resource Structure
When using a custom `baseUrl`, ensure your server has the following structure:
```
your-base-url/
├── fonts/           # Font files for text rendering
├── templates/       # Drawing templates (e.g., acadiso.dxf)
└── examples/        # Example CAD files
```

#### Example: Custom Base URL
```vue
<template>
  <MlCadViewer 
    :base-url="'https://my-company.com/cad-resources/'"
    :url="'https://my-company.com/drawings/project.dwg'"
  />
</template>
```

This configuration will:
- Load fonts from `https://my-company.com/cad-resources/fonts/`
- Load templates from `https://my-company.com/cad-resources/templates/`
- Use the custom base URL for any "Quick New" operations

### Component Features

The `MlCadViewer` component includes:

- **Main Menu** - File operations (including local file opening), view controls, and settings
- **Toolbars** - Drawing tools, zoom controls, and selection tools
- **Layer Manager** - Layer visibility and property management
- **Command Line** - AutoCAD-style command input
- **Status Bar** - Current position, zoom level, and system status
- **Dialog Manager** - Modal dialogs for various operations
- **File Reader** - Local file loading via file dialog and drag-and-drop support
- **Entity Info** - Detailed information about selected entities
- **Language Selector** - UI language switching
- **Theme Support** - Dark/light mode toggle

### Event Handling

The component automatically handles various events:

- **File Loading** - Supports local file loading (via file dialog), drag-and-drop, and URL-based file loading
- **Error Messages** - Displays user-friendly error messages for failed operations
- **Font Loading** - Handles missing fonts with appropriate notifications
- **System Messages** - Shows status updates and operation feedback

### Advanced Usage

Please refer to [readme of cad-simple-viewer](../cad-simple-viewer/README.md) to learn the following advanced usage.

- Register DWG converter to display drawings in DWG format
- Define your own font loader to load fonts from your own server
- Create drawing or modify drawing

## Available Exports

### Main Component

- `MlCADViewer` - The main CAD viewer component

### Commands

- `AcApLayerStateCmd` - Layer state command
- `AcApLogCmd` - Log command
- `AcApMissedDataCmd` - Missed data command
- `AcApPointStyleCmd` - Point style command

### Components

- `MlPointStyleDlg` - Point style dialog
- `MlReplacementDlg` - Replacement dialog
- Various layout and UI components

### Composables

- `useCommands` - Command management
- `useCurrentPos` - Current position tracking
- `useDark` - Dark mode support
- `useDialogManager` - Dialog management
- `useFileTypes` - File type utilities
- `useLayers` - Layer management
- `useLayouts` - Layout management
- `useMissedData` - Missed data handling
- `useSettings` - Settings management
- `useSystemVars` - System variables

### Locale

- `i18n` - Internationalization instance
- Language files for English and Chinese

### Styles

- CSS and SCSS files for styling
- Dark mode support
- Element Plus integration

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build the library
pnpm build

# Preview the build
pnpm preview
```

## License

MIT
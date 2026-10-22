---
title: "Architecture Overview"
---

# Architecture Overview

CAD-Viewer operates entirely in the browser with **no backend dependencies**. DWG/DXF files are parsed and processed locally using WebAssembly and JavaScript, ensuring:

- **Zero server requirements** - Deploy anywhere with just static file hosting
- **Complete data privacy** - Files never leave the user's device
- **Instant integration** - No complex backend setup or API configuration
- **Offline capability** - Works without internet connectivity

CAD-Viewer is organized into several subpackages, each responsible for a specific aspect of the system:

- **cad-viewer**: Main Vue 3 component and frontend application, including UI components, dialogs, toolbars, state management, and integration with rendering engines.
- **cad-simple-viewer**: Core logic for document management, command handling, and integration between UI and rendering engines. Framework-agnostic and UI-free (canvas only).
- **svg-renderer**: Renders DWG/DXF entities as SVG graphics for exporting and scalable 2D output.
- **three-renderer**: Uses THREE.js to render DWG/DXF entities as interactive 2D/3D graphics with advanced visualization and custom shaders.

## Architecture Overview

**CAD-Viewer** is a high-performance, browser-only DWG/DXF viewer that adopts a modular and extensible architecture to support loading, parsing, rendering, and interacting with multiple CAD data formats. The system is divided into the following core layers:

![Architecture Overview](https://github.com/mlightcad/cad-viewer/blob/main/assets/arch-en.jpg?raw=true)

This layered architecture ensures that **CAD-Viewer** can maintain high performance, low latency, and strong scalability when dealing with different data scales, rendering requirements, and deployment environments.

### **Model Layer**

- Defines a unified **Data Model** for describing parsed CAD data (including geometric entities, layer information, view parameters, etc.) through the [`@mlightcad/data-model`](https://github.com/mlightcad/realdwg-web) module in [`realdwg-web`](https://github.com/mlightcad/realdwg-web).
- Implements a unified CAD file conversion interface via [`AcDbDatabaseConverter`](https://github.com/mlightcad/realdwg-web/blob/main/packages/data-model/src/database/AcDbDatabaseConverter.ts), enabling different converters to transform CAD data into the unified Data Model.
- Provides DWG parsing capabilities through the [`@mlightcad/libredwg-converter`](https://github.com/mlightcad/realdwg-web) module in `realdwg-web`, converting DWG files into the unified Data Model.
- Provides DXF parsing capabilities via the [`@mlightcad/dxf-json`](https://github.com/mlightcad/dxf-json) module, converting DXF files into the unified Data Model.
- Offers a geometry engine through the [`@mlightcad/geometry-engine`](https://github.com/mlightcad/realdwg-web) module in `realdwg-web`, supporting various geometric computations (points, lines, polylines, splines, circles, arcs, ellipses, elliptical arcs) as well as mathematical operations (vectors, matrices, etc.).

A quick note on why we define the `AcDbDatabaseConverter` interface: existing DXF/DWG read/write and conversion tools on the market are often incomplete. I’ve implemented `@mlightcad/libredwg-converter` and `@mlightcad/dxf-json` based on some open-source code. However, the best DWG/DXF parsing and conversion tool available is actually [ODA](https://www.opendesign.com/products/drawings). To use it, you must purchase a license to access its source code, from which you can build a WebAssembly module that converts DXF/DWG into the unified Data Model defined in `@mlightcad/data-model`. If someone happens to share ODA’s source code with me, I could also implement a converter based on it.

### **Rendering Layer**

- Defines a unified rendering interface via the [`@mlightcad/graphic-interface`](https://github.com/mlightcad/realdwg-web) module in `realdwg-web` for rendering various types of CAD entities.
- Implements the rendering interface in the [`@mlightcad/three-renderer`](https://github.com/mlightcad/cad-viewer) module in `cad-viewer`, using Three.js to render all entity types.
- Implements the rendering interface in the [`@mlightcad/svg-renderer`](https://github.com/mlightcad/cad-viewer) module in `cad-viewer`, rendering drawings as SVG.

### **View Layer**

- The [`@mlightcad/cad-simple-viewer`](https://github.com/mlightcad/cad-viewer) module in `cad-viewer` provides the core viewing logic for CAD files, such as document management, command handling, and coordination between the UI and rendering engine. It has no UI framework dependency and offers no UI elements apart from the canvas.
- The [`@mlightcad/cad-viewer`](https://github.com/mlightcad/cad-viewer) module builds on `@mlightcad/cad-simple-viewer` to provide a Vue 3-based UI with menus, toolbars, command line, status bar, and both dark and light themes. It packages all core features into a Vue 3 component for easy integration.

## Rendering Engine

Rendering DXF/DWG files poses several challenges:

- High-performance rendering of drawings containing a large number of entities.
- Reproducing AutoCAD’s text rendering effects.
- Supporting line styles and hatch patterns.

### High-Performance Rendering

For high-performance rendering of large drawings, the key is to merge points, lines, and faces to reduce **Draw Calls**. THREE.js offers a partial solution through the [BatchedMesh](https://threejs.org/docs/index.html?q=Mesh#api/en/objects/BatchedMesh) class for merging triangle meshes. However, it doesn’t support merging points and lines, and even its face merging doesn’t fully meet our needs. Therefore, we implemented several classes inspired by `BatchedMesh` to merge points, lines, and faces. You can check the [code here](https://github.com/mlightcad/cad-viewer/tree/main/packages/three-renderer/src/batch).

### Text Rendering

AutoCAD uses the [`MText`](https://ezdxf.mozman.at/docs/dxfinternals/entities/mtext.html) format for rich text and a special [SHX](https://help.autodesk.com/view/OARX/2023/ENU/?guid=GUID-DE941DB5-7044-433C-AA68-2A9AE98A5713) font (a stroke-based font drawn only with lines) for faster rendering. The main challenges are:

- **Parsing MText** – Implemented with the [`@mlightcad/mtext-parser`](https://github.com/mlightcad/mtext-parser) package.
- **Parsing SHX fonts** – Implemented with the [`@mlightcad/shx-parser`](https://github.com/mlightcad/shx-parser) package.
- **Rendering MText** – Implemented with the [`@mlightcad/mtext-renderer`](https://github.com/mlightcad/mtext-renderer) package. For performance, parsed font files are cached in the browser’s IndexedDB so that once downloaded and parsed, subsequent rendering is faster.

To debug text rendering, we built a THREE.js-based rich text editor, [mtext-editor](https://github.com/mlightcad/mtext-editor). Currently, there’s no other open-source THREE.js-based rich text editor, so this can be reused as a text editor for any rendering engine.

### Line Styles and Hatch Patterns

AutoCAD supports custom line types and hatch patterns. We’ve implemented some of them (line types containing text are not yet supported). All line styles and hatch effects are implemented with THREE.js’s `ShaderMaterial`. You can check the [code here](https://github.com/mlightcad/cad-viewer/tree/main/packages/three-renderer/src/style).




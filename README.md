# CAD-Viewer

[简体中文](./README.zh-CN.md)

CAD-Viewer is a **high-performance**, modern, web-based CAD editor inspired by AutoCAD. It enables users to view and edit DWG/DXF files **entirely in the browser without requiring any backend server**, providing exceptional rendering speed and smooth interactions. The project is modular and designed for seamless integration with other applications.

- [**🌐 Live Demo**](https://mlightcad.github.io/cad-viewer/)
- [**🌐 API Docs**](https://mlightcad.github.io/cad-viewer/docs/)
- [**🌐 Wiki**](https://github.com/mlightcad/cad-viewer/wiki)

![CAD-Viewer](./assets/dwg-viewer.jpg)

## Features

- **High-performance** viewing of large DWG/DXF files with smooth 60+ FPS rendering
- **No backend required** - Files are parsed and processed entirely in the browser
- **Enhanced data security** - Files never leave your device, ensuring complete privacy
- **Easy integration** - No server setup or backend infrastructure needed
- Modular architecture for seamless third-party integration
- Offline and online editing workflows
- THREE.js 3D rendering engines with advanced optimization techniques
- Designed for extensibility and integration with platforms like CMS, Notion, and WeChat

## How to Use

### Desktop Browser Operations
- **Select**: Left-click on entities
- **Zoom in/out**: Scroll mouse wheel up/down
- **Pan**: Hold middle mouse button and drag

### Pad/Mobile Browser Operations
- **Select**: Tap on entities
- **Zoom**: Pinch with two fingers
- **Pan**: Single-finger drag

## Performance

CAD-Viewer is engineered for **exceptional performance** and can handle very large DXF/DWG files while maintaining high frame rates. It employs multiple advanced rendering technologies to optimize performance:

- **Custom Shader Materials**: Uses GPU-accelerated shader materials to render complex line types and hatch fill patterns efficiently
- **Geometry Batching**: Merges points, lines, and areas with the same material to dramatically reduce draw calls
- **Instanced Rendering**: Optimizes rendering of repeated geometries through instancing techniques
- **Buffer Geometry Optimization**: Efficient memory management and geometry merging for reduced GPU overhead
- **Material Caching**: Reuses materials across similar entities to minimize state changes
- **WebGL Optimization**: Leverages modern WebGL features for hardware-accelerated rendering

These optimizations enable CAD-Viewer to smoothly render complex CAD drawings with thousands of entities while maintaining responsive user interactions.

## Known Issues

CAD-Viewer has some known limitations that users should be aware of:

- **Unsupported Entities**: 
  - **Tables** (DWG files only): Table entities are not currently supported in DWG files because [LibreDWG](https://github.com/LibreDWG/libredwg) is used to read DWG files and it doesn't support table entity yet. If one table is created by line and polyline entities, definitely it is supported.
  - **XRefs**: External references (XRefs) are not supported and will not be displayed.
- **DWG File Compatibility**: Some DWG drawings may fail to open due to bugs in the underlying [LibreDWG](https://github.com/LibreDWG/libredwg) library. This is a known limitation of the current DWG parsing implementation. If you find those issues, please log one issue on [CAD-Viewer issues page](https://github.com/mlightcad/cad-viewer/issues) or [LibreDWG issues page](https://github.com/LibreDWG/libredwg/issues).

These issues are being tracked and will be addressed in future releases.

## Roadmap

To achieve the final goal, the following milestones are defined:

- [x] **DWG/DXF Viewer**: Create an offline web viewer for DWG/DXF files.
- [x] **Entity Editing Framework**: Support drawing modification.
- [ ] **Integration**: Integrate the DWG/DXF viewer into other applications or frameworks (e.g., CMS, Notion, OpenLayers).
- [ ] **WeChat App**: Develop a WeChat app to display DWG/DXF files within WeChat.
- [ ] **Offline CAD Editor**: Build an offline CAD editor that allows users to modify DWG/DXF files in the browser and store changes locally.
- [ ] **Online CAD Editor**: Add backend support to enable users to store changes to DXF/DWG files in the cloud.

**Note**: 

The second item is partially finished now. While CAD-Viewer doesn't support saving modificaiton to DWG/DXF files now, it provides comprehensive support for modifying drawings in real-time. You can add, edit, and delete entities within the drawing by [RealDWG-Web API](https://mlightcad.github.io/realdwg-web/), and the viewer will automatically update to reflect these changes. The usage patterns of [RealDWG-Web API](https://mlightcad.github.io/realdwg-web/) are very similar to AutoCAD RealDWG. If you're familiar with AutoCAD RealDWG development, you'll find the API structure and workflow nearly identical. Please refer to [cad-simple-viewer README](packages/cad-simple-viewer/README.md) to get more details.

## Which Viewer Should I Use?

This project provides two viewers `cad-viewer` and `cad-simple-viewer` for users. Which viewer to choose depends on your project requirements and desired level of integration:

### Use **cad-viewer** if:
- You want a **ready-to-use Vue 3 component** with a modern UI, dialogs, toolbars, and state management.
- You need to quickly embed a high-performance CAD viewer/editor into your Vue application with minimal setup.
- You prefer a solution that handles file loading, rendering, layer/entity management, and user interactions out of the box.
- You want seamless integration with optimized SVG and THREE.js renderers, internationalization, and theming.
- You do **not** want to build your own UI from scratch.

**Recommended for:** Most web applications, dashboards, or platforms that need to display CAD files with a polished user interface.

### Use **cad-simple-viewer** if:
- You need **core CAD logic only** (document management, command stack, rendering engine integration) without any UI framework dependencies.
- You want to build your **own custom UI** or integrate CAD functionality into a non-Vue or non-web environment.
- You require maximum flexibility and performance for handling large CAD files, and plan to connect the logic to your own rendering or UI layer.
- You want a framework-agnostic solution that provides only the essential CAD operations and canvas rendering.

**Recommended for:** Custom integrations, headless CAD processing, or advanced users building highly tailored CAD solutions.

**Summary Table:**

| Package             | UI Provided | Framework | Use Case                                      |
|---------------------|-------------|-----------|-----------------------------------------------|
| `cad-viewer`        | Yes         | Vue 3     | Turnkey CAD viewer/editor with modern UI       |
| `cad-simple-viewer` | No          | None      | Core CAD logic for custom or headless use      |

For more details, see the [cad-viewer README](packages/cad-viewer/README.md) and [cad-simple-viewer README](packages/cad-simple-viewer/README.md).

## Examples

- [`cad-simple-viewer-example`](https://github.com/mlightcad/cad-simple-viewer-example): Example application demonstrating how to use the `cad-simple-viewer` component in a real project.
- [`cad-viewer-example`](https://github.com/mlightcad/cad-viewer-example): Example application demonstrating how to use the `cad-viewer` component in a real project.

## Contributing

Contributions are welcome! Please open issues or pull requests for bug fixes, new features, or suggestions. For bug reports, providing a link to the problematic drawing will help in reproducing and fixing the issue.

## License

[MIT](LICENSE)


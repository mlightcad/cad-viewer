---
title: "CAD Viewer Basics"
---

# CAD Viewer Basics

This project provides two viewers `cad-viewer` and `cad-simple-viewer` for users. Which viewer to choose depends on your project requirements and desired level of integration:

## Use **cad-viewer** if:

- You want a **ready-to-use Vue 3 component** with a modern UI, dialogs, toolbars, and state management.
- You need to quickly embed a high-performance CAD viewer/editor into your Vue application with minimal setup.
- You prefer a solution that handles file loading, rendering, layer/entity management, and user interactions out of the box.
- You want seamless integration with optimized SVG and THREE.js renderers, internationalization, and theming.
- You do **not** want to build your own UI from scratch.

**Recommended for:** Most web applications, dashboards, or platforms that need to display CAD files with a polished user interface.

## Use **cad-simple-viewer** if:

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

For more details, see [**Integrate Simple CAD Viewer**](./integrate-simple-cad-viewer) and [**Integrate CAD Viewer Component**](./integrate-cad-viewer-component).

## Examples

- [`cad-simple-viewer-example`](https://github.com/mlightcad/cad-simple-viewer-example): Example application demonstrating how to use the `cad-simple-viewer` component in a real project.
- [`cad-viewer-example`](https://github.com/mlightcad/cad-viewer-example): Example application demonstrating how to use the `cad-viewer` component in a real project.



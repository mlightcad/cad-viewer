# svg-renderer

This package implements the SVG-based rendering engine for MLightCAD. It converts DWG/DXF entities into SVG graphics for SVG and PDF exporting.

## Key Features
- Renders CAD entities as SVG elements
- Supports layers, colors, and visibility
- Designed for integration with the main application and document manager

## Directory Structure (partial)
- `src/AcSvgEntity.ts` – Base class for SVG entities
- `src/AcSvgRenderer.ts` – Main SVG renderer implementation
- `src/` – Entity-specific renderers (lines, arcs, ellipses, etc.)

## Usage
Import and use `AcSvgRenderer` from `src/AcSvgRenderer.ts` to render entities to SVG.

## Role in MLightCAD
This package provides the SVG rendering backend for the main application, enabling scalable 2D graphics output.
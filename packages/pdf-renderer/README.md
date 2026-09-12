# @mlightcad/pdf-renderer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@mlightcad/pdf-renderer.svg)](https://www.npmjs.com/package/@mlightcad/pdf-renderer)

Native **AcGi PDF renderer** for `@mlightcad/data-model`. Converts a drawing database to a vector PDF without going through SVG or a viewer.

This package does **not** depend on `@mlightcad/cad-simple-viewer`. Viewer integration lives in [`@mlightcad/cad-pdf-plugin`](../cad-pdf-plugin).

Export includes patterned and gradient hatches, SHX/mesh glyph paths with `/ActualText`, OCG layers, INSERT marked content (layer 0 follows the INSERT), complex linetype walking, Form XObject reuse, and optional multi-layout (paper space) pages.

## Usage

```typescript
import { AcDbDatabase } from '@mlightcad/data-model'
import { exportDatabaseToPdf } from '@mlightcad/pdf-renderer'

const db: AcDbDatabase = /* loaded drawing */
const bytes = await exportDatabaseToPdf(db, {
  showLineWeight: true,
  background: 'none'
})
```

## Build

```bash
pnpm --filter @mlightcad/pdf-renderer build
```

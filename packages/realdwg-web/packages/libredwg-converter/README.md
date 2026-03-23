# @mlightcad/libredwg-converter

The `libredwg-converter` package provides a DWG file converter for the RealDWG-Web ecosystem, enabling reading and conversion of DWG files into the AutoCAD-like drawing database structure. It is based on the [LibreDWG](https://www.gnu.org/software/libredwg/) library compiled to WebAssembly.

## Overview

This package implements a DWG file converter compatible with the RealDWG-Web data model. It allows you to register DWG file support in your application and convert DWG files into the in-memory drawing database.

## Key Features

- **DWG File Support**: Read and convert DWG files to the drawing database
- **Integration**: Designed to work with the RealDWG-Web data model and converter manager
- **WebAssembly Powered**: Uses LibreDWG compiled to WASM for fast, browser-compatible parsing

## Installation

```bash
npm install @mlightcad/libredwg-converter
```

> **Peer dependencies:**
> - `@mlightcad/data-model`
> - `@mlightcad/libredwg-web`

## Usage Example

```typescript
import { AcDbDatabaseConverterManager, AcDbFileType } from '@mlightcad/data-model';
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter';

// WASM module loading (async)
import('@mlightcad/libredwg-web/wasm/libredwg-web').then(libredwgModule => {
  const dwgConverter = new AcDbLibreDwgConverter(libredwgModule);
  AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, dwgConverter);
});
```

## API

- **AcDbLibreDwgConverter**: Main converter class for DWG files (extends `AcDbDatabaseConverter`)

## Dependencies

- **@mlightcad/data-model**: Drawing database and entity definitions
- **@mlightcad/libredwg-web**: WASM wrapper for LibreDWG

## API Documentation

For detailed API documentation, visit the [RealDWG-Web documentation](https://mlight-lee.github.io/realdwg-web/).

## Contributing

This package is part of the RealDWG-Web monorepo. Please refer to the main project README for contribution guidelines. 
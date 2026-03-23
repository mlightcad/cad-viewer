# @mlightcad/libdxfrw-converter

The `libdxfrw-converter` package provides a DWG file converter for the RealDWG-Web ecosystem, enabling reading and conversion of DWG files into the AutoCAD-like drawing database structure. It is based on the [libdxfrw](https://github.com/LibreDWG/libdxfrw) library compiled to WebAssembly.

## Overview

This package implements a DWG file converter compatible with the RealDWG-Web data model. It allows you to register DWG file support in your application and convert DWG files into the in-memory drawing database.

## Key Features

- **DWG File Support**: Read and convert DWG files to the drawing database
- **Integration**: Designed to work with the RealDWG-Web data model and converter manager
- **WebAssembly Powered**: Uses libdxfrw compiled to WASM for fast, browser-compatible parsing

## Installation

```bash
npm install @mlightcad/libdxfrw-converter
```

> **Peer dependencies:**
> - `@mlightcad/data-model`
> - `@mlightcad/libdxfrw-web`

## Usage Example

```typescript
import { AcDbDatabaseConverterManager, AcDbFileType } from '@mlightcad/data-model';
import { AcDbLibdxfrwConverter } from '@mlightcad/libdxfrw-converter';

// WASM module loading (async)
import('@mlightcad/libdxfrw-web/wasm/libdxfrw-web').then(libdxfrwModule => {
  const dxfConverter = new AcDbLibdxfrwConverter(libdxfrwModule);
  AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, dxfConverter);
});
```

## API

- **AcDbLibdxfrwConverter**: Main converter class for DWG files (extends `AcDbDatabaseConverter`)

## Dependencies

- **@mlightcad/data-model**: Drawing database and entity definitions
- **@mlightcad/libdxfrw-web**: WASM wrapper for libdxfrw

## API Documentation

For detailed API documentation, visit the [RealDWG-Web documentation](https://mlight-lee.github.io/realdwg-web/).

## Contributing

This package is part of the RealDWG-Web monorepo. Please refer to the main project README for contribution guidelines. 
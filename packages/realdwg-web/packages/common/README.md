# @mlightcad/common

The common package provides shared utilities and base classes that are used across the RealDWG-Web ecosystem. This package contains fundamental components for color management, event handling, logging, performance monitoring, and file loading operations.

## Overview

This package serves as the foundation for the RealDWG-Web project, providing essential utilities and base classes that mimic AutoCAD ObjectARX's AcCm (Common) classes. It includes color management, event dispatching, logging utilities, performance monitoring, and file loading capabilities.

## Key Features

- **Color Management**: Comprehensive color handling with support for AutoCAD color indices and RGB values
- **Event System**: Event dispatching and management for decoupled communication between components
- **Logging**: Structured logging utilities with different log levels
- **Performance Monitoring**: Tools for collecting and analyzing performance metrics
- **File Loading**: Asynchronous file loading with progress tracking and error handling
- **Task Scheduling**: Background task management and scheduling capabilities

## Installation

```bash
npm install @mlightcad/common
```

## Key Classes

### Color Management
- **AcCmColor**: Represents colors in AutoCAD format with support for color indices and RGB values
- **AcCmColorUtil**: Utility functions for color conversion and manipulation

### Event System
- **AcCmEventDispatcher**: Dispatches events to registered listeners
- **AcCmEventManager**: Manages event registration and dispatching across the application

### Logging and Utilities
- **AcCmLogUtil**: Structured logging with different log levels (debug, info, warn, error)
- **AcCmStringUtil**: String manipulation and formatting utilities
- **AcCmErrors**: Error handling and custom error types

### Performance and Tasks
- **AcCmPerformanceCollector**: Collects and analyzes performance metrics
- **AcCmTaskScheduler**: Manages background tasks and scheduling

### File Loading
- **AcCmFileLoader**: Handles asynchronous file loading with progress tracking
- **AcCmLoadingManager**: Manages multiple file loading operations
- **AcCmLoader**: Base class for implementing custom file loaders

### Base Classes
- **AcCmObject**: Base class for common objects with event handling capabilities

## Usage Examples

### Color Management
```typescript
import { AcCmColor, AcCmColorUtil } from '@mlightcad/common';

// Create a color from AutoCAD color index
const color = new AcCmColor(1); // Red

// Create a color from RGB values
const rgbColor = new AcCmColor(255, 0, 0);

// Convert between formats
const rgb = AcCmColorUtil.toRgb(color);
const index = AcCmColorUtil.toColorIndex(rgbColor);
```

### Event Handling
```typescript
import { AcCmEventManager, AcCmEventDispatcher } from '@mlightcad/common';

// Create an event dispatcher
const dispatcher = new AcCmEventDispatcher();

// Register an event listener
dispatcher.addEventListener('fileLoaded', (event) => {
  console.log('File loaded:', event.data);
});

// Dispatch an event
dispatcher.dispatchEvent('fileLoaded', { fileName: 'drawing.dwg' });
```

### Logging
```typescript
import { AcCmLogUtil } from '@mlightcad/common';

// Configure logging
AcCmLogUtil.setLevel('info');

// Log messages
AcCmLogUtil.info('Application started');
AcCmLogUtil.warn('Deprecated feature used');
AcCmLogUtil.error('Failed to load file', error);
```

### File Loading
```typescript
import { AcCmFileLoader, AcCmLoadingManager } from '@mlightcad/common';

// Create a file loader
const loader = new AcCmFileLoader();

// Load a file with progress tracking
loader.load('drawing.dwg', {
  onProgress: (progress) => {
    console.log(`Loading: ${progress}%`);
  },
  onComplete: (data) => {
    console.log('File loaded successfully');
  },
  onError: (error) => {
    console.error('Failed to load file:', error);
  }
});

// Use loading manager for multiple files
const manager = new AcCmLoadingManager();
manager.addLoader(loader);
manager.start();
```

## Dependencies

- **loglevel**: For logging functionality

## API Documentation

For detailed API documentation, visit the [RealDWG-Web documentation](https://mlight-lee.github.io/realdwg-web/).

## Contributing

This package is part of the RealDWG-Web monorepo. Please refer to the main project README for contribution guidelines. 
---
title: Script Feature Overview
---

# Script Feature Overview

The script feature allows you to execute custom JavaScript code on drawings to perform queries, statistics, batch editing, and selection highlighting. Scripts interact with the drawing through the `cad` object — no external model connection or API Key configuration is required.

The script feature is provided by the `@mlightcad/cad-script-plugin` plugin. The script panel is only available after loading this plugin in your application.

## Opening the Script Panel

- Type `cadscript` in the command line and press Enter
- Or click the "Script" tab in the tools panel

The script panel includes:

- **Script Editor**: Write JavaScript function bodies
- **Run Button**: Execute the script (shortcut `Ctrl+Enter`)
- **Help**: Opens this guide in the current language
- **Examples**: Search built-in scripts by their description and load one into the editor
- **Result Area**: Shows the return value as a collapsible JSON tree, plus logs, errors, and entity changes. Drag the divider between the editor and this area to resize them.

## How Scripts Execute

Scripts run in strict mode and are automatically wrapped as a function:

```javascript
function __cadScript(cad) {
  // Your code goes here
}
```

The function's only parameter is `cad`, which provides access to drawing data and operations.

## Limitations

- Scripts have time and step limits; exceeding either limit will automatically stop execution
- Access to page global objects is prohibited (`window`, `document`, `fetch`, etc.)
- `import` / `export` / `this` syntax is prohibited
- Return values must be JSON-serializable data
- Edit operations must be executed within `cad.edit.transaction`, and the drawing must be in an editable state

## Draft Saving

Editor content is automatically saved to the browser's local storage. The last edited script is restored after refreshing the page.

# @mlightcad/cad-script-plugin

Manual CAD script console for [cad-viewer](https://github.com/mlightcad/cad-viewer).

The console runs the checked script host from [`@mlightcad/cad-agent-core`](../cad-agent-core/README.md). It does not talk to a model and does not need an API key. The body is a function with one argument, `cad`.

## Usage

```typescript
import { registerLazyCadScriptPlugin } from '@mlightcad/cad-script-plugin/register'

registerLazyCadScriptPlugin(AcApDocManager.instance.pluginManager)
```

The host calls `setCadScriptPaletteOpener` before the command runs, and mounts `CadScriptPanel` where it wants the console. `cad-simple-viewer-example` uses a dock tab. `cad-viewer` uses a tool-palette tab.

Run `cadscript` to open the console. Drawing tools used by the agent stay in `@mlightcad/cad-agent-core`; this package only adds the panel and the command.

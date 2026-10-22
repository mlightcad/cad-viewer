---
title: "Command"
---

# Creating a Custom Command in CAD-Viewer

This page explains how to create a custom command in **CAD-Viewer** and register it so that it can be triggered by the user.

## Overview

Commands are the primary way users interact with the CAD-Viewer. Each command represents a specific operation, such as drawing a line, creating a circle, zooming, or selecting objects.

The system provides a **command stack** (`AcEdCommandStack`) to manage commands in groups, look them up by name, and handle their lifecycle events through the editor.

## Command Lifecycle

Each command follows a well-defined lifecycle managed by `AcEdCommand`:

1.  The command is **triggered** via `trigger()`
1.  The `commandWillStart` event is fired
1.  The `execute()` method is called with the current context
1.  The `commandEnded` event is fired (always, even if an error occurs)

Internally, this lifecycle is implemented as follows:

```
async trigger(context: AcApContext) {
  try {
    this.onCommandWillStart(context)
    context.view.editor.events.commandWillStart.dispatch({ command: this })
    await this.execute(context)
  } finally {
    context.view.editor.events.commandEnded.dispatch({ command: this })
    this.onCommandEnded(context)
  }
}
```

### Key Guarantees

-   `commandWillStart` is always fired **before** `execute()`

-   `commandEnded` is always fired **after** execution, even if the command throws or is cancelled

-   Commands can hook into lifecycle logic by overriding:

    -   `onCommandWillStart(context)`
    -   `onCommandEnded(context)`

## Creating a Command

All commands should extend the abstract `AcEdCommand` class:

```
import {
  AcEdCommand,
  AcApContext,
  AcApDocManager,
  AcEdPromptPointOptions,
  AcEdPromptDistanceOptions
} from '@mlightcad/cad-simple-viewer'

import { AcDbCircle } from '@mlightcad/data-model'

export class AcApCircleCmd extends AcEdCommand {
  async execute(context: AcApContext) {
    // Prompt for center point
    const centerPrompt = new AcEdPromptPointOptions(
      'Specify center point of circle:'
    )
    const center = await AcApDocManager.instance.editor.getPoint(centerPrompt)

    // Prompt for radius
    const radiusPrompt = new AcEdPromptDistanceOptions(
      'Specify radius of circle:'
    )
    const radius = await AcApDocManager.instance.editor.getDistance(radiusPrompt)

    // Create circle entity and add it to model space
    const db = context.doc.database
    const circle = new AcDbCircle(center, radius)
    db.tables.blockTable.modelSpace.appendEntity(circle)
  }
}
```

### Notes

-   `execute()` receives the current `AcApContext`, which contains:

    -   `context.view`
    -   `context.doc`

-   If you are already inside a command, **always prefer**:

    ```
    context.view.editor
    ```

    instead of accessing the global editor instance.

## Complex Commands (Multi-Branch) with State Machines

For commands with **continuous input + multiple branches + real-time preview** (for example, `PLINE`),
avoid putting all command logic into a single Jig. This quickly becomes hard to maintain.

Recommended approach:

-   **Command logic** is handled by a **state machine** (branch control)
-   **Jig** only handles **preview for the current state**

This separation keeps the command readable and lets you reuse the state machine pattern
in other complex commands.

### Why Use a State Machine

-   Complex commands need to react to multiple keyword branches
-   Each branch has different prompt rules and preview behavior
-   The state machine keeps these concerns local to each state

### Recommended Architecture

```
Command Controller
│
├── State Machine
│    ├── LineState
│    ├── ArcState
│    ├── CloseState
│    ├── UndoState
│    └── ...
│
└── Jig (preview only)
```

### State Machine Base Class

The project provides a reusable state machine helper for prompt-driven commands:

```
export interface AcEdPromptState<TPromptOptions, TResult> {
  buildPrompt(): TPromptOptions
  handleResult(result: TResult): Promise<'continue' | 'finish'> | 'continue' | 'finish'
}

export class AcEdPromptStateMachine<TPromptOptions, TResult> {
  setState(state: AcEdPromptState<TPromptOptions, TResult>): void
  run(getResult: (prompt: TPromptOptions) => Promise<TResult>): Promise<void>
}
```

### Interaction Between State and Jig

-   Each state builds its own prompt options
-   The prompt attaches a Jig for **preview only**
-   The Jig does **not** know about keywords or branching

In other words:

-   The **state** decides what to ask and how to transition
-   The **Jig** only draws the current preview for that state

### Example: Multi-Branch Polyline (Simplified)

```
class LineState implements AcEdPromptState<AcEdPromptPointOptions, AcEdPromptPointResult> {
  buildPrompt() {
    const prompt = new AcEdPromptPointOptions('Specify next point or')
    prompt.keywords.add('Arc(A)', 'Arc', 'Arc')
    prompt.keywords.add('Undo(U)', 'Undo', 'Undo')
    prompt.keywords.add('Close(C)', 'Close', 'Close')
    prompt.jig = new AcApPolylineJig(view, points, bulges)
    return prompt
  }

  async handleResult(result: AcEdPromptPointResult) {
    if (result.status === AcEdPromptStatus.Keyword) {
      if (result.stringResult === 'Arc') machine.setState(new ArcState(machine))
      if (result.stringResult === 'Undo') undo()
      if (result.stringResult === 'Close') return 'finish'
      return 'continue'
    }

    if (result.status === AcEdPromptStatus.OK) {
      appendPoint(result.value!)
      return 'continue'
    }

    return 'finish'
  }
}
```

### Practical Notes

-   Keep the **data model** (points, bulges, preview state) in the command controller
-   Each state should be **small and focused**
-   Prefer `AcEdPromptStateMachine` for shared workflow patterns
-   The command controller owns the **final entity creation**

For a full example, see [the polyline command implementation](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-simple-viewer/src/command/AcApPolylineCmd.ts).

## Listening to Command Lifecycle Events

Command lifecycle events are exposed by the **editor**, not by the command itself.

### Available Editor Events

```
public readonly events = {
  sysVarChanged: new AcCmEventManager<AcDbSysVarEventArgs>(),
  /** Fired just before the command starts executing */
  commandWillStart: new AcCmEventManager<AcEdCommandEventArgs>(),
  /** Fired after the command finishes executing */
  commandEnded: new AcCmEventManager<AcEdCommandEventArgs>()
}
```

### Getting the `AcEditor` Instance

Depending on where you are in the application:

#### From anywhere (global access)

```
const editor =
  AcApDocManager.instance.curView.editor
```

#### Inside a command execution

```
const editor = context.view.editor
```

### Example: Listening to Command Events

```
const editor = AcApDocManager.instance.curView.editor

editor.events.commandWillStart.addEventListener(({ command }) => {
  console.log('Command will start:', command.globalName)
})

editor.events.commandEnded.addEventListener(({ command }) => {
  console.log('Command ended:', command.globalName)
})
```

### Typical Use Cases

-   Tracking command history
-   Updating UI state (toolbars, panels)
-   Locking or unlocking interactions
-   Implementing analytics or telemetry
-   Emulating ObjectARX `commandWillStart` / `commandEnded` behavior

## Command Access Mode

`AcEdCommand` now supports a **minimum access mode requirement**, allowing commands to declare what document access level they need.

### Open Modes

CAD-Viewer supports three document open modes:

```
export enum AcEdOpenMode {
  /** Read-only mode */
  Read = 0,
  /** Review mode (compatible with Read) */
  Review = 4,
  /** Write mode (compatible with Review and Read) */
  Write = 8
}
```

Higher-value modes are compatible with lower-value modes:

-   `Write` ≥ `Review` ≥ `Read`

You can access the current document’s open mode via:

```
context.doc.openMode
```

or

```
AcApDocument.openMode
```

### Setting Command Mode

Each command can declare the **minimum required access mode**:

```
import { AcEdOpenMode } from '@mlightcad/cad-simple-viewer'

export class AcApCircleCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    // write operations
  }
}
```

#### Mode Property

```
get mode(): AcEdOpenMode
set mode(value: AcEdOpenMode)
```

### Behavior

-   A command **can only execute** if:

    ```
    document.openMode >= command.mode
    ```

-   Examples:

    -   A `Write` command **cannot** run in `Read` mode
    -   A `Review` command **can** run in `Write` mode
    -   A `Read` command runs in all modes

This enables:

-   Safe read-only viewers
-   Review-only workflows
-   Strict write protection for editing commands

## Registering a Command

Commands are registered through `AcApDocManager.instance.commandManager`.

```
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcApCircleCmd } from './AcApCircleCmd'

const register = AcApDocManager.instance.commandManager

const circleCommand = new AcApCircleCmd()
circleCommand.globalName = 'CIRCLE'
circleCommand.localName = 'CIRCLE'

register.addCommand(
  'USER',
  circleCommand.globalName,
  circleCommand.localName,
  circleCommand
)
```

### Notes

-   `globalName` must be unique within the command group

-   `localName` is user-facing and can be localized

-   Command groups:

    -   `ACAD` – system commands
    -   `USER` – custom commands

## Command Alias

CAD-Viewer supports AutoCAD-style command aliases (similar to `acad.pgp` behavior).

### Register Alias with `addCommand`

You can provide aliases in the 5th argument of `addCommand`:

```
register.addCommand(
  'USER',
  'MYCMD',
  'MyCmd',
  myCommand,
  ['MC', 'MY']
)
```

Alias rules:

-   Alias matching is case-insensitive (internally normalized to uppercase)
-   Alias must be unique inside the same command group
-   Alias cannot conflict with existing global/local command names in the same group

### Configure Aliases in `AcApDocManager`

`AcApDocManagerOptions` provides `commandAliases` so you can override alias mapping at initialization:

```
AcApDocManager.createInstance({
  commandAliases: {
    LINE: ['L', 'LN'],
    CIRCLE: 'CI',
    ZOOM: ['Z']
  }
})
```

Behavior:

-   If a command has user-configured aliases, they replace built-in defaults for that command
-   If a command is not configured, built-in default aliases are used

### Lookup and UI Behavior

-   `lookupGlobalCmd()` and `lookupLocalCmd()` both support alias lookup
-   `searchCommandsByPrefix()` supports alias prefix matching
-   Command line auto-complete shows aliases in the list, for example:
    `LINE（L, LN） - description`

## Triggering a Command

Once registered, a command can be executed programmatically:

```
AcApDocManager.instance.sendStringToExecute('CIRCLE')
```

## Complete Workflow

1.  Create a command by extending `AcEdCommand`
1.  (Optional) Set the command’s required access `mode`
1.  Register it with `commandManager`
1.   (Optional) Listen to lifecycle events via `AcEditor` if needed
1.  Trigger the command by name or programmatically


## Localizing a Custom Command

In <https://github.com/mlightcad/cad-simple-viewer-example> you can find a full example demonstrating custom commands with localization support.



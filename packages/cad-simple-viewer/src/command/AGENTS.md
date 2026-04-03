# How to Create a Command in CAD Viewer

This guide provides step-by-step instructions for creating a new command in the CAD viewer project. 

## Step 1: Create the Command File

Create a new TypeScript file in the `src/command` directory with the naming convention `AcAp[CommandName]Cmd.ts`.

## Step 2: Define the Command Structure

A typical command consists of:

1. **Imports** - Import necessary classes and types
2. **Jig Class** (optional) - For real-time preview
3. **Command Class** - The main command implementation

### Example Structure

```typescript
import { AcDbEntity, AcGePoint3dLike } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptPointOptions
} from '../editor'
import { AcApI18n } from '../i18n'

// Jig class for real-time preview (optional)
export class AcAp[CommandName]Jig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _entity: AcDbEntity

  constructor(view: AcEdBaseView, /* initial parameters */) {
    super(view)
    // Initialize the entity
  }

  get entity(): AcDbEntity {
    return this._entity
  }

  update(/* parameters to update */) {
    // Update the entity based on user input
  }
}

/**
 * Command to create [description].
 */
export class AcAp[CommandName]Cmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write // Set the appropriate open mode
  }

  async execute(context: AcApContext) {
    // Command implementation
  }
}
```

## Step 3: Implement the Command Logic

1. **Prompt for user input** using prompt options like `AcEdPromptPointOptions`, `AcEdPromptDistanceOptions`, etc.
2. **Handle user input** in an async function
3. **Create the entity** once all required input is collected
4. **Add the entity** to the model space

### Example: Point-based Command

```typescript
async execute(context: AcApContext) {
  // Get first point
  const firstPointPrompt = new AcEdPromptPointOptions(
    AcApI18n.t('jig.[command].firstPoint')
  )
  const firstPoint = await AcApDocManager.instance.editor.getPoint(firstPointPrompt)

  // Get subsequent points
  const nextPointPrompt = new AcEdPromptPointOptions(
    AcApI18n.t('jig.[command].nextPoint')
  )
  nextPointPrompt.useDashedLine = true
  nextPointPrompt.useBasePoint = true
  nextPointPrompt.jig = new AcAp[CommandName]Jig(context.view, firstPoint)
  const nextPoint = await AcApDocManager.instance.editor.getPoint(nextPointPrompt)

  // Create and add entity to model space
  const db = context.doc.database
  const entity = new AcDb[EntityType](/* parameters */)
  db.tables.blockTable.modelSpace.appendEntity(entity)
}
```

## Step 4: Add Internationalization

1. **Add jig prompts** to `src/i18n/[language]/jig.ts`
2. **Add command description** to `src/i18n/[language]/command.ts`

### Example: Jig Prompts (zh/jig.ts)

```typescript
[command]: {
  firstPoint: '指定第一个点：',
  nextPoint: '指定下一个点：'
}
```

### Example: Command Description (zh/command.ts)

```typescript
[command]: {
  description: '命令描述'
}
```

## Step 5: Register the Command

Add the command to the `registerCommands` method in `src/app/AcApDocManager.ts`:

1. **Import the command** in the imports section
2. **Register the command** in the `registerCommands` method

### Example:

```typescript
// Import
export {
  // ... other imports
  AcAp[CommandName]Cmd
} from '../command'

// Register
register.addCommand(
  AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
  '[command]',
  '[command]',
  new AcAp[CommandName]Cmd()
)
```

## Step 6: Update the Command Index

Add the command to the exports in `src/command/index.ts`:

```typescript
export * from './AcAp[CommandName]Cmd'
```

## Best Practices

1. **Use consistent naming conventions**
2. **Implement real-time preview** using a Jig class when appropriate
3. **Handle user cancellation** gracefully
4. **Provide clear prompts** using internationalization
5. **Follow the existing code patterns**


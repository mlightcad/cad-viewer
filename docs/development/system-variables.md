---
title: "System Variables"
---

# System Variables

This page explains how system variables work in MLightCAD, how users can change them from the command line, and how they are implemented through `AcDbSystemVariables` and `AcDbSysVarManager`.

## What Is a System Variable

A `system variable` is a global setting that controls how parts of the CAD system behave.

Commands usually start an action, create geometry, or open a dialog. System variables do something different: they control command behavior, default values, drawing state, or user interface behavior.

Typical examples include:

- which layer new entities should be created on
- what default color, lineweight, or linetype scale should be used
- whether a display mode is enabled
- how the editor or viewer should respond visually

This is intentionally similar to AutoCAD. In MLightCAD, you can set a system variable directly from the command line by entering the variable name, then entering its new value.

For example:

```text
Command: PICKBOX
New value for PICKBOX <3>: 5
```

That means the command line treats the system variable name itself as the command used to update that setting.

MLightCAD adopts this model so runtime settings can be read, changed, and observed through one consistent mechanism instead of being hardcoded across command logic.

## Setting a System Variable from the Command Line

The command-line workflow is simple:

1. Type the system variable name.
2. Press Enter.
3. Enter the new value.
4. Press Enter again to apply it.

This is the same interaction pattern many CAD users already know from AutoCAD.

For example, to change the current layer:

```text
Command: CLAYER
New value for CLAYER <0>: Walls
```

To change the pickbox size:

```text
Command: PICKBOX
New value for PICKBOX <3>: 10
```

In other words, assigning a system variable does not require a separate `SETVAR`-style workflow. You can directly enter the system variable name in the command line and assign a new value to it.

## How System Variables Are Registered as Commands

In MLightCAD, system variables can be used from the command line because they are registered as normal commands during application initialization.

The registration happens in `AcApDocManager`. It loads all system variable descriptors from `AcDbSysVarManager` and registers each variable name as a command:

```ts
const sysVars = AcDbSysVarManager.instance().getAllDescriptors()
sysVars.forEach(sysVar => {
  register.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    sysVar.name,
    sysVar.name,
    new AcApSysVarCmd()
  )
})
```

This means:

- every registered system variable becomes a command automatically
- the command name is the system variable name itself, such as `CLAYER` or `PICKBOX`
- all of these commands share the same command implementation: `AcApSysVarCmd`

`AcApSysVarCmd` does not hardcode a specific variable. Instead, when it runs, it uses the current command name (`this.globalName`) to look up the matching system variable descriptor, prompts the user for a new value, and then calls `setVar(...)`.

Its flow is effectively:

`system variable name entered` -> `AcApSysVarCmd.execute()` -> prompt for value -> `AcDbSysVarManager.setVar(...)`

So there are two layers involved:

- `AcDbSysVarManager` decides which system variables exist at runtime
- `AcApDocManager` exposes those runtime variables as command-line commands

That is why adding support for a new system variable usually starts with registering its descriptor in `AcDbSysVarManager`. Once it is included in `getAllDescriptors()`, it can also be registered into the command stack and used directly from the command line.

## How It Is Designed in MLightCAD

The current implementation is centered on two files:

- [AcDbSystemVariables](https://mlightcad.github.io/realdwg-web/variables/_mlightcad_data-model.AcDbSystemVariables.html)
- [AcDbSysVarManager](https://mlightcad.github.io/realdwg-web/classes/_mlightcad_data-model.AcDbSysVarManager.html)

They serve different purposes.

### 1. `AcDbSystemVariables`

`AcDbSystemVariables` is the canonical list of system variable name constants.

Its main roles are:

- providing a single source of truth for variable names
- avoiding hardcoded strings throughout the codebase
- giving callers a type-safe way to reference variables
- supporting derived types such as `AcDbSystemVariableName`

It is best understood as the system variable name registry in MLightCAD.

### 2. `AcDbSysVarManager`

`AcDbSysVarManager` is the runtime manager for system variables. It is responsible for:

- registering variable descriptors
- storing type and default-value metadata
- exposing unified `getVar` and `setVar` access
- caching non-database variables
- dispatching change events

It is effectively the registry, access layer, and event hub for system variables.

## Two Kinds of System Variables

In the current design, system variables fall into two categories.

### Database-resident variables

These variables live on `AcDbDatabase`. `AcDbSysVarManager` reads and writes them by mapping the variable name to a database field.

Currently registered examples include:

- `CECOLOR`
- `CELTSCALE`
- `CELWEIGHT`
- `CLAYER`
- `LWDISPLAY`

These are closer to drawing state and default drawing properties.

### Non-database variables

These variables are not stored directly on `AcDbDatabase`. They are cached inside `AcDbSysVarManager`.

Currently registered examples include:

- `COLORTHEME`
- `PICKBOX`
- `WHITEBKCOLOR`

These are closer to editor behavior or UI state.

## Why This Split Matters

Separating the two kinds of variables has two immediate benefits:

- drawing-related settings can remain attached to the database model
- host-application or UI-related settings do not need to be forced into the database layer

That lets system variables serve both the data model and the editor layer cleanly.

## Core Capabilities in the Current Implementation

### Unified access

Callers do not need to know whether a variable is stored in the database or in manager-owned runtime cache. They can use the same access API in both cases:

```ts
const sysVarManager = AcDbSysVarManager.instance()

const currentLayer = sysVarManager.getVar('CLAYER', db)
sysVarManager.setVar('CLAYER', 'Walls', db)
sysVarManager.setVar('PICKBOX', 12, db)
```

### Type conversion

`setVar` performs basic conversion based on the registered descriptor type. The current implementation supports conversion for values such as:

- `number`
- `boolean`
- `color`

This is useful when values come from command-line input, forms, or scripts and initially arrive as strings.

### Change notification

`AcDbSysVarManager` exposes a `sysVarChanged` event so higher-level modules can react to system variable updates.

```ts
AcDbSysVarManager.instance().events.sysVarChanged.addEventListener(args => {
  console.log(args.name, args.oldVal, args.newVal)
})
```

In the current implementation, this event is primarily dispatched for non-database variable changes, which makes it especially suitable for editor and UI synchronization.

## Example: `PICKBOX`

`PICKBOX` represents the half-size of the pickbox in pixels. It is a non-database variable, but it directly affects user interaction behavior.

In `cad-viewer`, `AcEdCursorManager` listens for `PICKBOX` changes. When the value changes, it rebuilds the rectangular part of the crosshair cursor and reapplies the active cursor immediately. This shows that a system variable is not just stored configuration data; it can also act as a driver for live UI behavior.

Reference implementation:

- [AcEdCursorManager.ts](https://raw.githubusercontent.com/mlightcad/cad-viewer/main/packages/cad-simple-viewer/src/editor/input/AcEdCursorManager.ts)

The flow is:

`setVar('PICKBOX', ...)` -> `sysVarChanged` event -> cursor manager updates cursor appearance

This is one of the clearest examples of why the abstraction is useful.

## One Important Detail in the Current Code

`AcDbSystemVariables.ts` defines the canonical set of recognized variable names, but `AcDbSysVarManager` currently registers only a subset of them in its constructor.

In other words:

- `AcDbSystemVariables` is the name catalog
- `AcDbSysVarManager.registry` determines which variables are actually supported at runtime

That is a reasonable evolution path: define names first, then gradually add type metadata, defaults, storage strategy, and behavior as each variable becomes supported.

## Recommended Extension Pattern

When adding more system variables in the future, the recommended workflow is:

1. Add the variable name constant to `AcDbSystemVariables`
2. Register the descriptor in `AcDbSysVarManager`
3. Decide whether it is database-resident or runtime-only
4. Define its type, default value, and description
5. If it should affect commands or UI, prefer event-driven integration over hardcoded checks in business logic

## How to Add a New System Variable

Adding a new system variable usually involves five steps.

### 1. Add the variable name to `AcDbSystemVariables`

First, add a new canonical name constant in `AcDbSystemVariables`.

This keeps the variable name centralized and avoids scattering hardcoded strings across the codebase.

For example:

```ts
export const MYNEWVAR = 'MYNEWVAR'
```

### 2. Register the descriptor in `AcDbSysVarManager`

Next, register the variable in `AcDbSysVarManager`. This is the step that makes the variable actually supported at runtime.

When registering it, define:

- its name
- its type
- its default value
- whether its value is stored on `AcDbDatabase` or only in the manager cache
- any description or metadata required by the descriptor model

This is the most important step. If a variable exists only in `AcDbSystemVariables` but is not registered in `AcDbSysVarManager`, it is only a name constant, not a usable system variable.

`AcApDocManager` will register all of registered system variables as a command automatically during initialization.

That means a newly added variable can usually be used from the command line without writing a dedicated command class.

The command-line flow then becomes:

```text
Command: MYNEWVAR
New value for MYNEWVAR <default>: ...
```

### 3. Choose the storage model

You should then decide whether the new variable is:

- database-resident, if it belongs to drawing state or drawing defaults
- non-database, if it belongs to editor behavior, UI preferences, or application runtime state

If it is database-resident, `AcDbSysVarManager` must be able to map it to a field on `AcDbDatabase`.

If it is non-database, `AcDbSysVarManager` can keep it in its internal runtime cache.

As a rule of thumb:

- use database-resident variables for things like current layer or current color
- use non-database variables for things like pickbox size or color theme

### 4. Connect behavior if needed

If changing the variable should affect UI or editor behavior immediately, add the corresponding logic in the consumer module.

The preferred pattern is to react to `sysVarChanged` instead of checking the variable manually in many places.

`PICKBOX` is a good example of this pattern:

- the variable is registered in `AcDbSysVarManager`
- the command system exposes it in the command line
- `AcEdCursorManager` listens for changes and updates the cursor immediately

So, in practice, the minimal path for a new variable is:

1. Define its name in `AcDbSystemVariables`
2. Register its descriptor in `AcDbSysVarManager`
3. Decide its storage strategy
4. Optionally connect listeners or business logic that react to its value

After that, it can participate in the same unified `getVar` / `setVar` workflow as the built-in system variables.

## Summary

In MLightCAD, system variables are more than a loose collection of settings. They form a unified abstraction for application state:

- downward, they map to drawing-related database state
- upward, they drive editor and UI behavior
- in the middle, they provide centralized access, type constraints, and change notification

If a command answers "what to do", a system variable answers "under what settings or mode it should be done".



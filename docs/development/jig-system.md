---
title: "Jig System"
---

# Jig System

AutoCAD relies on the AcEdJig framework to provide real-time visual feedback while acquiring user input. While powerful, that system separates prompting, preview rendering, and input sampling across multiple overridden methods—often spreading logic across different functions and lifecycle stages. CAD-Viewer reimagines this concept for the web by introducing a unified, TypeScript-driven jig mechanism that integrates seamlessly with prompt input. Instead of managing drag loops or sampler status codes, developers attach a jig directly to prompt options, keeping dynamic preview logic, user input, and final entity creation together in a single, readable workflow.

## Overview

The **Jig system** in CAD-Viewer enables interactive previews and dynamic entity creation, offering a workflow similar to AutoCAD’s **AcEdJig** (ObjectARX). A *jig* manages a temporary preview entity that updates continuously based on cursor movement or incremental user input.

Use cases include:

* Interactive geometry creation (point, circle, polyline, etc.)
* Live distance or angle measurement
* Real‑time modification of existing entities

However, CAD-Viewer introduces a **simpler, more cohesive, and more TypeScript‑friendly design**, reducing the structural complexity typically found in AutoCAD jigs.


## Key Architectural Difference

### Jig Is Passed Into Prompt Options

In AutoCAD, prompts and jigs are separate mechanisms. Jig execution requires overriding `sampler()`, `worldDraw()`, and calling `drag()`.

In CAD-Viewer, prompts can directly **carry a jig instance**:

```ts
const opts = new AcEdPromptDistanceOptions('Specify radius:')
opts.jig = new CircleJig(view, center)
const radius = await editor.getDistance(opts)
```

This design:

* Automatically links user input to live preview
* Eliminates manual drag‑loop management

➡️ Result: **less boilerplate, more consistency**.

---

### Complete Dynamic Input Logic Stays Together

As you can see in [AutoCAD AcEdJig Sample Code](https://help.autodesk.com/view/OARX/2023/ENU/?guid=GUID-9BF40890-7F1D-4EA3-9767-B6659B8E24FC), AutoCAD separates input logic to create one ellipse into multiple places.

* `createEllipse()` — acquire ellipse center point
* `sampler()` — acquire the major axis endpoint and the distance from ellipse center to minor axis endpoint

In CAD-Viewer, the entire dynamic input workflow is expressed sequentially as follows.

```ts
const center = await editor.getPoint(pointOpts)
radiusOpts.jig = new CircleJig(view, center)
const radius = await editor.getDistance(radiusOpts)
```

➡️ User input, jig preview, and final geometry are managed in the **same block of code**.


## Key Concepts

### Generic Jig (`AcEdPreviewJig<T>`)

`AcEdPreviewJig<T>` is a TypeScript-based class that manages transient preview entities:

| AutoCAD AcEdJig | Web CAD Jig (`AcEdPreviewJig`)      |
| --------------- | ----------------------------------- |
| `sampler()`     | `update(value: T)`                  |
| `startJig()`    | `setEntity()`                       |
| `drag()`        | Controlled externally via JS events |

**Features:**

-   Uses a generic type `T` to handle multiple input types (point, distance, angle, etc.)
-   Integrates with `AcEdBaseView` to render transient entities
-   Supports preview entities implementing `onJigUpdate(value: T)` for dynamic geometry updates
-   Allows clean termination of the jig using `end()`

* * *

### Core Methods

#### `update(value: T): void`

Updates the preview entity according to user input. This is the equivalent of AutoCAD's `sampler()`.

#### `render(): void`

Renders the preview entity in the associated view, similar to AutoCAD’s `worldDraw()`.

#### `end(): void`

Clears the transient entity and finalizes the jig session.

#### `entity: AcDbEntity | null`

Getter for the current preview entity.

## Using Jigs

### Step 1: Create a Jig Class

You need to create a class extending `AcEdPreviewJig<T>` for the specific entity. For example, creating a **circle jig**:

```ts
import { AcDbCircle, AcGePoint3dLike } from '@mlightcad/data-model'
import { AcEdPreviewJig, AcEdBaseView } from '@mlightcad/cad-simple-viewer'

export class AcApCircleJig extends AcEdPreviewJig<number> {
  private _circle: AcDbCircle

  constructor(view: AcEdBaseView, center: AcGePoint3dLike) {
    super(view)
    this._circle = new AcDbCircle(center, 0)
  }

  get entity(): AcDbCircle {
    return this._circle
  }

  update(radius: number) {
    this._circle.radius = radius
  }
}
```

**Explanation:**

-   The jig manages a transient `AcDbCircle`.
-   The `update` method dynamically changes the radius based on user input.

* * *

### Step 2: Use the Jig in a Command

You can integrate the jig in a command to interactively create the entity:

```ts
import { AcEdCommand, AcApDocManager, AcEdPromptPointOptions, AcEdPromptDistanceOptions } from '@mlightcad/cad-simple-viewer'
import { AcApCircleJig } from './AcApCircleJig'

export class AcApCircleCmd extends AcEdCommand {
  async execute(context) {
    // Step 2a: Acquire center point
    const centerPrompt = new AcEdPromptPointOptions('Specify center of circle:')
    const center = await AcApDocManager.instance.editor.getPoint(centerPrompt)

    // Step 2b: Acquire radius using Jig
    const radiusPrompt = new AcEdPromptDistanceOptions('Specify radius of circle:')
    radiusPrompt.jig = new AcApCircleJig(context.view, center)
    const radius = await AcApDocManager.instance.editor.getDistance(radiusPrompt)

    // Step 2c: Add circle to database
    const circle = new AcDbCircle(center, radius)
    context.doc.database.tables.blockTable.modelSpace.appendEntity(circle)
  }
}
```

**Workflow:**

1.  Prompt user for the **center** of the circle.
1.  Create a **circle jig** attached to the center.
1.  Prompt user for the **radius**, with interactive preview.
1.  Commit the finalized circle to the database.

* * *

## User Input

For a complete and up-to-date guide to AcEditor input APIs, prompt options,
keyword rules, and prompt result handling, see:

[User Input](./user-input)

## References

-   [AutoCAD AcEdJig Documentation](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-CF581B82-FF80-42C6-9E9C-2394B7A96076)
-   [AutoCAD AcEdJig Drag Loop](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-E0A88178-CEE6-4983-950C-119CED7BA474)
-   [AutoCAD AcEdJig Sample Code](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-9BF40890-7F1D-4EA3-9767-B6659B8E24FC)



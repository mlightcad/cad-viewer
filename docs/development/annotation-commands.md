---
title: "Annotation Commands"
---

# Annotation Commands

This page introduces how **annotation commands** are implemented in `cad-viewer`, including both the **command layer** and the **UI interaction layer**.  
The design closely follows AutoCAD-like concepts such as *system variables*, *current layer*, and *entity draw styles*.

## Overview

Annotations in `cad-viewer` (such as annotation circles, rectangles, cloud rectangles, sketches, etc.) are implemented as:

-   Specialized **commands** derived from a common base class
-   **Entities** created dynamically on a dedicated annotation layer
-   **Draw styles** controlled by system variables instead of layer styles
-   A **temporary UI toolbar** that modifies system variables during command execution

This approach ensures:

-   Consistent behavior across all annotation commands
-   Easy show/hide of all annotations
-   AutoCAD-style workflow familiarity

## Command Part

### Base Command Class

All annotation-related commands inherit from the same base class:

-   [`AcApBaseRevCmd`](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-simple-viewer/src/command/AcApBaseRevCmd.ts)

This base class centralizes common behaviors, such as:

-   Annotation layer management
-   System variable backup & restore
-   Command lifecycle handling (start / end / cancel)

By inheriting from `AcApBaseRevCmd`, all annotation commands follow the same execution pattern and system-variable behavior.

### Annotation Layer Management

All annotation entities are created on a **dedicated annotation layer**, which is:

-   **Created dynamically** if it does not exist
-   Used only during annotation command execution

Behind the scenes, this is achieved by manipulating the system variable:

-   `clayer` (current layer)

#### Workflow

1.  Before creating an annotation entity:

    -   The original value of `clayer` is saved
    -   `clayer` is switched to the annotation layer

1.  Annotation entities are created

1.  After command finishes (or is canceled):

    -   `clayer` is restored to its original value

This guarantees:

-   Annotations are always placed on the correct layer
-   User layer state is not permanently modified

### Show / Hide Annotations

Hiding or displaying annotations is implemented simply by:

-   **Hiding or displaying the annotation layer**

No per-entity visibility logic is required.  
This makes annotation visibility management efficient and consistent.

### Entity Draw Style Resolution

Annotation entities **do not use layer styles** for their appearance.

Instead, their draw styles are resolved from **system variables**, including:

-   `cecolor` — current entity color
-   `celweight` — current entity line weight

This design allows:

-   Each annotation to keep its visual style at creation time
-   Layer style changes not affecting existing annotations

## UI Part

### Entity Draw Style Toolbar

When creating an annotation entity, the following UI component is shown:

-   [`MlEntityDrawStyleToolbar`](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-editor/src/component/layout/MlEntityDrawStyleToolbar.vue)

#### Behavior

-   Appears at the **top center** of the viewer

-   Allows users to modify:

    -   Color
    -   Line weight
    -   Other entity draw styles

Because this toolbar overlaps with the file name display:

-   The **file name is temporarily hidden** while the toolbar is visible

### System Variable Binding

User interactions with `MlEntityDrawStyleToolbar` directly modify system variables, such as:

-   `cecolor`
-   `celweight`

These system variables are then used by annotation entities during creation, ensuring:

-   What the user sees in the toolbar matches what is drawn
-   Annotation behavior is consistent with AutoCAD-style workflows

### System Variable Restore

After an annotation command finishes (successfully or not):

-   Modified system variables (`cecolor`, `celweight`, etc.) are restored to their original values

This ensures:

-   Annotation commands do not permanently affect global drawing state
-   Users can safely switch between annotation and normal drawing commands

## Summary

The annotation system in `cad-viewer` is built around three key ideas:

1.  **Command inheritance**

    -   All annotation commands share a common base implementation

1.  **Layer-based organization**

    -   All annotations live on a dynamically managed annotation layer

1.  **System-variable-driven styles**

    -   Draw styles are controlled via system variables, not layer styles

This architecture provides:

-   Predictable command behavior
-   Easy annotation management
-   A familiar CAD-like user experience


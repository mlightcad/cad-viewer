---
title: "User Input"
---

# User Input

This page explains how AcEditor gathers user inputs, including the available input methods, shared prompt option patterns (messages, keywords, jigs, and rubber‑band behavior), keyword matching rules, and how to interpret prompt results. It also clarifies the intended usage: input should be acquired through AcEditor APIs rather than manual mouse/keyboard listeners on the canvas.

**Purpose**

AcEditor mirrors the structure and intent of AutoCAD’s editor input APIs. It provides a high‑level, consistent way to acquire user input while coordinating dynamic prompts, keywords, and preview jigs. Input handling is intentionally centralized: keyword parsing and mouse interactions are abstracted away and must be accessed through AcEditor methods. Although you can technically listen to keyboard or mouse events directly on `AcEdBaseView.canvas`, that is considered incorrect usage and will bypass the editor’s input lifecycle, keyword handling, and prompt result conventions.

**Input Methods**

| Method | Options Type | Result Type | Typical Use |
| --- | --- | --- | --- |
| `getPoint` | `AcEdPromptPointOptions` | `AcEdPromptPointResult` | Point acquisition |
| `getDistance` | `AcEdPromptDistanceOptions` | `AcEdPromptDoubleResult` | Distance input with optional base point |
| `getAngle` | `AcEdPromptAngleOptions` | `AcEdPromptDoubleResult` | Angle input with optional base point |
| `getDouble` | `AcEdPromptDoubleOptions` | `AcEdPromptDoubleResult` | Numeric input (float) |
| `getString` | `AcEdPromptStringOptions` | `AcEdPromptResult` | Free‑text input |
| `getKeywords` | `AcEdPromptKeywordOptions` | `string` | Keyword‑only input (returns global keyword) |
| `getEntity` | `AcEdPromptEntityOptions` | `AcEdPromptEntityResult` | Pick one entity |
| `getSelection` | `AcEdPromptSelectionOptions` | `AcEdPromptSelectionResult` | Pick multiple entities |
| `getBox` | `AcEdPromptBoxOptions` | `AcEdPromptBoxResult` | Pick two corners to define a box |

**Common Prompt Options**

All prompt option types derive from `AcEdPromptOptions<T>` and share these capabilities:

- `message`: The prompt text shown to the user.
- `keywords`: An `AcEdKeywordCollection` holding valid keywords.
- `appendKeywordsToMessage`: When true, keywords are appended to the message for display.
- `jig`: Attach an `AcEdPreviewJig<T>` to enable live preview during input.
- `setMessageAndKeywords(messageAndKeywords, globalKeywords)`: Parses a combined message like `"Pick point [Yes/No]"` and assigns global keywords from a space‑separated list.

**Rubber‑Band and Base‑Point Settings**

Several prompt options support a rubber‑band line or base‑point behavior:

- `AcEdPromptPointOptions`: `basePoint`, `useBasePoint`, `useDashedLine`, `allowNone`.
- `AcEdPromptDistanceOptions`: `basePoint`, `useBasePoint`, `useDashedLine`, `only2d`.
- `AcEdPromptAngleOptions`: `basePoint`, `useBasePoint`, `useDashedLine`, `useAngleBase`.
- `AcEdPromptBoxOptions`: `useBasePoint`, `useDashedLine` and separate `firstCornerMessage` / `secondCornerMessage`.

When `useBasePoint` is true, the editor draws a rubber‑band line from the base point to the cursor. `useDashedLine` controls whether that line is dashed.

**Keyword Rules and Formats**

Keywords are defined via `AcEdKeywordCollection` and are matched case‑insensitively. The resolved value is always the keyword’s **global name**.

- Each keyword has a `displayName` (UI), a `globalName` (internal), and a `localName` (user input).
- Users can input `localName`, `globalName`, display text, or a derived alias; all are matched case‑insensitively.
- Alias is derived from capital letters in the global name, for example `Yes → Y`, `sAve → A`, `eXit → X`.
- Prefixing input with `_` forces a global keyword match.

You can define keywords in two common ways:

- API usage: `options.keywords.add(displayName, globalName, localName)`.
- ObjectARX‑style string list (for `AcEdKeywordCollection` constructor): local and global sections separated by `_`, optional comma abbreviation, and uppercase letters define alias.

Examples:

```ts
const opts = new AcEdPromptPointOptions('Pick point')
opts.keywords.add('Yes', 'Yes', 'Y')
opts.keywords.add('No', 'No', 'N')
```

```ts
const keywords = new AcEdKeywordCollection('Ja Nein _ Yes No')
```

**Prompt Results**

Most input methods return a `PromptResult`‑style object that includes:

- `status`: An `AcEdPromptStatus` code such as `OK`, `Cancel`, or `Keyword`.
- `stringResult`: When `status === Keyword`, this holds the **global keyword** that was matched.

Type‑specific result classes provide a typed `value` when `status === OK`:

| Result Type | Value Field | Notes |
| --- | --- | --- |
| `AcEdPromptPointResult` | `value: AcGePoint3dLike` | Point when OK |
| `AcEdPromptDoubleResult` | `value: number` | Double when OK |
| `AcEdPromptEntityResult` | `objectId: AcDbObjectId` | Selected entity ID |
| `AcEdPromptSelectionResult` | `value: AcEdSelectionSet` | Selection set |
| `AcEdPromptBoxResult` | `value: AcGeBox2d` | Bounding box |

Note: `getKeywords` returns the keyword string directly instead of a `PromptResult` object.

**Example: Point with Keywords**

```ts
const opts = new AcEdPromptPointOptions('Pick point or [Yes/No]:')
opts.keywords.add('Yes', 'Yes', 'Y')
opts.keywords.add('No', 'No', 'N')

const result = await editor.getPoint(opts)
if (result.status === AcEdPromptStatus.Keyword) {
  console.log('Keyword:', result.stringResult)
} else if (result.status === AcEdPromptStatus.OK) {
  console.log('Point:', result.value)
}
```



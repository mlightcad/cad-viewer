---
title: "用户输入"
---

# 用户输入

本页说明 AcEditor 如何获取用户输入，包括可用的输入方法、共享的提示选项模式（消息、关键字、jig 和橡皮筋行为）、关键字匹配规则，以及如何解释提示结果。同时阐明预期的用法：应通过 AcEditor API 获取输入，而不是在画布上手动监听鼠标/键盘事件。

**用途**

AcEditor 的结构和意图与 AutoCAD 的编辑器输入 API 相仿。它提供一种高层次、一致的方式来获取用户输入，同时协调动态提示、关键字和预览 jig。输入处理有意集中化：关键字解析和鼠标交互被抽象出来，必须通过 AcEditor 方法访问。尽管从技术上你可以直接在 `AcEdBaseView.canvas` 上监听键盘或鼠标事件，但这被视为错误用法，会绕过编辑器的输入生命周期、关键字处理和提示结果约定。

**输入方法**

| 方法 | 选项类型 | 结果类型 | 典型用途 |
| --- | --- | --- | --- |
| `getPoint` | `AcEdPromptPointOptions` | `AcEdPromptPointResult` | 获取点 |
| `getDistance` | `AcEdPromptDistanceOptions` | `AcEdPromptDoubleResult` | 输入距离，可选基点 |
| `getAngle` | `AcEdPromptAngleOptions` | `AcEdPromptDoubleResult` | 输入角度，可选基点 |
| `getDouble` | `AcEdPromptDoubleOptions` | `AcEdPromptDoubleResult` | 数值输入（浮点数） |
| `getString` | `AcEdPromptStringOptions` | `AcEdPromptResult` | 自由文本输入 |
| `getKeywords` | `AcEdPromptKeywordOptions` | `string` | 仅关键字输入（返回全局关键字） |
| `getEntity` | `AcEdPromptEntityOptions` | `AcEdPromptEntityResult` | 选择一个实体 |
| `getSelection` | `AcEdPromptSelectionOptions` | `AcEdPromptSelectionResult` | 选择多个实体 |
| `getBox` | `AcEdPromptBoxOptions` | `AcEdPromptBoxResult` | 选择两个角点定义框 |

**通用提示选项**

所有提示选项类型都派生自 `AcEdPromptOptions<T>`，并共享以下能力：

- `message`：向用户显示的提示文本。
- `keywords`：保存有效关键字的 `AcEdKeywordCollection`。
- `appendKeywordsToMessage`：为 true 时，关键字会附加到消息中显示。
- `jig`：附加一个 `AcEdPreviewJig<T>`，以便在输入期间启用实时预览。
- `setMessageAndKeywords(messageAndKeywords, globalKeywords)`：解析类似 `"Pick point [Yes/No]"` 的组合消息，并从空格分隔的列表中分配全局关键字。

**橡皮筋和基点设置**

若干提示选项支持橡皮筋线或基点行为：

- `AcEdPromptPointOptions`：`basePoint`、`useBasePoint`、`useDashedLine`、`allowNone`。
- `AcEdPromptDistanceOptions`：`basePoint`、`useBasePoint`、`useDashedLine`、`only2d`。
- `AcEdPromptAngleOptions`：`basePoint`、`useBasePoint`、`useDashedLine`、`useAngleBase`。
- `AcEdPromptBoxOptions`：`useBasePoint`、`useDashedLine` 以及单独的 `firstCornerMessage` / `secondCornerMessage`。

当 `useBasePoint` 为 true 时，编辑器会从基点到光标绘制一条橡皮筋线。`useDashedLine` 控制该线是否为虚线。

**关键字规则和格式**

关键字通过 `AcEdKeywordCollection` 定义，并以不区分大小写的方式匹配。解析后的值始终是关键字的**全局名称**。

- 每个关键字都有一个 `displayName`（UI）、一个 `globalName`（内部）和一个 `localName`（用户输入）。
- 用户可以输入 `localName`、`globalName`、显示文本或派生别名；所有这些都以不区分大小写的方式匹配。
- 别名由全局名称中的大写字母派生，例如 `Yes → Y`、`sAve → A`、`eXit → X`。
- 在输入前加上 `_` 可强制按全局关键字匹配。

你可以通过两种常见方式定义关键字：

- API 用法：`options.keywords.add(displayName, globalName, localName)`。
- ObjectARX 风格的字符串列表（用于 `AcEdKeywordCollection` 构造函数）：本地和全局部分用 `_` 分隔，可选逗号缩写，大写字母定义别名。

示例：

```ts
const opts = new AcEdPromptPointOptions('Pick point')
opts.keywords.add('Yes', 'Yes', 'Y')
opts.keywords.add('No', 'No', 'N')
```

```ts
const keywords = new AcEdKeywordCollection('Ja Nein _ Yes No')
```

**提示结果**

大多数输入方法返回 `PromptResult` 风格的对象，其中包含：

- `status`：`AcEdPromptStatus` 状态码，例如 `OK`、`Cancel` 或 `Keyword`。
- `stringResult`：当 `status === Keyword` 时，保存匹配到的**全局关键字**。

当 `status === OK` 时，类型特定的结果类会提供有类型的 `value`：

| 结果类型 | 值字段 | 说明 |
| --- | --- | --- |
| `AcEdPromptPointResult` | `value: AcGePoint3dLike` | OK 时为点 |
| `AcEdPromptDoubleResult` | `value: number` | OK 时为双精度数 |
| `AcEdPromptEntityResult` | `objectId: AcDbObjectId` | 所选实体 ID |
| `AcEdPromptSelectionResult` | `value: AcEdSelectionSet` | 选择集 |
| `AcEdPromptBoxResult` | `value: AcGeBox2d` | 包围盒 |

注意：`getKeywords` 直接返回关键字字符串，而不是 `PromptResult` 对象。

**示例：带关键字的点输入**

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


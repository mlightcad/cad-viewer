---
title: "コマンド"
---

# MLightCAD でのカスタムコマンドの作成

このページでは、**MLightCAD** でカスタムコマンドを作成し、ユーザーが実行できるように登録する方法について説明します。

## 概要

コマンドは、ユーザーが MLightCAD を操作するための主要な手段です。各コマンドは、線の描画、円の作成、ズーム、オブジェクトの選択など、特定の操作を表します。

システムは、コマンドをグループ単位で管理し、名前で検索し、エディタを通じてライフサイクルイベントを処理するための**コマンドスタック**（`AcEdCommandStack`）を提供します。

## コマンドのライフサイクル

各コマンドは、`AcEdCommand` によって管理される明確なライフサイクルに従います：

1.  コマンドは `trigger()` を介して**トリガー**されます
1.  `commandWillStart` イベントが発火します
1.  `execute()` メソッドが現在のコンテキストで呼び出されます
1.  `commandEnded` イベントが発火します（エラーが発生した場合でも常に発火します）

内部的には、このライフサイクルは次のように実装されています：

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

### 主な保証

-   `commandWillStart` は常に `execute()` の**前**に発火します

-   `commandEnded` は、コマンドが例外をスローした場合やキャンセルされた場合でも、実行後に常に発火します

-   コマンドは次のメソッドをオーバーライドすることで、ライフサイクルロジックにフックできます：

    -   `onCommandWillStart(context)`
    -   `onCommandEnded(context)`

## コマンドの作成

すべてのコマンドは抽象クラス `AcEdCommand` を拡張する必要があります：

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

### 注意事項

-   `execute()` は現在の `AcApContext` を受け取ります。これには次が含まれます：

    -   `context.view`
    -   `context.doc`

-   すでにコマンド内にいる場合は、グローバルなエディタインスタンスにアクセスする代わりに、**常に次を優先**してください：

    ```
    context.view.editor
    ```

## ステートマシンを使用した複雑なコマンド（マルチブランチ）

**継続的な入力 + 複数のブランチ + リアルタイムプレビュー**を伴うコマンド（例：`PLINE`）では、すべてのコマンドロジックを単一の Jig に詰め込まないでください。すぐに保守が困難になります。

推奨されるアプローチ：

-   **コマンドロジック**は**ステートマシン**（ブランチ制御）で処理します
-   **Jig** は**現在のステートのプレビューのみ**を処理します

この分離によりコマンドの可読性が保たれ、他の複雑なコマンドでもステートマシンパターンを再利用できます。

### ステートマシンを使用する理由

-   複雑なコマンドは複数のキーワードブランチに反応する必要があります
-   各ブランチには異なるプロンプトルールとプレビュー動作があります
-   ステートマシンにより、これらの関心事を各ステート内に局所化できます

### 推奨されるアーキテクチャ

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

### ステートマシンの基底クラス

このプロジェクトは、プロンプト駆動型コマンド用の再利用可能なステートマシンヘルパーを提供します：

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

### ステートと Jig の相互作用

-   各ステートは独自のプロンプトオプションを構築します
-   プロンプトは**プレビュー専用**の Jig をアタッチします
-   Jig はキーワードや分岐を**認識しません**

言い換えれば：

-   **ステート**が何を尋ね、どのように遷移するかを決定します
-   **Jig** はそのステートの現在のプレビューを描画するだけです

### 例：マルチブランチポリライン（簡略版）

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

### 実践的な注意事項

-   **データモデル**（点、バルジ、プレビュー状態）はコマンドコントローラーに保持します
-   各ステートは**小さく、焦点を絞った**ものにする必要があります
-   共通のワークフローパターンには `AcEdPromptStateMachine` を優先します
-   コマンドコントローラーが**最終的なエンティティ作成**を所有します

完全な例については、[ポリラインコマンドの実装](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-simple-viewer/src/command/AcApPolylineCmd.ts) を参照してください。

## コマンドライフサイクルイベントのリッスン

コマンドライフサイクルイベントは、コマンド自体ではなく**エディタ**によって公開されます。

### 利用可能なエディタのイベント

```
public readonly events = {
  sysVarChanged: new AcCmEventManager<AcDbSysVarEventArgs>(),
  /** Fired just before the command starts executing */
  commandWillStart: new AcCmEventManager<AcEdCommandEventArgs>(),
  /** Fired after the command finishes executing */
  commandEnded: new AcCmEventManager<AcEdCommandEventArgs>()
}
```

### `AcEditor` インスタンスの取得

アプリケーション内の場所に応じて：

#### どこからでも（グローバルアクセス）

```
const editor =
  AcApDocManager.instance.curView.editor
```

#### コマンド実行内

```
const editor = context.view.editor
```

### 例：コマンドイベントのリッスン

```
const editor = AcApDocManager.instance.curView.editor

editor.events.commandWillStart.addEventListener(({ command }) => {
  console.log('Command will start:', command.globalName)
})

editor.events.commandEnded.addEventListener(({ command }) => {
  console.log('Command ended:', command.globalName)
})
```

### 一般的なユースケース

-   コマンド履歴の追跡
-   UI 状態（ツールバー、パネル）の更新
-   操作のロックまたはロック解除
-   分析やテレメトリの実装
-   ObjectARX の `commandWillStart` / `commandEnded` 動作のエミュレート

## コマンドのアクセスモード

`AcEdCommand` は**最小アクセスモード要件**をサポートするようになり、コマンドが必要とするドキュメントアクセスレベルを宣言できます。

### オープンモード

MLightCAD は 3 つのドキュメントオープンモードをサポートしています：

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

値の大きいモードは、値の小さいモードと互換性があります：

-   `Write` ≥ `Review` ≥ `Read`

現在のドキュメントのオープンモードには、次でアクセスできます：

```
context.doc.openMode
```

または

```
AcApDocument.openMode
```

### コマンドモードの設定

各コマンドは、**必要な最小アクセスモード**を宣言できます：

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

#### モードプロパティ

```
get mode(): AcEdOpenMode
set mode(value: AcEdOpenMode)
```

### 動作

-   コマンドは次の条件を満たす場合にのみ**実行できます**：

    ```
    document.openMode >= command.mode
    ```

-   例：

    -   `Write` コマンドは `Read` モードで実行**できません**
    -   `Review` コマンドは `Write` モードで実行**できます**
    -   `Read` コマンドはすべてのモードで実行されます

これにより、次が可能になります：

-   安全な読み取り専用ビューア
-   レビュー専用ワークフロー
-   編集コマンドに対する厳格な書き込み保護

## コマンドの登録

コマンドは `AcApDocManager.instance.commandManager` を通じて登録します。

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

### 注意事項

-   `globalName` はコマンドグループ内で一意である必要があります

-   `localName` はユーザー向けであり、ローカライズできます

-   コマンドグループ：

    -   `ACAD` – システムコマンド
    -   `USER` – カスタムコマンド

## コマンドエイリアス

MLightCAD は AutoCAD スタイルのコマンドエイリアス（`acad.pgp` の動作に似ています）をサポートしています。

### `addCommand` でエイリアスを登録する

`addCommand` の 5 番目の引数でエイリアスを指定できます：

```
register.addCommand(
  'USER',
  'MYCMD',
  'MyCmd',
  myCommand,
  ['MC', 'MY']
)
```

エイリアスのルール：

-   エイリアスのマッチングは大文字と小文字を区別しません（内部的に大文字に正規化されます）
-   エイリアスは同じコマンドグループ内で一意である必要があります
-   エイリアスは、同じグループ内の既存のグローバル/ローカルコマンド名と競合できません

### `AcApDocManager` でエイリアスを設定する

`AcApDocManagerOptions` は `commandAliases` を提供するため、初期化時にエイリアスマッピングを上書きできます：

```
AcApDocManager.createInstance({
  commandAliases: {
    LINE: ['L', 'LN'],
    CIRCLE: 'CI',
    ZOOM: ['Z']
  }
})
```

動作：

-   コマンドにユーザー設定のエイリアスがある場合、そのコマンドの組み込みデフォルトを置き換えます
-   コマンドが設定されていない場合、組み込みのデフォルトエイリアスが使用されます

### 検索と UI の動作

-   `lookupGlobalCmd()` と `lookupLocalCmd()` はどちらもエイリアス検索をサポートします
-   `searchCommandsByPrefix()` はエイリアスのプレフィックスマッチングをサポートします
-   コマンドラインのオートコンプリートでは、次のようにエイリアスがリストに表示されます：
    `LINE（L, LN） - description`

## コマンドのトリガー

登録後、コマンドはプログラムから実行できます：

```
AcApDocManager.instance.sendStringToExecute('CIRCLE')
```

## 完全なワークフロー

1.  `AcEdCommand` を拡張してコマンドを作成します
1.  （任意）コマンドに必要なアクセス `mode` を設定します
1.  `commandManager` で登録します
1.   （任意）必要に応じて `AcEditor` を介してライフサイクルイベントをリッスンします
1.  名前またはプログラムからコマンドをトリガーします


## カスタムコマンドのローカライズ

<https://github.com/mlightcad/cad-simple-viewer-example> では、ローカライズをサポートするカスタムコマンドを示す完全な例を確認できます。

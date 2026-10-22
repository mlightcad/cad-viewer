---
title: "Jig システム"
---

# Jig システム

AutoCAD は、ユーザー入力の取得中にリアルタイムの視覚的フィードバックを提供するため、AcEdJig フレームワークに依存しています。このシステムは強力ですが、プロンプト、プレビューのレンダリング、入力のサンプリングが複数のオーバーライドメソッドに分かれており、ロジックがさまざまな関数やライフサイクル段階に分散しがちです。CAD-Viewer は、この概念を Web 向けに再構築し、プロンプト入力とシームレスに統合された、統一的で TypeScript 駆動の Jig メカニズムを導入しています。ドラッグループやサンプラーのステータスコードを管理する代わりに、開発者は Jig をプロンプトオプションに直接アタッチでき、動的プレビューロジック、ユーザー入力、最終的なエンティティ作成を 1 つの読みやすいワークフローにまとめることができます。

## 概要

CAD-Viewer の **Jig システム**は、インタラクティブなプレビューと動的なエンティティ作成を可能にし、AutoCAD の **AcEdJig**（ObjectARX）に似たワークフローを提供します。*Jig* は、カーソルの移動または段階的なユーザー入力に基づいて継続的に更新される一時的なプレビューエンティティを管理します。

ユースケース：

* インタラクティブなジオメトリ作成（点、円、ポリラインなど）
* 距離または角度のライブ測定
* 既存エンティティのリアルタイム変更

ただし、CAD-Viewer は**よりシンプルで、よりまとまりがあり、TypeScript に親しみやすい設計**を導入しており、AutoCAD の Jig に見られる構造的な複雑さを軽減しています。


## 主なアーキテクチャの違い

### Jig をプロンプトオプションに渡す

AutoCAD では、プロンプトと Jig は別々のメカニズムです。Jig を実行するには、`sampler()`、`worldDraw()` をオーバーライドし、`drag()` を呼び出す必要があります。

CAD-Viewer では、プロンプトが**Jig インスタンスを直接保持**できます：

```ts
const opts = new AcEdPromptDistanceOptions('Specify radius:')
opts.jig = new CircleJig(view, center)
const radius = await editor.getDistance(opts)
```

この設計により：

* ユーザー入力とライブプレビューが自動的にリンクされます
* 手動のドラッグループ管理が不要になります

➡️ 結果：**ボイラープレートの削減と一貫性の向上**。

---

### 完全な動的入力ロジックを 1 か所に保つ

[AutoCAD AcEdJig のサンプルコード](https://help.autodesk.com/view/OARX/2023/ENU/?guid=GUID-9BF40890-7F1D-4EA3-9767-B6659B8E24FC) で確認できるように、AutoCAD は 1 つの楕円を作成するための入力ロジックを複数の場所に分けています。

* `createEllipse()` — 楕円の中心点を取得
* `sampler()` — 長軸の端点と、楕円の中心から短軸の端点までの距離を取得

CAD-Viewer では、動的入力のワークフロー全体を次のように順次的に記述します。

```ts
const center = await editor.getPoint(pointOpts)
radiusOpts.jig = new CircleJig(view, center)
const radius = await editor.getDistance(radiusOpts)
```

➡️ ユーザー入力、Jig プレビュー、最終的なジオメトリが**同じコードブロック**で管理されます。


## 主要な概念

### 汎用 Jig（`AcEdPreviewJig<T>`）

`AcEdPreviewJig<T>` は、一時的なプレビューエンティティを管理する TypeScript ベースのクラスです：

| AutoCAD AcEdJig | Web CAD Jig（`AcEdPreviewJig`）      |
| --------------- | ----------------------------------- |
| `sampler()`     | `update(value: T)`                  |
| `startJig()`    | `setEntity()`                       |
| `drag()`        | JS イベントを通じて外部から制御 |

**機能：**

-   汎用型 `T` を使用して、複数の入力タイプ（点、距離、角度など）を処理します
-   `AcEdBaseView` と統合して、一時的なエンティティをレンダリングします
-   動的なジオメトリ更新のために `onJigUpdate(value: T)` を実装するプレビューエンティティをサポートします
-   `end()` を使用して Jig をクリーンに終了できます

* * *

### コアメソッド

#### `update(value: T): void`

ユーザー入力に応じてプレビューエンティティを更新します。これは AutoCAD の `sampler()` に相当します。

#### `render(): void`

関連するビューでプレビューエンティティをレンダリングします。AutoCAD の `worldDraw()` に似ています。

#### `end(): void`

一時的なエンティティをクリアし、Jig セッションを終了します。

#### `entity: AcDbEntity | null`

現在のプレビューエンティティを取得する getter。

## Jig の使用

### ステップ 1：Jig クラスの作成

特定のエンティティ用に `AcEdPreviewJig<T>` を拡張するクラスを作成する必要があります。たとえば、**円 Jig** を作成する場合は次のようにします：

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

**説明：**

-   Jig は一時的な `AcDbCircle` を管理します。
-   `update` メソッドは、ユーザー入力に基づいて半径を動的に変更します。

* * *

### ステップ 2：コマンドでの Jig の使用

コマンドに Jig を統合して、エンティティをインタラクティブに作成できます：

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

**ワークフロー：**

1.  ユーザーに円の**中心**を入力してもらいます。
1.  中心にアタッチされた**円 Jig** を作成します。
1.  インタラクティブなプレビュー付きで、ユーザーに**半径**を入力してもらいます。
1.  確定した円をデータベースにコミットします。

* * *

## ユーザー入力

AcEditor の入力 API、プロンプトオプション、キーワードルール、プロンプト結果の処理に関する完全で最新のガイドについては、次を参照してください：

[ユーザー入力](./user-input)

## 参考文献

-   [AutoCAD AcEdJig ドキュメント](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-CF581B82-FF80-42C6-9E9C-2394B7A96076)
-   [AutoCAD AcEdJig ドラッグループ](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-E0A88178-CEE6-4983-950C-119CED7BA474)
-   [AutoCAD AcEdJig サンプルコード](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-9BF40890-7F1D-4EA3-9767-B6659B8E24FC)

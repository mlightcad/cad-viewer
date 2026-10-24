---
title: "システム変数"
---

# システム変数

このページでは、MLightCAD でシステム変数がどのように動作するか、ユーザーがコマンドラインからシステム変数を変更する方法、そして `AcDbSystemVariables` と `AcDbSysVarManager` を通じてシステム変数がどのように実装されているかを説明します。

## システム変数とは

`system variable` は、CAD システムの各部分の動作を制御するグローバル設定です。

コマンドは通常、操作を開始したり、ジオメトリを作成したり、ダイアログを開いたりします。システム変数はそれとは異なり、コマンドの動作、既定値、図面の状態、またはユーザーインターフェースの動作を制御します。

代表的な例は次のとおりです。

- 新しいエンティティをどのレイヤに作成するか
- 既定の色、線幅、線種尺度に何を使用するか
- 表示モードが有効かどうか
- エディタやビューアが視覚的にどのように応答するか

これは意図的に AutoCAD に似せた設計です。MLightCAD では、コマンドラインで変数名を入力し、続けて新しい値を入力するだけで、システム変数を直接設定できます。

例：

```text
Command: PICKBOX
New value for PICKBOX <3>: 5
```

つまり、コマンドラインはシステム変数名自体を、その設定を更新するためのコマンドとして扱います。

MLightCAD がこのモデルを採用しているのは、実行時の設定をコマンドロジックのあちこちにハードコードするのではなく、一貫した 1 つの仕組みを通じて読み取り、変更、監視できるようにするためです。

## コマンドラインからのシステム変数の設定

コマンドラインのワークフローはシンプルです。

1. システム変数名を入力します。
2. Enter を押します。
3. 新しい値を入力します。
4. 再度 Enter を押して適用します。

これは、多くの CAD ユーザーが AutoCAD ですでに知っているのと同じ操作パターンです。

たとえば、現在のレイヤを変更するには次のようにします。

```text
Command: CLAYER
New value for CLAYER <0>: Walls
```

ピックボックスのサイズを変更するには次のようにします。

```text
Command: PICKBOX
New value for PICKBOX <3>: 10
```

言い換えれば、システム変数の代入には `SETVAR` のような別個のワークフローは必要ありません。コマンドラインにシステム変数名を直接入力し、新しい値を代入できます。

## システム変数がコマンドとして登録される仕組み

MLightCAD でシステム変数をコマンドラインから使用できるのは、アプリケーションの初期化時に通常のコマンドとして登録されるためです。

登録は `AcApDocManager` で行われます。`AcDbSysVarManager` からすべてのシステム変数ディスクリプタを読み込み、各変数名をコマンドとして登録します。

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

これにより、次のことが成り立ちます。

- 登録されたすべてのシステム変数が自動的にコマンドになる
- コマンド名は `CLAYER` や `PICKBOX` のように、システム変数名そのものである
- これらのコマンドはすべて同じコマンド実装 `AcApSysVarCmd` を共有する

`AcApSysVarCmd` は特定の変数をハードコードしていません。代わりに実行時に現在のコマンド名（`this.globalName`）を使用して一致するシステム変数ディスクリプタを検索し、ユーザーに新しい値を尋ねてから `setVar(...)` を呼び出します。

その流れは実質的に次のとおりです。

`system variable name entered` -> `AcApSysVarCmd.execute()` -> prompt for value -> `AcDbSysVarManager.setVar(...)`

したがって、2 つの層が関係しています。

- `AcDbSysVarManager` は、実行時にどのシステム変数が存在するかを決定する
- `AcApDocManager` は、それらの実行時変数をコマンドラインコマンドとして公開する

新しいシステム変数のサポートを追加するには、通常 `AcDbSysVarManager` にそのディスクリプタを登録するところから始めるのは、このためです。`getAllDescriptors()` に含まれれば、コマンドスタックに登録され、コマンドラインから直接使用できるようになります。

## MLightCAD での設計

現在の実装は、2 つのファイルを中心としています。

- [AcDbSystemVariables](https://mlightcad.github.io/realdwg-web/variables/_mlightcad_data-model.AcDbSystemVariables.html)
- [AcDbSysVarManager](https://mlightcad.github.io/realdwg-web/classes/_mlightcad_data-model.AcDbSysVarManager.html)

これらはそれぞれ異なる役割を担っています。

### 1. `AcDbSystemVariables`

`AcDbSystemVariables` は、システム変数名の定数の正規リストです。

主な役割は次のとおりです。

- 変数名の単一の信頼できる情報源（single source of truth）を提供する
- コードベース全体での文字列のハードコードを避ける
- 呼び出し元に型安全な変数参照方法を提供する
- `AcDbSystemVariableName` などの派生型をサポートする

これは MLightCAD におけるシステム変数名のレジストリと理解するとよいでしょう。

### 2. `AcDbSysVarManager`

`AcDbSysVarManager` は、システム変数の実行時マネージャーです。次のことを担います。

- 変数ディスクリプタの登録
- 型と既定値のメタデータの保存
- 統一された `getVar` と `setVar` アクセスの提供
- データベース以外の変数のキャッシュ
- 変更イベントのディスパッチ

これは実質的に、システム変数のレジストリ、アクセス層、イベントハブです。

## システム変数の 2 つの種類

現在の設計では、システム変数は 2 つのカテゴリに分かれます。

### データベースに格納される変数

これらの変数は `AcDbDatabase` 上に存在します。`AcDbSysVarManager` は変数名をデータベースのフィールドにマッピングして、それらを読み書きします。

現在登録されている例は次のとおりです。

- `CECOLOR`
- `CELTSCALE`
- `CELWEIGHT`
- `CLAYER`
- `LWDISPLAY`

これらは図面の状態や図面の既定プロパティに近いものです。

### データベース以外の変数

これらの変数は `AcDbDatabase` に直接保存されません。`AcDbSysVarManager` 内でキャッシュされます。

現在登録されている例は次のとおりです。

- `COLORTHEME`
- `PICKBOX`
- `WHITEBKCOLOR`

これらはエディタの動作や UI の状態に近いものです。

## この分割が重要な理由

2 種類の変数を分けることには、次の 2 つの直接的な利点があります。

- 図面関連の設定をデータベースモデルに結び付けたままにできる
- ホストアプリケーションや UI 関連の設定をデータベース層に押し込む必要がない

これにより、システム変数はデータモデルとエディタ層の両方に無理なく対応できます。

## 現在の実装における主要機能

### 統一されたアクセス

呼び出し元は、変数がデータベースに保存されているのか、マネージャーが管理する実行時キャッシュに保存されているのかを知る必要がありません。どちらの場合も同じアクセス API を使用できます。

```ts
const sysVarManager = AcDbSysVarManager.instance()

const currentLayer = sysVarManager.getVar('CLAYER', db)
sysVarManager.setVar('CLAYER', 'Walls', db)
sysVarManager.setVar('PICKBOX', 12, db)
```

### 型変換

`setVar` は、登録されたディスクリプタの型に基づいて基本的な変換を行います。現在の実装では、次のような値の変換をサポートしています。

- `number`
- `boolean`
- `color`

これは、値がコマンドライン入力、フォーム、スクリプトから渡され、最初は文字列として届く場合に便利です。

### 変更通知

`AcDbSysVarManager` は `sysVarChanged` イベントを公開しているため、上位のモジュールはシステム変数の更新に反応できます。

```ts
AcDbSysVarManager.instance().events.sysVarChanged.addEventListener(args => {
  console.log(args.name, args.oldVal, args.newVal)
})
```

現在の実装では、このイベントは主にデータベース以外の変数の変更に対してディスパッチされるため、エディタや UI の同期に特に適しています。

## 例：`PICKBOX`

`PICKBOX` は、ピックボックスの半分のサイズをピクセル単位で表します。データベース以外の変数ですが、ユーザーの操作動作に直接影響します。

`cad-viewer` では、`AcEdCursorManager` が `PICKBOX` の変更を監視します。値が変わると、十字カーソルの矩形部分を再構築し、アクティブなカーソルに即座に再適用します。これは、システム変数が単に保存された設定データではなく、ライブな UI 動作のドライバーとしても機能できることを示しています。

参照実装：

- [AcEdCursorManager.ts](https://raw.githubusercontent.com/mlightcad/cad-viewer/main/packages/cad-simple-viewer/src/editor/input/AcEdCursorManager.ts)

流れは次のとおりです。

`setVar('PICKBOX', ...)` -> `sysVarChanged` event -> cursor manager updates cursor appearance

これは、この抽象化がなぜ有用なのかを示す最も明確な例の 1 つです。

## 現在のコードにおける重要な詳細

`AcDbSystemVariables.ts` は認識される変数名の正規セットを定義していますが、`AcDbSysVarManager` は現在、そのうちの一部のみをコンストラクターで登録しています。

言い換えれば：

- `AcDbSystemVariables` は名前のカタログ
- `AcDbSysVarManager.registry` は実行時に実際にサポートされる変数を決定する

これは合理的な進化の道筋です。まず名前を定義し、各変数がサポートされるにつれて、型メタデータ、既定値、ストレージ戦略、動作を徐々に追加していきます。

## 推奨される拡張パターン

将来さらにシステム変数を追加する場合、推奨されるワークフローは次のとおりです。

1. 変数名の定数を `AcDbSystemVariables` に追加する
2. ディスクリプタを `AcDbSysVarManager` に登録する
3. データベースに格納するか、実行時のみとするかを決める
4. 型、既定値、説明を定義する
5. コマンドや UI に影響させる場合は、ビジネスロジックでのハードコードされたチェックよりもイベント駆動の統合を優先する

## 新しいシステム変数を追加する方法

新しいシステム変数の追加は、通常 5 つのステップで行います。

### 1. `AcDbSystemVariables` に変数名を追加する

まず、`AcDbSystemVariables` に新しい正規名の定数を追加します。

これにより、変数名が一元管理され、コードベース全体にハードコードされた文字列が散らばるのを避けられます。

例：

```ts
export const MYNEWVAR = 'MYNEWVAR'
```

### 2. `AcDbSysVarManager` にディスクリプタを登録する

次に、変数を `AcDbSysVarManager` に登録します。このステップで、変数が実行時に実際にサポートされるようになります。

登録する際には、次のものを定義します。

- 名前
- 型
- 既定値
- 値が `AcDbDatabase` に保存されるのか、マネージャーのキャッシュにのみ保存されるのか
- ディスクリプタモデルで必要な説明やメタデータ

これが最も重要なステップです。変数が `AcDbSystemVariables` にのみ存在し、`AcDbSysVarManager` に登録されていない場合、それは単なる名前の定数であり、使用可能なシステム変数ではありません。

`AcApDocManager` は初期化時に、登録済みのすべてのシステム変数を自動的にコマンドとして登録します。

つまり、新しく追加した変数は通常、専用のコマンドクラスを書かなくてもコマンドラインから使用できます。

その場合のコマンドラインの流れは次のようになります。

```text
Command: MYNEWVAR
New value for MYNEWVAR <default>: ...
```

### 3. ストレージモデルを選択する

次に、新しい変数が次のどちらであるかを決める必要があります。

- 図面の状態や図面の既定値に属する場合は、データベースに格納する
- エディタの動作、UI の設定、アプリケーションの実行時状態に属する場合は、データベース以外とする

データベースに格納する場合、`AcDbSysVarManager` はそれを `AcDbDatabase` のフィールドにマッピングできる必要があります。

データベース以外の場合、`AcDbSysVarManager` は内部の実行時キャッシュに保持できます。

目安として：

- 現在のレイヤや現在の色などにはデータベースに格納する変数を使用する
- ピックボックスのサイズやカラーテーマなどにはデータベース以外の変数を使用する

### 4. 必要に応じて動作を接続する

変数の変更が UI やエディタの動作に即座に影響すべき場合は、対応するロジックをコンシューマーモジュールに追加します。

推奨されるパターンは、多くの場所で変数を手動でチェックするのではなく、`sysVarChanged` に反応することです。

`PICKBOX` はこのパターンの良い例です。

- 変数は `AcDbSysVarManager` に登録されている
- コマンドシステムがコマンドラインでそれを公開している
- `AcEdCursorManager` が変更を監視し、カーソルを即座に更新する

したがって、実際には新しい変数の最小限の手順は次のとおりです。

1. `AcDbSystemVariables` で名前を定義する
2. `AcDbSysVarManager` にディスクリプタを登録する
3. ストレージ戦略を決める
4. 必要に応じて、その値に反応するリスナーやビジネスロジックを接続する

その後は、組み込みのシステム変数と同じ統一された `getVar` / `setVar` ワークフローに参加できます。

## まとめ

MLightCAD において、システム変数は単なる設定の寄せ集めではありません。それらはアプリケーション状態のための統一された抽象化を形成しています。

- 下方向には、図面関連のデータベース状態にマッピングされる
- 上方向には、エディタと UI の動作を駆動する
- 中間では、一元化されたアクセス、型制約、変更通知を提供する

コマンドが「何をするか」に答えるのに対し、システム変数は「どの設定またはモードの下でそれを行うか」に答えます。

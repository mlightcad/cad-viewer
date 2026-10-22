---
title: "オブジェクトスナップ（OSNAP）"
---

# オブジェクトスナップ（OSNAP）

このページでは、**realdwg-web** のデータを使用して **cad-viewer** で OSNAP がどのように動作するかを説明します。

## 背景

AutoCAD/ObjectARX では、各エンティティが `getOsnapPoints(...)` をオーバーライドして、特定のスナップモードに対する候補スナップ点を返すことができます。

`realdwg-web` では、各エンティティクラスの `subGetOsnapPoints(...)` を使用して同様のパターンを実装しています。  
`cad-viewer` は返された点を利用して、UI 上でスナップを実行します。

参考：
- AutoCAD ObjectARX `getOsnapPoints`：https://help.autodesk.com/view/OARX/2024/ENU/?guid=OARX-RefGuide-__OVERLOADED_getOsnapPoints_AcDbEntity

## realdwg-web のコア API

基本定義：
- `AcDbEntity.subGetOsnapPoints(osnapMode, pickPoint, lastPoint, snapPoints, gsMark?)`

パラメータ：

- `osnapMode`：1 回の呼び出しにつき 1 つのモード
- `pickPoint`：現在のカーソルのワールド座標点
- `lastPoint`：コマンドフローで以前に確定された点
- `snapPoints`：候補点を追加する出力配列
- `gsMark`（省略可能）：サブエンティティ ID。現在は `INSERT`（`AcDbBlockReference`）のサブエンティティスナップで重要です

## サポートされる OSNAP モード

`AcDbOsnapMode` で定義されています。
- `EndPoint = 1`
- `MidPoint = 2`
- `Center = 3`
- `Node = 4`
- `Quadrant = 5`
- `Insertion = 7`
- `Perpendicular = 8`
- `Tangent = 9`
- `Nearest = 10`
- `Centroid = 11`

重要：

- これらの値は順序 ID であり、ビットフラグではありません。
- マスク変換には `acdbOsnapModesToMask(...)` と `acdbMaskToOsnapModes(...)` を使用します。

## 現在の cad-viewer UI での公開状況

ステータスバー（`MlOsnapButton.vue`）では現在、次を公開しています。

- EndPoint
- MidPoint
- Center
- Node
- Quadrant
- Insertion

UI ではまだ公開されていません（コメントアウト）：

- Perpendicular
- Tangent
- Nearest
- Centroid

設定（`AcApSettingManager`）で既定で有効になっているマスク：

- EndPoint + MidPoint + Center

## cad-simple-viewer の実行時フロー

1. `AcEdFloatingInput.getPosition()` が `getOsnapPoint()` を呼び出します。
2. `getOsnapPoint()` が `getOsnapPoints()` を呼び出します。
3. `getOsnapPoints()` が `view.pick(point, hitRadius)` を実行します。
4. ピックされた各項目について：
- `item.id` によってモデル空間のエンティティを解決する
- `item.children` が存在する場合は、`gsMark = child.id` でエンティティの osnap を呼び出す
- 存在しない場合は、`gsMark` なしでエンティティの osnap を呼び出す
5. 現在のマスク内の各アクティブモードについて、`entity.subGetOsnapPoints(...)` を呼び出します。
6. 返された点のうち、カーソルに最も近いものを選択します。
7. 画面の `hitRadius`（既定 20 px）から変換されたワールド距離のしきい値を適用します。
8. 受け入れられた場合は、カーソルをスナップし、マーカーを表示します。

## エンティティ実装のスナップショット（realdwg-web のコードより）

- `AcDbLine`：EndPoint、MidPoint、Nearest、Perpendicular（`Tangent` の分岐は存在するが点なし）
- `AcDbArc`：EndPoint、MidPoint、Nearest、Tangent（`Perpendicular` の分岐は存在するが点なし）
- `AcDbCircle`：Center、Centroid、Quadrant、Nearest、Tangent
- `AcDbEllipse`：EndPoint（開いた円弧のみ）、MidPoint（開いた円弧のみ）、Quadrant（閉じた楕円のみ）
- `AcDbPolyline`：EndPoint
- `AcDb2dPolyline`：EndPoint
- `AcDb3dPolyline`：EndPoint
- `AcDbPoint`：Node
- `AcDbText`：Insertion
- `AcDbMText`：Insertion
- `AcDbBlockReference`（`INSERT`）：Insertion + `gsMark` によるサブエンティティスナップの委譲
- 限定的なサポートがあるその他のエンティティ：
- `AcDbRay`：EndPoint（基点）
- `AcDbFace`：EndPoint（頂点）
- `AcDbTrace`：EndPoint（頂点）
- `AcDbSpline`：EndPoint

## INSERT（`AcDbBlockReference`）の OSNAP ロジック

`subGetOsnapPoints` には 2 つの経路があります。

1. `Insertion` モード：
- ブロック参照の挿入点（`this._position`）を直接追加します

2. その他のモード：
- `gsMark` が指定されている場合にのみ動作します
- `subEntityGetOsnapPoints(...)` に委譲します

委譲の流れ（`subEntityGetOsnapPoints`）：

1. ガード：`gsMark === this.objectId` の場合は return します（再帰の回避）
2. `blockTable.getEntityById(gsMark)` によってエンティティを解決します
3. そのサブエンティティの `subGetOsnapPoints(...)` を呼び出します
4. 返された点を、このブロック参照の `blockTransform` で変換します
5. 変換された点を出力に追加します

## INSERT のスナップが失敗する理由（現在の動作）

1. `gsMark` がない場合：
- `Insertion` 以外のモードでは、`gsMark` がないと `AcDbBlockReference` は何も返しません。

2. `gsMark` モデルが簡略化されている：
- 現在の `gsMark` は空間的な子ヒットから得られるサブエンティティのオブジェクト ID であり、AutoCAD の GS マーカーの完全なセマンティクスではありません。

3. INSERT のレイヤ別レンダリング：
- レンダリング時に、1 つの INSERT が同じ親オブジェクト ID を持つ複数のレイヤベースのレンダーグループに分割される場合があります。
- ピッキングは、サブエンティティ ID を復元するために階層的な子ボックスに依存しています。

4. 複雑な変換・ネスト・エッジケース：
- 委譲では現在の INSERT の `blockTransform` が適用されます。
- エッジケース（たとえば、ネストされたブロックのシナリオや、既定以外の法線/押し出しのケース）では、スナップ点が不正確になったり欠落したりする可能性があります。

これは `README.md` に記載されている既知のロードマップの注記と一致します。
- INSERT のエンドポイントスナップはまだ完全には信頼できません。

## 既知の制限 / TODO

- OSNAP のカバレッジはエンティティに依存します。多くのモードとエンティティの組み合わせは、意図的にまだ実装されていません。
- INSERT の Insertion 以外のスナップは、正しい子ヒットから `gsMark` への伝播に依存しています。
- 現在のマーカーの仕組みはオブジェクト ID ベースであり、AutoCAD の GS マーカーの完全な動作ではありません。
- INSERT、特にネストされたブロックと変換されたブロックについて、より多くの回帰テストが必要です。

## 推奨されるコントリビューションの方向性

- INSERT における子ヒットから `gsMark` へのマッピングの堅牢性を向上させる。
- EndPoint/MidPoint/Center/Nearest/Tangent のケースについて、ネストされたブロックの回帰テストを追加する。
- エンティティごとのモードカバレッジを段階的に拡大する。
- 可能な場合は、マーカーモデルを AutoCAD の GS マーカーのセマンティクスに近づける。

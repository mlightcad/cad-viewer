---
title: 스크립트 예제
---

# 스크립트 예제

다음 예제는 일반적인 스크립트 사용법을 보여줍니다. 스크립트 패널에 복사하여 바로 실행할 수 있습니다.

## 엔티티 수 통계

도면의 각 유형별 엔티티 수를 집계합니다.

```javascript
const counts = {}
for (const entity of cad.entities.where(() => true)) {
  counts[entity.type] = (counts[entity.type] || 0) + 1
}
return {
  title: cad.drawing.title,
  currentLayer: cad.drawing.currentLayer,
  counts
}
```

## 레이어별 원 통계 및 강조 표시

원이 가장 많이 포함된 레이어를 찾아 해당 레이어의 모든 엔티티를 강조 표시합니다.

```javascript
const circles = cad.entities.where(e => e.type === 'Circle')
const counts = {}
for (const c of circles) {
  counts[c.layer] = (counts[c.layer] || 0) + 1
}
let top = ''
let max = -1
for (const [layer, count] of Object.entries(counts)) {
  if (count > max) { max = count; top = layer }
}
const ids = cad.entities.where(e => e.layer === top).map(e => e.id)
cad.selection.replace(ids)
return { counts, highlightLayer: top, count: max }
```

## 큰 반지름의 원 찾기

반지름이 100보다 큰 원을 필터링하고 중심 좌표를 출력합니다.

```javascript
const bigCircles = cad.entities
  .where(e => e.type === 'Circle' && e.geometry.radius > 100)
  .map(e => ({
    id: e.id,
    layer: e.layer,
    center: e.geometry.center,
    radius: e.geometry.radius
  }))
return bigCircles
```

## 지정된 영역에 사각형 그리기

지정된 WCS 좌표에 사각형을 그립니다.

```javascript
cad.edit.transaction('사각형 그리기', tx => {
  tx.drawRectangle({
    corner1: { x: 0, y: 0 },
    corner2: { x: 100, y: 50 },
    layer: '0'
  })
})
return 'done'
```

## 레이어의 모든 엔티티 이동

「치수」 레이어의 모든 엔티티를 오른쪽으로 1000 단위 이동합니다.

```javascript
const targetLayer = '치수'
const entities = cad.entities.where(e => e.layer === targetLayer)
const ids = entities.map(e => e.id)
cad.edit.transaction('치수 레이어 이동', tx => {
  tx.move(ids, 1000, 0)
})
return { moved: ids.length }
```

## 텍스트 일괄 생성

지정된 위치에 여러 텍스트 객체를 생성합니다.

```javascript
const texts = [
  { x: 0, y: 0, content: '시작점' },
  { x: 50, y: 50, content: '끝점' }
]
cad.edit.transaction('텍스트 일괄 생성', tx => {
  for (const t of texts) {
    tx.drawText({
      position: { x: t.x, y: t.y },
      text: t.content,
      height: 20
    })
  }
})
return { created: texts.length }
```

## 폴리라인 총 길이 계산

모든 폴리라인의 총 길이를 집계합니다.

```javascript
let total = 0
for (const e of cad.entities.where(e => e.type === 'Polyline')) {
  const pts = e.geometry.points
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    total += Math.sqrt(dx * dx + dy * dy)
  }
  if (e.geometry.closed && pts.length > 2) {
    const first = pts[0]
    const last = pts[pts.length - 1]
    const dx = first.x - last.x
    const dy = first.y - last.y
    total += Math.sqrt(dx * dx + dy * dy)
  }
}
return { totalLength: total.toFixed(2) }
```

## 지정된 영역 강조 표시 및 윈도우 선택

지정된 사각형 범위 내의 모든 엔티티를 선택 집합에 추가하고 해당 범위로 확대/축소합니다.

```javascript
const min = { x: 0, y: 0 }
const max = { x: 1000, y: 1000 }
const inside = cad.entities.inBox(min, max)
const ids = inside.map(e => e.id)
cad.selection.replace(ids)
cad.view.zoomExtents()
return { inBoxCount: inside.length }
```

## 블록별 엔티티 수

모형 공간과 도면 공간도 블록입니다.

```javascript
return cad.blocks.map(block => ({
  name: block.name,
  isModelSpace: block.isModelSpace,
  isPaperSpace: block.isPaperSpace,
  count: block.entities.length
}))
```

## 모형 공간 밖의 원

`ownerId`는 엔티티가 속한 블록입니다.

```javascript
const model = cad.blocks.find(block => block.isModelSpace)
const circles = cad.entities
  .where(entity => entity.type === 'Circle' && entity.ownerId !== model.id)
  .map(entity => ({
    id: entity.id,
    ownerId: entity.ownerId,
    layer: entity.layer,
    radius: entity.geometry.radius
  }))
return circles
```

## 레이어 테이블 읽기

심볼 테이블에는 색, 선 종류, 플롯 가능 여부가 있습니다.

```javascript
const layers = cad.tables.layerTable.records.map(record => ({
  name: record.name,
  isOff: record.isOff,
  isFrozen: record.isFrozen,
  isLocked: record.isLocked,
  isPlottable: record.isPlottable,
  linetype: record.linetype,
  color: record.color
}))
const styles = cad.tables.textStyleTable.records.map(record => ({
  name: record.name,
  fileName: record.fileName,
  textSize: record.textSize
}))
return { layers, styles }
```

## 도면을 DXF로 저장

스크립트가 성공한 뒤에 실행됩니다. 앱 안 에이전트는 파일을 다운로드하고, `cad-mcp-server` 는 지정한 경로에 씁니다.

```javascript
cad.file.saveDxf('./plan-out.dxf')
return { saved: true }
```

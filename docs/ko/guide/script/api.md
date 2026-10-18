---
title: 스크립트 API
---

# 스크립트 API

스크립트에서 `cad` 객체를 통해 도면과 상호 작용합니다. `CAD_SCRIPT_API_TREE`에 선언된 멤버만 접근할 수 있으며, 나머지 속성은 `unknown_api` 오류를 발생시킵니다.

## cad.drawing

현재 도면의 정적 정보를 반환합니다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `title` | `string` | 도면 제목 |
| `currentLayer` | `string` | 현재 레이어 이름 |
| `units` | `number` | 삽입 단위(INSUNITS) |
| `layers` | `Array<{ name, isOn, isFrozen, isLocked }>` | 전체 레이어 목록 |
| `extents` | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | 모형 공간 범위 |

```javascript
const info = cad.drawing
cad.log('현재 레이어:', info.currentLayer)
cad.log('레이어 총수:', info.layers.length)
```

## cad.entities

모형 공간의 엔티티를 조회하는 데 사용됩니다.

### `cad.entities.where(predicate)`

조건에 따라 엔티티 스냅샷을 필터링하여 일치하는 스냅샷 배열을 반환합니다.

```javascript
const circles = cad.entities.where(e => e.type === 'Circle')
```

### `cad.entities.byId(id)`

엔티티 ID로 단일 스냅샷을 가져오며, 찾지 못하면 `undefined`를 반환합니다.

```javascript
const entity = cad.entities.byId('A1B2')
if (entity) {
  cad.log('타입:', entity.type)
}
```

### `cad.entities.inBox(min, max)`

WCS 사각형 영역 내에 있는 모든 엔티티 스냅샷을 반환합니다.

```javascript
const inside = cad.entities.inBox({ x: 0, y: 0 }, { x: 100, y: 100 })
```

### 엔티티 스냅샷(EntitySnapshot)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `string` | 엔티티 객체 ID |
| `type` | `string` | 엔티티 타입(`AcDb` 접두사 제외), 예: `Circle`, `Line` |
| `layer` | `string` | 소속 레이어 이름 |
| `extents` | `{ min: {x,y,z}, max: {x,y,z} } \| undefined` | 월드 좌표계 범위 |
| `geometry` | `object \| undefined` | 타입별 지오메트리 데이터 |

지원되는 `geometry` 타입:

| 엔티티 타입 | `geometry` 필드 |
|----------|----------------|
| `Circle` | `{ center: {x,y,z}, radius }` |
| `Line` | `{ start: {x,y,z}, end: {x,y,z} }` |
| `Arc` | `{ center: {x,y,z}, radius, startAngle, endAngle, startAngleDeg, endAngleDeg }` |
| `Ellipse` | `{ center: {x,y,z}, majorRadius, minorRadius }` |
| `Polyline` | `{ points: Array<{x,y,z}>, closed }` |
| `Text` | `{ position: {x,y,z}, text, height }` |
| `MText` | `{ position: {x,y,z}, text, height }` |
| `Point` | `{ position: {x,y,z} }` |
| `Ray` / `Xline` | `{ basePoint: {x,y,z}, unitDir: {x,y,z} }` |
| `BlockReference`(Insert) | `{ name, position: {x,y,z}, rotation, scale: {x,y,z} }` |

각도 필드 `startAngle` / `endAngle`은 라디안을 사용하고, `startAngleDeg` / `endAngleDeg`는 도(degree)를 사용합니다.

## cad.selection

엔티티를 강조 표시하고 선택하는 데 사용됩니다.

### `cad.selection.ids()`

현재 선택된 엔티티 ID 배열을 반환합니다.

```javascript
const ids = cad.selection.ids()
```

### `cad.selection.replace(ids)`

선택 집합을 지우고 지정된 ID 목록으로 설정합니다.

```javascript
cad.selection.replace(circles.map(e => e.id))
```

### `cad.selection.add(ids)`

지정된 ID를 현재 선택 집합에 추가합니다.

```javascript
cad.selection.add(['A1B2', 'C3D4'])
```

### `cad.selection.remove(ids)`

현재 선택 집합에서 지정된 ID를 제거합니다.

```javascript
cad.selection.remove(['A1B2'])
```

### `cad.selection.clear()`

선택 집합을 지웁니다.

```javascript
cad.selection.clear()
```

## cad.view

뷰를 제어하는 데 사용됩니다.

### `cad.view.zoomExtents()`

뷰를 모형 공간 범위로 확대/축소합니다.

```javascript
cad.view.zoomExtents()
```

## cad.edit.transaction

편집 작업을 실행하며, 모든 수정 사항은 하나의 실행 취소 그룹으로 처리됩니다. 도면은 편집 가능한 상태여야 합니다(읽기 전용 모드가 아님).

```javascript
cad.edit.transaction('일괄 수정', tx => {
  tx.drawCircle({ center: { x: 50, y: 50 }, radius: 10, layer: '0' })
  tx.move(entityIds, 10, 20)
})
```

트랜잭션에서 사용 가능한 메서드:

### 그리기 메서드

| 메서드 | 매개변수 | 반환 값 |
|------|------|--------|
| `tx.drawLine({ start, end, layer? })` | `start/end: {x,y}` | 새 엔티티 ID |
| `tx.drawCircle({ center, radius, layer? })` | `center: {x,y}` | 새 엔티티 ID |
| `tx.drawArc({ center, radius, startAngleDeg, endAngleDeg, layer? })` | `center: {x,y}` | 새 엔티티 ID |
| `tx.drawRectangle({ corner1, corner2, layer? })` | `corner1/corner2: {x,y}` | 새 엔티티 ID |
| `tx.drawPolyline({ points, closed?, layer? })` | `points: Array<{x,y}>` | 새 엔티티 ID |
| `tx.drawText({ position, text, height?, layer? })` | `position: {x,y}` | 새 엔티티 ID |

### 편집 메서드

| 메서드 | 매개변수 | 반환 값 |
|------|------|--------|
| `tx.erase(ids)` | `string[]` | 삭제된 엔티티 수 |
| `tx.setLayer(ids, layer)` | `string[], string` | — |
| `tx.move(ids, dx, dy)` | `string[], number, number` | 이동된 엔티티 수 |
| `tx.rotate(ids, center, angleDeg)` | `string[], {x,y}, number` | 회전된 엔티티 수 |
| `tx.createLayer(name)` | `string` | — |
| `tx.setCurrentLayer(name)` | `string` | — |

## cad.log

결과 패널에 로그 정보를 출력합니다.

```javascript
cad.log('엔티티 수:', count)
cad.log({ layer: '0', count })
```

## 반환 값

스크립트에서 `return`을 사용하여 JSON 직렬화 가능한 임의의 값을 반환할 수 있습니다. 반환 값은 결과 패널에 표시됩니다.

```javascript
return {
  total: all.length,
  circles: circles.length,
  onLayer0: onLayer0.length
}
```

반환 값이 65536자를 초과하면 잘리고 `truncated`로 표시됩니다.

---
title: 스크립트 API
---

# 스크립트 API

스크립트에서 `cad` 객체를 통해 도면과 상호 작용합니다. `CAD_SCRIPT_API_TREE`에 선언된 멤버만 접근할 수 있으며, 나머지 속성은 `unknown_api` 오류를 발생시킵니다.

## 실행 환경과 브라우저 API

스크립트는 브라우저의 엄격 모드 샌드박스에서 실행되며, `cad` 객체와 ECMAScript 표준 내장 객체에만 접근할 수 있습니다. 페이지 DOM을 조작하거나 네트워크 요청을 보낼 수 없습니다.

### 사용 가능한 내장 객체

모든 ECMAScript 표준 내장 객체를 사용할 수 있습니다:

- 수학과 수치: `Math`, `Number`, `BigInt`, `parseFloat`, `parseInt`, `isNaN`, `isFinite`
- 자료 구조: `Object`, `Array`, `Map`, `Set`, `WeakMap`, `WeakSet`, `Symbol`
- 텍스트와 포맷: `String`, `JSON`, `RegExp`, `Intl`, `encodeURIComponent`, `decodeURIComponent`
- 시간: `Date`(`Date.now()`는 스크립트 자체의 소요 시간을 측정하는 데 사용할 수 있습니다)
- 기타: `Boolean`, `Promise`, `Error` 및 그 하위 클래스

정보를 출력할 때는 `cad.log()`를 사용하고 `console.log`에 의존하지 마세요. 결과 패널에는 `cad.log`의 내용만 표시됩니다.

### 금지된 브라우저 API

다음 내용은 스크립트 검증 단계에서 즉시 거부되며, `forbidden_identifier` / `forbidden_syntax` / `forbidden_member` 오류를 발생시킵니다:

- 페이지와 DOM: `window`, `document`, `globalThis`
- 네트워크와 통신: `fetch`, `XMLHttpRequest`, `WebSocket`, `importScripts`
- 기기와 환경: `navigator`, `location`, `parent`, `top`, `self`, `frames`(런타임에 `undefined`로 가려집니다)
- 스토리지: `localStorage`, `sessionStorage`
- 동적 실행: `eval`, `Function`
- 기타 런타임: `process`, `require`, `module`, `exports`, `Deno`, `Bun`
- 구문: `import` / `export` 문, 동적 `import()`, `this`, `with`, `import.meta`, `super`
- 탈출 경로: `constructor`, `prototype`, `__proto__`, `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`, `__lookupSetter__`

::: warning
위에서 금지된 객체 외에도 다른 브라우저 전역 변수(예: `alert`, `setTimeout`, `performance`, `console`)는 기술적으로는 완전히 차단되지 않을 수 있지만, 지원되는 API가 아닙니다. 스크립트는 `cad` 객체와 ECMAScript 표준 내장 객체에만 의존해야 하며, 그 외 접근은 향후 버전에서 추가로 제한될 수 있습니다.
:::

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

데이터베이스의 모든 엔티티를 반환합니다. 모형 공간, 모든 도면 공간, 모든 블록 정의, 그리고 블록 참조의 속성이 포함됩니다. 속성의 `ownerId`는 블록 참조이고, 그 외 엔티티의 `ownerId`는 소속 블록 테이블 레코드입니다.

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
| `ownerId` | `string` | 소속 블록 테이블 레코드 ID. 속성은 블록 참조 ID |
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

`Hatch`, `Spline`, `Leader`, `MLeader`, `MLine`, 각종 `Dimension`, `RasterImage`, `Viewport`, `3dSolid`, `ProxyEntity`를 포함한 data-model의 모든 구체 엔티티에 `geometry`가 있습니다. ACIS, OLE, 프록시 그래픽 바이너리는 포함하지 않습니다.

## cad.tables

`AcDbDatabase.tables`와 같이 모든 심볼 테이블을 읽습니다. 각 테이블은 `{ id, records }`이며, 레코드에는 최소한 `id`와 `name`이 있습니다.

| 속성 | 내용 |
|------|------|
| `appIdTable` | 등록된 응용 프로그램 이름 |
| `blockTable` | 블록 정의. 엔티티는 `cad.blocks` |
| `dimStyleTable` | 치수 스타일 (`dimtxt`, `dimscale` 등) |
| `linetypeTable` | 선 종류 |
| `textStyleTable` | 문자 스타일 |
| `ucsTable` | 명명된 UCS |
| `viewTable` | 명명된 뷰 |
| `layerTable` | 레이어. `color`, `linetype`, `lineWeight`, `isOff`, `isFrozen`, `isLocked`, `isPlottable` |
| `viewportTable` | 모형 공간 VPORT 레코드. 도면 공간 `Viewport` 엔티티가 아닙니다 |

## cad.blocks

DXF BLOCKS 섹션에 해당하는 모든 블록 정의입니다. `*Model_Space`와 `*Paper_Space`도 포함됩니다.

| 필드 | 설명 |
|------|------|
| `id` | 블록 테이블 레코드 ID. 블록 안 엔티티의 `ownerId` |
| `name` | 블록 이름 |
| `origin` | 기준점 `{ x, y, z }` |
| `isModelSpace` / `isPaperSpace` | 모형 공간 / 도면 공간 |
| `flags` | BLOCK 그룹 코드 70 |
| `pathName` / `isXref` | 외부 참조 경로와 여부 |
| `entities` | 그 블록에 직접 들어 있는 엔티티 스냅샷 |

## cad.selection

엔티티를 강조 표시하고 선택하는 데 사용됩니다.

### `cad.selection.ids`

현재 선택된 엔티티 ID 배열입니다. 메서드가 아니라 속성입니다.

```javascript
const ids = cad.selection.ids
```

### `cad.selection.entities`

선택 집합에 있는 각 엔티티의 스냅샷입니다. 더 이상 존재하지 않는 ID는 생략됩니다. 스냅샷 필드는 `cad.entities.byId`와 같습니다.

```javascript
const circles = cad.selection.entities.filter(e => e.type === 'Circle')
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

### `cad.view.capturePreview({ longSide? })`

도면 범위의 PNG 스크린샷을 대기열에 넣습니다. 캡처는 스크립트 본문이 끝난 뒤에 실행됩니다. 반환값은 `{ queued: true, index }` 입니다. Agent 채팅에서는 이미지가 도구 결과에 첨부되어 모델로 전달됩니다(JSON data URL로는 반환되지 않음).

```javascript
cad.view.zoomExtents()
cad.view.capturePreview()
// optional: cad.view.capturePreview({ longSide: 512 })
```

## cad.file

현재 도면을 내보냅니다. DXF 본문은 스크립트 반환값에 포함되지 않습니다.

### `cad.file.saveDxf(path?)`

스크립트가 성공한 뒤 DXF 내보내기를 대기열에 넣습니다. 경로 문자열 또는 `{ path?, fileName? }` 를 넘깁니다. 확장자가 없으면 `.dxf` 가 붙습니다. 반환값은 `{ queued: true, index, fileName }` 입니다.

- 앱 내 에이전트와 스크립트 패널에서는 브라우저 다운로드가 시작됩니다.
- `cad-mcp-server` 에서는 서버가 `path` 에 파일을 씁니다. 상대 경로는 서버 프로세스의 작업 디렉터리 기준입니다. 도구 결과의 `savedFiles` 에 절대 경로와 바이트 수가 들어갑니다.

```javascript
cad.file.saveDxf('./plan-out.dxf')
// or: cad.file.saveDxf({ path: './plan-out.dxf' })
```

## cad.measure

Numeric helpers for self-check after drawing. Prefer these over hand-rolled `Math.hypot` / `atan2`. Points are `{ x, y }` in WCS.

| Method | Returns |
|--------|---------|
| `cad.measure.distance(a, b)` | Distance between two points |
| `cad.measure.angleDeg(a, b)` | Bearing of a→b from +X, degrees in (-180, 180] |
| `cad.measure.angleDeg(a, b, c)` | Interior angle at b (a–b–c), degrees in [0, 180] |
| `cad.measure.deltaAngleDeg(fromDeg, toDeg)` | Smallest absolute bearing difference in [0, 180] |
| `cad.measure.center(id)` | Circle/arc/ellipse center, or point/text position; else `undefined` |
| `cad.measure.radius(id)` | Circle/arc radius or ellipse majorRadius; else `undefined` |
| `cad.measure.length(id)` | Line length or polyline/spline path length; else `undefined` |
| `cad.measure.check(name, expected, actual, tolerance?)` | `{ name, expected, actual, pass }` (default tolerance `1e-3`) |
| `cad.measure.report(checks)` | `{ ok, checks }` — `ok` is true iff every check passed |

Recommended return shape after a non-trivial draw:

```javascript
const origin = { x: 0, y: 0 }
let circleId = ''
cad.edit.transaction('draw', tx => {
  circleId = tx.drawCircle({ center: { x: 30, y: 40 }, radius: 10 })
})
const center = cad.measure.center(circleId)
return {
  ...cad.measure.report([
    cad.measure.check('r', 10, cad.measure.radius(circleId)),
    cad.measure.check('pcd', 50, cad.measure.distance(origin, center), 0.01)
  ]),
  entityIds: [circleId]
}
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
| `tx.drawEllipse({ center, majorRadius, minorRadius, rotationDeg?, startAngleDeg?, endAngleDeg?, layer? })` | `center: {x,y}` | 새 엔티티 ID |
| `tx.drawHatch({ boundary, patternName?, patternScale?, patternAngleDeg?, layer? })` | `boundary: Array<{x,y}>` (min 3) | 새 엔티티 ID |
| `tx.drawPoint({ position, layer? })` | `position: {x,y}` | 새 엔티티 ID |
| `tx.drawRay({ start, through, layer? })` | `start/through: {x,y}` | 새 엔티티 ID |
| `tx.drawXline({ start, through, layer? })` | `start/through: {x,y}` | 새 엔티티 ID |
| `tx.drawSpline({ points, closed?, layer? })` | `points: Array<{x,y}>` | 새 엔티티 ID |
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

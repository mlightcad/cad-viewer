---
title: AI로 스크립트 작성하기
---

# AI로 스크립트 작성하기

아래 프롬프트를 ChatGPT, Gemini, DeepSeek 등 AI 대화 도구에 복사하고 요구 사항을 설명하면 AI가 규격에 맞는 CAD 스크립트를 생성합니다. 생성된 스크립트를 스크립트 편집기에 붙여넣어 실행하세요.

## 프롬프트

```text
당신은 CAD 스크립트 어시스턴트입니다. 사용자의 요구 사항에 따라 지정된 환경에서 실행할 수 있는 JavaScript 함수 본문을 생성해 주세요.

## 실행 환경
- 코드는 `function __cadScript(cad) { ... }`로 래핑되어 실행됩니다
- 유일한 매개변수는 `cad`이며, 이를 통해 도면 데이터에 접근하고 작업을 수행합니다
- 엄격 모드("use strict")에서 실행됩니다

## 사용 가능한 내장 객체
- ECMAScript 표준 내장 객체만 사용할 수 있습니다: `Math`, `Number`, `BigInt`, `Object`, `Array`, `Map`, `Set`, `WeakMap`, `WeakSet`, `Symbol`, `String`, `JSON`, `RegExp`, `Intl`, `Date`, `Boolean`, `Promise`, `Error`, `parseFloat`, `parseInt`, `isNaN`, `isFinite`, `encodeURIComponent`, `decodeURIComponent`
- 정보 출력은 반드시 `cad.log()`를 사용하고, `console.log`는 사용하지 마세요

## 제한 사항
- `window`, `document`, `globalThis`, `Function`, `eval`, `fetch`, `navigator`, `location`, `parent`, `top`, `self`, `frames`, `localStorage`, `sessionStorage`, `XMLHttpRequest`, `WebSocket`, `process`, `require`, `module`, `exports`, `Deno`, `Bun`, `importScripts` 접근 금지
- `import`, `export`, 동적 `import()`, `this`, `with`, `import.meta`, `super` 등의 구문 사용 금지
- `constructor`, `prototype`, `__proto__`, `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`, `__lookupSetter__` 접근 금지
- 위 금지 항목과 ECMAScript 표준 내장 객체 외에 다른 브라우저나 페이지 전역 변수(예: `alert`, `setTimeout`, `performance`, `console`)에 접근하지 마세요. 이는 지원되는 API가 아닙니다
- 스크립트 길이는 100000자를 초과할 수 없습니다
- 실행 시간은 2초를 초과하거나 100000개의 명령문 단계를 초과할 수 없습니다
- 반환 값은 JSON.stringify로 직렬화 가능해야 합니다
- 도면 편집은 `cad.edit.transaction` 내에서 수행해야 하며, 도면이 읽기 전용 모드가 아니어야 합니다

## API

### cad.drawing
현재 도면 정보 객체를 반환합니다:
- title: 도면 제목
- currentLayer: 현재 레이어 이름
- units: 삽입 단위(INSUNITS)
- layers: 레이어 배열, 각 항목은 { name, isOn, isFrozen, isLocked }
- extents: 모형 공간 범위 { min: {x,y,z}, max: {x,y,z} }

### cad.entities
엔티티 조회:
- cad.entities.where(predicate) -> 조건을 만족하는 엔티티 스냅샷 배열 반환
- cad.entities.byId(id) -> 지정된 ID의 엔티티 스냅샷 반환, 찾지 못하면 undefined 반환
- cad.entities.inBox(min, max) -> WCS 사각형 영역 {min:{x,y}, max:{x,y}} 내의 엔티티 스냅샷 배열 반환

엔티티 스냅샷(EntitySnapshot) 필드:
- id: 엔티티 ID
- type: 엔티티 타입(AcDb 접두사 제외), 예: Circle, Line, Arc, Polyline, Text, MText, Insert 등
- layer: 소속 레이어 이름
- extents: 엔티티 범위 { min: {x,y,z}, max: {x,y,z} }
- geometry: 타입별 지오메트리 데이터

타입별 geometry 필드:
- Circle: { center: {x,y,z}, radius }
- Line: { start: {x,y,z}, end: {x,y,z} }
- Arc: { center: {x,y,z}, radius, startAngle, endAngle, startAngleDeg, endAngleDeg }
- Ellipse: { center: {x,y,z}, majorRadius, minorRadius }
- Polyline: { points: [{x,y,z}...], closed }
- Text / MText: { position: {x,y,z}, text, height }
- Point: { position: {x,y,z} }
- Ray / Xline: { basePoint: {x,y,z}, unitDir: {x,y,z} }
- Insert(BlockReference): { name, position: {x,y,z}, rotation, scale: {x,y,z} }

### cad.selection
선택 집합 제어:
- cad.selection.ids() -> 현재 선택된 엔티티 ID 배열
- cad.selection.replace(ids) -> 지우고 지정된 ID 목록으로 설정
- cad.selection.add(ids) -> 선택 집합에 추가
- cad.selection.remove(ids) -> 선택 집합에서 제거
- cad.selection.clear() -> 선택 집합 지우기

### cad.view
- cad.view.zoomExtents() -> 모형 공간 범위로 확대/축소

### cad.edit.transaction(label, tx => { ... })
트랜잭션 내에서 편집 작업을 실행하며, 모든 수정 사항은 하나의 실행 취소 그룹으로 처리됩니다. label은 작업 설명입니다.

트랜잭션 내 사용 가능한 메서드:
- tx.drawLine({ start: {x,y}, end: {x,y}, layer? }) -> 새 엔티티 ID 반환
- tx.drawCircle({ center: {x,y}, radius, layer? }) -> 새 엔티티 ID 반환
- tx.drawArc({ center: {x,y}, radius, startAngleDeg, endAngleDeg, layer? }) -> 새 엔티티 ID 반환
- tx.drawRectangle({ corner1: {x,y}, corner2: {x,y}, layer? }) -> 새 엔티티 ID 반환
- tx.drawPolyline({ points: [{x,y}...], closed?, layer? }) -> 새 엔티티 ID 반환
- tx.drawText({ position: {x,y}, text, height?, layer? }) -> 새 엔티티 ID 반환
- tx.erase(ids) -> 삭제된 엔티티 수 반환
- tx.setLayer(ids, layer)
- tx.move(ids, dx, dy) -> 이동된 엔티티 수 반환
- tx.rotate(ids, center: {x,y}, angleDeg) -> 회전된 엔티티 수 반환
- tx.createLayer(name)
- tx.setCurrentLayer(name)

### cad.log(...values)
결과 패널에 로그를 출력하며, 여러 값을 전달할 수 있습니다.

## 출력 요구 사항
- JavaScript 코드만 출력하고 markdown 코드 블록 마커(```)는 출력하지 마세요
- 사용자가 요청하지 않는 한 설명이나 주석을 작성하지 마세요
- 사용자의 요구 사항이 명확하지 않으면 가장 합리적인 구현을 먼저 생성하세요

이제 다음 요구 사항에 따라 스크립트를 생성하세요:
```

## 사용 방법

1. 위의 프롬프트를 ChatGPT, Gemini, DeepSeek 등의 도구에 복사합니다
2. 프롬프트 끝에 요구 사항을 설명합니다. 예:
   - "도면의 모든 원 개수를 레이어별로 그룹화하여 집계"
   - "반지름이 50보다 큰 모든 원을 좌표 (1000, 1000)으로 이동"
   - "레이어 '치수'에 위치 (100, 200)으로 텍스트 '검사 완료' 생성"
3. AI가 생성한 코드를 스크립트 편집기에 붙여넣습니다
4. 「실행」을 클릭하거나 `Ctrl+Enter`를 누릅니다

## 실행 오류 발생 시 AI로 수정

스크립트 실행이 실패하면 결과 패널에 오류 메시지(예: `unknown_api:xxx`, `forbidden_identifier:window`, `script_timeout` 등)가 표시됩니다. 오류 메시지와 원본 스크립트를 함께 AI에 다시 보내 수정 후 다시 생성하도록 합니다.

**AI에 보낼 내용 템플릿:**

```text
이전에 생성된 스크립트 실행이 실패했습니다. 오류 메시지는 다음과 같습니다:

<오류 메시지 붙여넣기>

원본 스크립트는 다음과 같습니다:

<원본 스크립트 붙여넣기>

오류 원인을 분석하고 수정하여 완전한 스크립트를 다시 출력해 주세요. 이전 프롬프트의 모든 제한 사항을 준수해야 합니다.
```

**일반적인 오류 및 원인:**

| 오류 메시지 | 원인 | AI 수정 방법 |
|----------|------|--------------|
| `unknown_api:xxx` | `cad`에 존재하지 않는 API 접근 | 프롬프트에 나열된 API만 사용 |
| `forbidden_identifier:window` | 금지된 전역 객체 사용 | `window`, `document` 등에 대한 접근 제거 |
| `forbidden_syntax:ThisExpression` | `this` 사용 | 일반 함수 또는 화살표 함수로 재작성 |
| `forbidden_member:constructor` | `constructor` 등 금지된 멤버 접근 | 해당 멤버 접근 제거 |
| `script_timeout` | 시간 또는 단계 수 제한 초과 | 루프를 최적화하고 반복 횟수 감소 |
| `script_result_not_serializable` | 반환 값을 직렬화할 수 없음 | 순수 JSON 데이터(객체, 배열, 숫자, 문자열)만 반환 |
| `no_document` | 열린 도면 없음 | 사용자에게 먼저 도면을 열도록 알림 |
| `read_only` | 도면이 읽기 전용 모드인데 스크립트가 편집 시도 | 읽기/쓰기 모드로 전환하거나 편집 작업 제거 |

스크립트가 정상적으로 작동하려면 「실행 → 오류 보고 → 피드백 → 수정」의 여러 반복이 필요할 수 있으며, 이는 정상적인 현상입니다.

## 대화 예시

**사용자 입력:**
> 도면의 모든 폴리라인 총 길이를 집계하고 길이가 1000을 초과하는 폴리라인 ID를 나열

**AI 출력:**
```javascript
let total = 0
const longPolylines = []
for (const e of cad.entities.where(e => e.type === 'Polyline')) {
  const pts = e.geometry.points
  let len = 0
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    len += Math.sqrt(dx * dx + dy * dy)
  }
  if (e.geometry.closed && pts.length > 2) {
    const first = pts[0]
    const last = pts[pts.length - 1]
    const dx = first.x - last.x
    const dy = first.y - last.y
    len += Math.sqrt(dx * dx + dy * dy)
  }
  total += len
  if (len > 1000) longPolylines.push(e.id)
}
return { totalLength: total, longPolylines }
```

---
title: "객체 스냅(OSNAP)"
---

# 객체 스냅(OSNAP)

이 페이지는 **cad-viewer**가 **realdwg-web**의 데이터와 함께 OSNAP을 어떻게 동작시키는지 설명합니다.

## 배경

AutoCAD/ObjectARX에서는 각 엔티티가 `getOsnapPoints(...)`를 재정의하여 특정 스냅 모드에 대한 후보 스냅 점을 반환할 수 있습니다.

`realdwg-web`에서는 각 엔티티 클래스의 `subGetOsnapPoints(...)`를 통해 유사한 패턴을 사용합니다.  
`cad-viewer`는 반환된 점을 사용하여 UI에서 스냅을 수행합니다.

참조:
- AutoCAD ObjectARX `getOsnapPoints`: https://help.autodesk.com/view/OARX/2024/ENU/?guid=OARX-RefGuide-__OVERLOADED_getOsnapPoints_AcDbEntity

## realdwg-web의 핵심 API

기본 정의:
- `AcDbEntity.subGetOsnapPoints(osnapMode, pickPoint, lastPoint, snapPoints, gsMark?)`

매개변수:

- `osnapMode`: 호출당 하나의 모드
- `pickPoint`: 현재 커서의 월드 좌표 점
- `lastPoint`: 명령 흐름에서 이전에 확정된 점
- `snapPoints`: 후보 점을 추가할 출력 배열
- `gsMark`(선택 사항): 하위 엔티티 id이며, 현재 `INSERT`(`AcDbBlockReference`) 하위 엔티티 스냅에 중요합니다

## 지원되는 OSNAP 모드

`AcDbOsnapMode`에 정의되어 있습니다:
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

중요:

- 이 값들은 비트 플래그가 아니라 순서형 id입니다.
- 마스크 변환에는 `acdbOsnapModesToMask(...)`와 `acdbMaskToOsnapModes(...)`를 사용합니다.

## 현재 cad-viewer UI 노출 범위

상태 표시줄(`MlOsnapButton.vue`)은 현재 다음을 노출합니다:

- EndPoint
- MidPoint
- Center
- Node
- Quadrant
- Insertion

아직 UI에 노출되지 않음(주석 처리됨):

- Perpendicular
- Tangent
- Nearest
- Centroid

설정(`AcApSettingManager`)의 기본 활성화 마스크:

- EndPoint + MidPoint + Center

## cad-simple-viewer의 런타임 흐름

1. `AcEdFloatingInput.getPosition()`이 `getOsnapPoint()`를 호출합니다.
2. `getOsnapPoint()`가 `getOsnapPoints()`를 호출합니다.
3. `getOsnapPoints()`가 `view.pick(point, hitRadius)`를 실행합니다.
4. 선택된 각 항목에 대해:
- `item.id`로 모델 공간 엔티티를 확인합니다
- `item.children`이 있으면 `gsMark = child.id`로 엔티티 osnap을 호출합니다
- 그렇지 않으면 `gsMark` 없이 엔티티 osnap을 호출합니다
5. 현재 마스크에서 활성화된 각 모드에 대해 `entity.subGetOsnapPoints(...)`를 호출합니다.
6. 커서에 가장 가까운 반환 점을 선택합니다.
7. 화면 `hitRadius`(기본 20px)에서 변환된 월드 거리 임계값을 적용합니다.
8. 허용되면 커서를 스냅하고 마커를 표시합니다.

## 엔티티 구현 요약(realdwg-web 코드 기준)

- `AcDbLine`: EndPoint, MidPoint, Nearest, Perpendicular(`Tangent` 분기는 존재하지만 점이 없음)
- `AcDbArc`: EndPoint, MidPoint, Nearest, Tangent(`Perpendicular` 분기는 존재하지만 점이 없음)
- `AcDbCircle`: Center, Centroid, Quadrant, Nearest, Tangent
- `AcDbEllipse`: EndPoint(열린 호만), MidPoint(열린 호만), Quadrant(닫힌 타원만)
- `AcDbPolyline`: EndPoint
- `AcDb2dPolyline`: EndPoint
- `AcDb3dPolyline`: EndPoint
- `AcDbPoint`: Node
- `AcDbText`: Insertion
- `AcDbMText`: Insertion
- `AcDbBlockReference`(`INSERT`): Insertion + `gsMark`를 통한 위임된 하위 엔티티 스냅
- 제한적으로 지원되는 추가 엔티티:
- `AcDbRay`: EndPoint(기준점)
- `AcDbFace`: EndPoint(꼭짓점)
- `AcDbTrace`: EndPoint(꼭짓점)
- `AcDbSpline`: EndPoint

## INSERT(`AcDbBlockReference`) OSNAP 로직

`subGetOsnapPoints`에는 두 가지 경로가 있습니다:

1. `Insertion` 모드:
- 블록 참조 삽입점(`this._position`)을 직접 추가합니다

2. 그 외 모드:
- `gsMark`가 제공된 경우에만 동작합니다
- `subEntityGetOsnapPoints(...)`에 위임합니다

위임 흐름(`subEntityGetOsnapPoints`):

1. 가드: `gsMark === this.objectId`이면 반환합니다(재귀 방지)
2. `blockTable.getEntityById(gsMark)`로 엔티티를 확인합니다
3. 해당 하위 엔티티의 `subGetOsnapPoints(...)`를 호출합니다
4. 반환된 점을 이 블록 참조의 `blockTransform`으로 변환합니다
5. 변환된 점을 출력에 추가합니다

## INSERT 스냅이 실패할 수 있는 이유(현재 동작)

1. `gsMark` 없음:
- 비-`Insertion` 모드의 경우 `gsMark`가 없으면 `AcDbBlockReference`는 아무것도 반환하지 않습니다.

2. `gsMark` 모델이 단순화됨:
- 현재 `gsMark`는 공간 자식 히트에서 얻은 하위 엔티티 객체 id이며, 완전한 AutoCAD GS marker 의미론이 아닙니다.

3. INSERT의 레이어 그룹 렌더링:
- 렌더링 시 하나의 INSERT가 동일한 부모 객체 id를 가진 여러 레이어 기반 렌더 그룹으로 분할될 수 있습니다.
- 피킹은 계층적 자식 박스를 사용하여 하위 엔티티 id를 복원합니다.

4. 복잡한/중첩된/경계 변환:
- 위임은 현재 INSERT의 `blockTransform`을 적용합니다.
- 경계 사례(예: 중첩 블록 시나리오 또는 기본값이 아닌 법선/압출 사례)에서는 여전히 잘못되거나 누락된 스냅 점이 발생할 수 있습니다.

이는 `README.md`의 알려진 로드맵 노트와 일치합니다:
- INSERT의 끝점 스냅은 아직 완전히 신뢰할 수 없습니다.

## 알려진 제한 사항 / TODO

- OSNAP 적용 범위는 엔티티에 따라 다릅니다; 많은 모드/엔티티 조합은 의도적으로 아직 구현되지 않았습니다.
- INSERT의 비-삽입점 스냅은 올바른 자식 히트 -> `gsMark` 전파에 의존합니다.
- 현재 마커 메커니즘은 객체 id 기반이며 완전한 AutoCAD GS marker 동작이 아닙니다.
- INSERT, 특히 중첩 블록과 변환된 블록에 대한 회귀 테스트가 더 필요합니다.

## 권장 기여 방향

- INSERT에 대한 자식 히트 -> `gsMark` 매핑의 견고성을 개선합니다.
- EndPoint/MidPoint/Center/Nearest/Tangent 사례에 대한 중첩 블록 회귀 테스트를 추가합니다.
- 엔티티별 모드 적용 범위를 점진적으로 확장합니다.
- 가능하면 마커 모델을 AutoCAD GS marker 의미론에 더 가깝게 정렬합니다.

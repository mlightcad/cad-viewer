---
title: "Jig 시스템"
---

# Jig 시스템

AutoCAD는 사용자 입력을 받는 동안 실시간 시각적 피드백을 제공하기 위해 AcEdJig 프레임워크에 의존합니다. 강력하지만 이 시스템은 프롬프트, 미리보기 렌더링 및 입력 샘플링을 여러 재정의 메서드에 걸쳐 분리하므로, 로직이 서로 다른 함수와 수명 주기 단계에 흩어지는 경우가 많습니다. MLightCAD는 프롬프트 입력과 원활하게 통합되는 통합된 TypeScript 기반 jig 메커니즘을 도입하여 이 개념을 웹에 맞게 재구상했습니다. 드래그 루프나 샘플러 상태 코드를 관리하는 대신, 개발자는 jig를 프롬프트 옵션에 직접 연결하여 동적 미리보기 로직, 사용자 입력 및 최종 엔티티 생성을 하나의 읽기 쉬운 워크플로에 함께 유지합니다.

## 개요

MLightCAD의 **Jig 시스템**은 대화형 미리보기와 동적 엔티티 생성을 가능하게 하며, AutoCAD의 **AcEdJig**(ObjectARX)와 유사한 워크플로를 제공합니다. *jig*는 커서 이동이나 증분 사용자 입력에 따라 지속적으로 업데이트되는 임시 미리보기 엔티티를 관리합니다.

사용 사례는 다음과 같습니다:

* 대화형 기하 생성(점, 원, 폴리라인 등)
* 실시간 거리 또는 각도 측정
* 기존 엔티티의 실시간 수정

그러나 MLightCAD는 **더 단순하고 응집력 있으며 TypeScript에 더 친화적인 설계**를 도입하여, AutoCAD jig에서 흔히 볼 수 있는 구조적 복잡성을 줄입니다.

## 핵심 아키텍처 차이

### Jig가 프롬프트 옵션에 전달됨

AutoCAD에서는 프롬프트와 jig가 별개의 메커니즘입니다. Jig 실행을 위해서는 `sampler()`, `worldDraw()`를 재정의하고 `drag()`를 호출해야 합니다.

MLightCAD에서는 프롬프트가 **jig 인스턴스를 직접 전달**할 수 있습니다:

```ts
const opts = new AcEdPromptDistanceOptions('Specify radius:')
opts.jig = new CircleJig(view, center)
const radius = await editor.getDistance(opts)
```

이 설계는:

* 사용자 입력을 라이브 미리보기에 자동으로 연결합니다
* 수동 드래그 루프 관리를 제거합니다

➡️ 결과: **적은 보일러플레이트, 더 많은 일관성**.

---

### 완전한 동적 입력 로직이 함께 유지됨

[AutoCAD AcEdJig 샘플 코드](https://help.autodesk.com/view/OARX/2023/ENU/?guid=GUID-9BF40890-7F1D-4EA3-9767-B6659B8E24FC)에서 볼 수 있듯이, AutoCAD는 하나의 타원을 생성하기 위한 입력 로직을 여러 위치로 분리합니다.

* `createEllipse()` — 타원 중심점 획득
* `sampler()` — 장축 끝점과 타원 중심에서 단축 끝점까지의 거리 획득

MLightCAD에서는 전체 동적 입력 워크플로가 다음과 같이 순차적으로 표현됩니다.

```ts
const center = await editor.getPoint(pointOpts)
radiusOpts.jig = new CircleJig(view, center)
const radius = await editor.getDistance(radiusOpts)
```

➡️ 사용자 입력, jig 미리보기 및 최종 기하는 **동일한 코드 블록**에서 관리됩니다.

## 핵심 개념

### 제네릭 Jig(`AcEdPreviewJig<T>`)

`AcEdPreviewJig<T>`는 일시적 미리보기 엔티티를 관리하는 TypeScript 기반 클래스입니다:

| AutoCAD AcEdJig | Web CAD Jig(`AcEdPreviewJig`)      |
| --------------- | ----------------------------------- |
| `sampler()`     | `update(value: T)`                  |
| `startJig()`    | `setEntity()`                       |
| `drag()`        | JS 이벤트를 통해 외부에서 제어됨 |

**기능:**

-   제네릭 유형 `T`를 사용하여 여러 입력 유형(점, 거리, 각도 등)을 처리합니다
-   `AcEdBaseView`와 통합되어 일시적 엔티티를 렌더링합니다
-   동적 기하 업데이트를 위해 `onJigUpdate(value: T)`를 구현하는 미리보기 엔티티를 지원합니다
-   `end()`를 사용하여 jig를 깔끔하게 종료할 수 있습니다

* * *

### 핵심 메서드

#### `update(value: T): void`

사용자 입력에 따라 미리보기 엔티티를 업데이트합니다. 이는 AutoCAD의 `sampler()`에 해당합니다.

#### `render(): void`

AutoCAD의 `worldDraw()`와 유사하게, 연결된 뷰에서 미리보기 엔티티를 렌더링합니다.

#### `end(): void`

일시적 엔티티를 지우고 jig 세션을 종료합니다.

#### `entity: AcDbEntity | null`

현재 미리보기 엔티티에 대한 게터입니다.

## Jig 사용하기

### 1단계: Jig 클래스 생성

특정 엔티티에 대해 `AcEdPreviewJig<T>`를 상속하는 클래스를 생성해야 합니다. 예를 들어 **원 jig**를 생성하는 방법은 다음과 같습니다:

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

**설명:**

-   jig는 일시적 `AcDbCircle`을 관리합니다.
-   `update` 메서드는 사용자 입력에 따라 반지름을 동적으로 변경합니다.

* * *

### 2단계: 명령에서 Jig 사용하기

명령에 jig를 통합하여 엔티티를 대화형으로 생성할 수 있습니다:

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

**워크플로:**

1.  사용자에게 원의 **중심**을 입력하도록 프롬프트합니다.
1.  중심에 연결된 **원 jig**를 생성합니다.
1.  대화형 미리보기와 함께 사용자에게 **반지름**을 입력하도록 프롬프트합니다.
1.  최종 확정된 원을 데이터베이스에 커밋합니다.

* * *

## 사용자 입력

AcEditor 입력 API, 프롬프트 옵션, 키워드 규칙 및 프롬프트 결과 처리에 대한 완전하고 최신 가이드는 다음을 참조하십시오:

[사용자 입력](./user-input)

## 참고 자료

-   [AutoCAD AcEdJig 문서](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-CF581B82-FF80-42C6-9E9C-2394B7A96076)
-   [AutoCAD AcEdJig 드래그 루프](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-E0A88178-CEE6-4983-950C-119CED7BA474)
-   [AutoCAD AcEdJig 샘플 코드](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-9BF40890-7F1D-4EA3-9767-B6659B8E24FC)

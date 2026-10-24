---
title: "명령"
---

# 명령

이 페이지는 **MLightCAD**에서 사용자 정의 명령을 생성하고 사용자가 트리거할 수 있도록 등록하는 방법을 설명합니다.

## 개요

명령은 사용자가 MLightCAD와 상호 작용하는 주된 방법입니다. 각 명령은 선 그리기, 원 생성, 확대 또는 객체 선택과 같은 특정 작업을 나타냅니다.

시스템은 명령을 그룹으로 관리하고, 이름으로 조회하며, 편집기를 통해 수명 주기 이벤트를 처리하기 위한 **명령 스택**(`AcEdCommandStack`)을 제공합니다.

## 명령 수명 주기

각 명령은 `AcEdCommand`가 관리하는 잘 정의된 수명 주기를 따릅니다:

1.  명령이 `trigger()`를 통해 **트리거**됩니다
1.  `commandWillStart` 이벤트가 발생합니다
1.  현재 컨텍스트와 함께 `execute()` 메서드가 호출됩니다
1.  (오류가 발생하더라도 항상) `commandEnded` 이벤트가 발생합니다

내부적으로 이 수명 주기는 다음과 같이 구현됩니다:

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

### 핵심 보장 사항

-   `commandWillStart`는 `execute()` **이전에** 항상 발생합니다

-   `commandEnded`는 명령이 예외를 발생시키거나 취소되더라도 실행 **이후에** 항상 발생합니다

-   명령은 다음을 재정의하여 수명 주기 로직에 연결할 수 있습니다:

    -   `onCommandWillStart(context)`
    -   `onCommandEnded(context)`

## 명령 생성

모든 명령은 추상 `AcEdCommand` 클래스를 상속해야 합니다:

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

### 참고 사항

-   `execute()`는 다음을 포함하는 현재 `AcApContext`를 받습니다:

    -   `context.view`
    -   `context.doc`

-   이미 명령 내부에 있는 경우 전역 편집기 인스턴스에 접근하는 대신 **항상 다음을 선호하십시오**:

    ```
    context.view.editor
    ```

## 상태 머신을 사용한 복잡한 명령(다중 분기)

**연속 입력 + 다중 분기 + 실시간 미리보기**가 있는 명령(예: `PLINE`)의 경우 모든 명령 로직을 단일 Jig에 넣지 마십시오. 이는 빠르게 유지 관리하기 어려워집니다.

권장 접근 방식:

-   **명령 로직**은 **상태 머신**이 처리합니다(분기 제어)
-   **Jig**는 **현재 상태에 대한 미리보기**만 처리합니다

이 분리는 명령을 읽기 쉽게 유지하고 다른 복잡한 명령에서 상태 머신 패턴을 재사용할 수 있게 합니다.

### 상태 머신을 사용하는 이유

-   복잡한 명령은 여러 키워드 분기에 반응해야 합니다
-   각 분기는 서로 다른 프롬프트 규칙과 미리보기 동작을 가집니다
-   상태 머신은 이러한 관심사를 각 상태에 국한시켜 유지합니다

### 권장 아키텍처

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

### 상태 머신 기본 클래스

이 프로젝트는 프롬프트 기반 명령을 위한 재사용 가능한 상태 머신 헬퍼를 제공합니다:

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

### 상태와 Jig 간의 상호 작용

-   각 상태는 자체 프롬프트 옵션을 구성합니다
-   프롬프트는 **미리보기 전용** Jig를 연결합니다
-   Jig는 키워드나 분기에 대해 **알지 못합니다**

즉:

-   **상태**는 무엇을 물을지와 어떻게 전환할지 결정합니다
-   **Jig**는 해당 상태의 현재 미리보기만 그립니다

### 예제: 다중 분기 폴리라인(간소화)

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

### 실무 참고 사항

-   **데이터 모델**(점, 불지, 미리보기 상태)을 명령 컨트롤러에 유지하십시오
-   각 상태는 **작고 집중적**이어야 합니다
-   공유 워크플로 패턴에는 `AcEdPromptStateMachine`을 선호하십시오
-   명령 컨트롤러가 **최종 엔티티 생성**을 담당합니다

전체 예제는 [폴리라인 명령 구현](https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-simple-viewer/src/command/AcApPolylineCmd.ts)을 참조하십시오.

## 명령 수명 주기 이벤트 수신

명령 수명 주기 이벤트는 명령 자체가 아닌 **편집기**에 의해 노출됩니다.

### 사용 가능한 편집기 이벤트

```
public readonly events = {
  sysVarChanged: new AcCmEventManager<AcDbSysVarEventArgs>(),
  /** Fired just before the command starts executing */
  commandWillStart: new AcCmEventManager<AcEdCommandEventArgs>(),
  /** Fired after the command finishes executing */
  commandEnded: new AcCmEventManager<AcEdCommandEventArgs>()
}
```

### `AcEditor` 인스턴스 얻기

애플리케이션 내 위치에 따라:

#### 어디서든(전역 접근)

```
const editor =
  AcApDocManager.instance.curView.editor
```

#### 명령 실행 내부

```
const editor = context.view.editor
```

### 예제: 명령 이벤트 수신

```
const editor = AcApDocManager.instance.curView.editor

editor.events.commandWillStart.addEventListener(({ command }) => {
  console.log('Command will start:', command.globalName)
})

editor.events.commandEnded.addEventListener(({ command }) => {
  console.log('Command ended:', command.globalName)
})
```

### 일반적인 사용 사례

-   명령 기록 추적
-   UI 상태(툴바, 패널) 업데이트
-   상호 작용 잠금 또는 잠금 해제
-   분석 또는 원격 측정 구현
-   ObjectARX `commandWillStart` / `commandEnded` 동작 에뮬레이션

## 명령 액세스 모드

`AcEdCommand`는 이제 **최소 액세스 모드 요구 사항**을 지원하여 명령이 필요한 문서 액세스 수준을 선언할 수 있습니다.

### 열기 모드

MLightCAD는 세 가지 문서 열기 모드를 지원합니다:

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

값이 높은 모드는 값이 낮은 모드와 호환됩니다:

-   `Write` ≥ `Review` ≥ `Read`

다음을 통해 현재 문서의 열기 모드에 접근할 수 있습니다:

```
context.doc.openMode
```

또는

```
AcApDocument.openMode
```

### 명령 모드 설정

각 명령은 **최소 필수 액세스 모드**를 선언할 수 있습니다:

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

#### 모드 속성

```
get mode(): AcEdOpenMode
set mode(value: AcEdOpenMode)
```

### 동작

-   명령은 다음 조건에서만 **실행될 수 있습니다**:

    ```
    document.openMode >= command.mode
    ```

-   예시:

    -   `Write` 명령은 `Read` 모드에서 실행될 **수 없습니다**
    -   `Review` 명령은 `Write` 모드에서 실행될 **수 있습니다**
    -   `Read` 명령은 모든 모드에서 실행됩니다

이를 통해 다음이 가능합니다:

-   안전한 읽기 전용 뷰어
-   검토 전용 워크플로
-   편집 명령에 대한 엄격한 쓰기 보호

## 명령 등록

명령은 `AcApDocManager.instance.commandManager`를 통해 등록됩니다.

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

### 참고 사항

-   `globalName`은 명령 그룹 내에서 고유해야 합니다

-   `localName`은 사용자에게 표시되며 현지화할 수 있습니다

-   명령 그룹:

    -   `ACAD` – 시스템 명령
    -   `USER` – 사용자 정의 명령

## 명령 별칭

MLightCAD는 AutoCAD 스타일 명령 별칭(`acad.pgp` 동작과 유사)을 지원합니다.

### `addCommand`로 별칭 등록

`addCommand`의 5번째 인수에 별칭을 제공할 수 있습니다:

```
register.addCommand(
  'USER',
  'MYCMD',
  'MyCmd',
  myCommand,
  ['MC', 'MY']
)
```

별칭 규칙:

-   별칭 매칭은 대소문자를 구분하지 않습니다(내부적으로 대문자로 정규화됨)
-   별칭은 동일한 명령 그룹 내에서 고유해야 합니다
-   별칭은 동일한 그룹의 기존 전역/로컬 명령 이름과 충돌할 수 없습니다

### `AcApDocManager`에서 별칭 구성

`AcApDocManagerOptions`는 초기화 시 별칭 매핑을 재정의할 수 있는 `commandAliases`를 제공합니다:

```
AcApDocManager.createInstance({
  commandAliases: {
    LINE: ['L', 'LN'],
    CIRCLE: 'CI',
    ZOOM: ['Z']
  }
})
```

동작:

-   명령에 사용자 구성 별칭이 있으면 해당 명령의 내장 기본값을 대체합니다
-   명령이 구성되지 않은 경우 내장 기본 별칭이 사용됩니다

### 조회 및 UI 동작

-   `lookupGlobalCmd()`와 `lookupLocalCmd()` 모두 별칭 조회를 지원합니다
-   `searchCommandsByPrefix()`는 별칭 접두사 매칭을 지원합니다
-   명령줄 자동 완성은 목록에 별칭을 표시합니다. 예:
    `LINE（L, LN） - description`

## 명령 트리거

등록되면 명령을 프로그래밍 방식으로 실행할 수 있습니다:

```
AcApDocManager.instance.sendStringToExecute('CIRCLE')
```

## 전체 워크플로

1.  `AcEdCommand`를 상속하여 명령을 생성합니다
1.  (선택 사항) 명령의 필수 액세스 `mode`를 설정합니다
1.  `commandManager`에 등록합니다
1.   (선택 사항) 필요한 경우 `AcEditor`를 통해 수명 주기 이벤트를 수신합니다
1.  이름 또는 프로그래밍 방식으로 명령을 트리거합니다

## 사용자 정의 명령 현지화

<https://github.com/mlightcad/cad-simple-viewer-example>에서 현지화 지원이 포함된 사용자 정의 명령을 보여주는 전체 예제를 찾을 수 있습니다.

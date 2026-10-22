---
title: "시스템 변수"
---

# 시스템 변수

이 페이지는 CAD-Viewer에서 시스템 변수가 어떻게 동작하는지, 사용자가 명령줄에서 시스템 변수를 어떻게 변경하는지, 그리고 `AcDbSystemVariables`와 `AcDbSysVarManager`를 통해 어떻게 구현되는지 설명합니다.

## 시스템 변수란 무엇인가

`시스템 변수`는 CAD 시스템의 일부 동작 방식을 제어하는 전역 설정입니다.

명령은 보통 작업을 시작하거나, 형상을 생성하거나, 대화상자를 엽니다. 시스템 변수는 이와 다른 역할을 합니다. 즉, 명령 동작, 기본값, 도면 상태 또는 사용자 인터페이스 동작을 제어합니다.

대표적인 예는 다음과 같습니다:

- 새 엔티티가 생성될 레이어
- 사용할 기본 색상, 선가중치 또는 선종류 축척
- 표시 모드의 활성화 여부
- 편집기나 뷰어가 시각적으로 반응하는 방식

이는 의도적으로 AutoCAD와 유사하게 설계되었습니다. CAD-Viewer에서는 명령줄에서 변수 이름을 입력한 뒤 새 값을 입력하여 시스템 변수를 직접 설정할 수 있습니다.

예를 들어:

```text
Command: PICKBOX
New value for PICKBOX <3>: 5
```

즉, 명령줄은 시스템 변수 이름 자체를 해당 설정을 갱신하는 명령으로 취급합니다.

CAD-Viewer가 이 모델을 채택한 이유는 런타임 설정을 명령 로직 곳곳에 하드코딩하는 대신 하나의 일관된 메커니즘을 통해 읽고, 변경하고, 관찰할 수 있게 하기 위해서입니다.

## 명령줄에서 시스템 변수 설정하기

명령줄 작업 흐름은 간단합니다:

1. 시스템 변수 이름을 입력합니다.
2. Enter 키를 누릅니다.
3. 새 값을 입력합니다.
4. 다시 Enter 키를 눌러 적용합니다.

이는 많은 CAD 사용자가 AutoCAD에서 이미 익숙한 것과 동일한 상호 작용 방식입니다.

예를 들어 현재 레이어를 변경하려면:

```text
Command: CLAYER
New value for CLAYER <0>: Walls
```

픽박스 크기를 변경하려면:

```text
Command: PICKBOX
New value for PICKBOX <3>: 10
```

다시 말해 시스템 변수를 할당하는 데 별도의 `SETVAR` 방식 작업 흐름이 필요하지 않습니다. 명령줄에 시스템 변수 이름을 직접 입력하고 새 값을 할당할 수 있습니다.

## 시스템 변수가 명령으로 등록되는 방식

CAD-Viewer에서 시스템 변수를 명령줄에서 사용할 수 있는 이유는 애플리케이션 초기화 중에 일반 명령으로 등록되기 때문입니다.

등록은 `AcApDocManager`에서 수행됩니다. 여기서 `AcDbSysVarManager`의 모든 시스템 변수 디스크립터를 로드하고 각 변수 이름을 명령으로 등록합니다:

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

의미는 다음과 같습니다:

- 등록된 모든 시스템 변수는 자동으로 명령이 됩니다
- 명령 이름은 `CLAYER` 또는 `PICKBOX`처럼 시스템 변수 이름 자체입니다
- 이 명령들은 모두 동일한 명령 구현(`AcApSysVarCmd`)을 공유합니다

`AcApSysVarCmd`는 특정 변수를 하드코딩하지 않습니다. 대신 실행될 때 현재 명령 이름(`this.globalName`)을 사용해 일치하는 시스템 변수 디스크립터를 조회하고, 사용자에게 새 값을 묻고, `setVar(...)`를 호출합니다.

흐름은 사실상 다음과 같습니다:

`system variable name entered` -> `AcApSysVarCmd.execute()` -> prompt for value -> `AcDbSysVarManager.setVar(...)`

따라서 두 계층이 관여합니다:

- `AcDbSysVarManager`는 런타임에 어떤 시스템 변수가 존재하는지 결정합니다
- `AcApDocManager`는 이러한 런타임 변수를 명령줄 명령으로 노출합니다

그래서 새로운 시스템 변수에 대한 지원은 보통 `AcDbSysVarManager`에 해당 디스크립터를 등록하는 것에서 시작합니다. 일단 `getAllDescriptors()`에 포함되면 명령 스택에도 등록되어 명령줄에서 바로 사용할 수 있습니다.

## CAD-Viewer에서의 설계 방식

현재 구현은 두 파일을 중심으로 합니다:

- [AcDbSystemVariables](https://mlightcad.github.io/realdwg-web/variables/_mlightcad_data-model.AcDbSystemVariables.html)
- [AcDbSysVarManager](https://mlightcad.github.io/realdwg-web/classes/_mlightcad_data-model.AcDbSysVarManager.html)

두 파일은 서로 다른 목적을 가집니다.

### 1. `AcDbSystemVariables`

`AcDbSystemVariables`는 시스템 변수 이름 상수의 표준 목록입니다.

주요 역할은 다음과 같습니다:

- 변수 이름에 대한 단일 정보 출처를 제공합니다
- 코드베이스 전반에 하드코딩된 문자열을 방지합니다
- 호출자가 타입 안전하게 변수를 참조할 수 있도록 합니다
- `AcDbSystemVariableName`과 같은 파생 타입을 지원합니다

CAD-Viewer의 시스템 변수 이름 레지스트리로 이해하면 됩니다.

### 2. `AcDbSysVarManager`

`AcDbSysVarManager`는 시스템 변수의 런타임 관리자입니다. 다음을 담당합니다:

- 변수 디스크립터 등록
- 타입 및 기본값 메타데이터 저장
- 통합된 `getVar` 및 `setVar` 접근 제공
- 데이터베이스에 저장되지 않는 변수 캐싱
- 변경 이벤트 디스패치

사실상 시스템 변수의 레지스트리, 접근 계층, 이벤트 허브 역할을 합니다.

## 두 종류의 시스템 변수

현재 설계에서 시스템 변수는 두 범주로 나뉩니다.

### 데이터베이스 상주 변수

이 변수들은 `AcDbDatabase`에 저장됩니다. `AcDbSysVarManager`는 변수 이름을 데이터베이스 필드에 매핑하여 이들을 읽고 씁니다.

현재 등록된 예는 다음과 같습니다:

- `CECOLOR`
- `CELTSCALE`
- `CELWEIGHT`
- `CLAYER`
- `LWDISPLAY`

이들은 도면 상태 및 기본 도면 속성에 더 가깝습니다.

### 비데이터베이스 변수

이 변수들은 `AcDbDatabase`에 직접 저장되지 않습니다. 대신 `AcDbSysVarManager` 내부에 캐시됩니다.

현재 등록된 예는 다음과 같습니다:

- `COLORTHEME`
- `PICKBOX`
- `WHITEBKCOLOR`

이들은 편집기 동작이나 UI 상태에 더 가깝습니다.

## 이 분리가 중요한 이유

두 종류의 변수를 분리하면 두 가지 즉각적인 이점이 있습니다:

- 도면 관련 설정은 데이터베이스 모델에 그대로 귀속될 수 있습니다
- 호스트 애플리케이션이나 UI 관련 설정을 데이터베이스 계층에 억지로 넣지 않아도 됩니다

이를 통해 시스템 변수가 데이터 모델과 편집기 계층 모두에 깔끔하게 기여할 수 있습니다.

## 현재 구현의 핵심 기능

### 통합 접근

호출자는 변수가 데이터베이스에 저장되는지 관리자가 소유한 런타임 캐시에 저장되는지 알 필요가 없습니다. 두 경우 모두 동일한 접근 API를 사용할 수 있습니다:

```ts
const sysVarManager = AcDbSysVarManager.instance()

const currentLayer = sysVarManager.getVar('CLAYER', db)
sysVarManager.setVar('CLAYER', 'Walls', db)
sysVarManager.setVar('PICKBOX', 12, db)
```

### 타입 변환

`setVar`는 등록된 디스크립터 타입에 따라 기본적인 변환을 수행합니다. 현재 구현은 다음과 같은 값에 대한 변환을 지원합니다:

- `number`
- `boolean`
- `color`

이는 값이 명령줄 입력, 폼 또는 스크립트에서 오며 처음에는 문자열로 전달되는 경우에 유용합니다.

### 변경 알림

`AcDbSysVarManager`는 `sysVarChanged` 이벤트를 노출하여 상위 모듈이 시스템 변수 갱신에 반응할 수 있게 합니다.

```ts
AcDbSysVarManager.instance().events.sysVarChanged.addEventListener(args => {
  console.log(args.name, args.oldVal, args.newVal)
})
```

현재 구현에서 이 이벤트는 주로 비데이터베이스 변수 변경 시 디스패치되므로, 편집기 및 UI 동기화에 특히 적합합니다.

## 예제: `PICKBOX`

`PICKBOX`는 픽박스의 절반 크기를 픽셀 단위로 나타냅니다. 비데이터베이스 변수이지만 사용자 상호 작용 동작에 직접 영향을 줍니다.

`cad-viewer`에서 `AcEdCursorManager`는 `PICKBOX` 변경을 수신합니다. 값이 변경되면 십자 커서의 사각형 부분을 다시 만들고 활성 커서를 즉시 다시 적용합니다. 이는 시스템 변수가 단순히 저장된 구성 데이터가 아니라 실시간 UI 동작을 구동하는 요소가 될 수 있음을 보여 줍니다.

참조 구현:

- [AcEdCursorManager.ts](https://raw.githubusercontent.com/mlightcad/cad-viewer/main/packages/cad-simple-viewer/src/editor/input/AcEdCursorManager.ts)

흐름은 다음과 같습니다:

`setVar('PICKBOX', ...)` -> `sysVarChanged` event -> cursor manager updates cursor appearance

이는 이 추상화가 유용한 이유를 보여 주는 가장 명확한 예 중 하나입니다.

## 현재 코드에서 중요한 세부 사항

`AcDbSystemVariables.ts`는 인식되는 변수 이름의 표준 집합을 정의하지만, `AcDbSysVarManager`는 현재 생성자에서 그중 일부만 등록합니다.

다시 말해:

- `AcDbSystemVariables`는 이름 카탈로그입니다
- `AcDbSysVarManager.registry`는 런타임에 실제로 지원되는 변수를 결정합니다

이는 합리적인 진화 경로입니다. 먼저 이름을 정의하고, 각 변수가 지원될 때 타입 메타데이터, 기본값, 저장 전략, 동작을 점진적으로 추가하는 방식입니다.

## 권장 확장 패턴

향후 시스템 변수를 더 추가할 때 권장되는 작업 흐름은 다음과 같습니다:

1. `AcDbSystemVariables`에 변수 이름 상수를 추가합니다
2. `AcDbSysVarManager`에 디스크립터를 등록합니다
3. 데이터베이스 상주 변수인지 런타임 전용 변수인지 결정합니다
4. 타입, 기본값, 설명을 정의합니다
5. 명령이나 UI에 영향을 주어야 한다면 비즈니스 로직에 하드코딩된 검사를 넣기보다 이벤트 기반 통합을 선호합니다

## 새 시스템 변수 추가 방법

새 시스템 변수를 추가하는 작업은 보통 다섯 단계로 이루어집니다.

### 1. `AcDbSystemVariables`에 변수 이름 추가

먼저 `AcDbSystemVariables`에 새 표준 이름 상수를 추가합니다.

이렇게 하면 변수 이름이 중앙 집중화되고, 코드베이스 전반에 하드코딩된 문자열이 흩어지는 것을 방지할 수 있습니다.

예를 들어:

```ts
export const MYNEWVAR = 'MYNEWVAR'
```

### 2. `AcDbSysVarManager`에 디스크립터 등록

다음으로 `AcDbSysVarManager`에 변수를 등록합니다. 이 단계에서 변수가 런타임에 실제로 지원됩니다.

등록할 때 다음을 정의합니다:

- 이름
- 타입
- 기본값
- 값이 `AcDbDatabase`에 저장되는지 관리자 캐시에만 저장되는지 여부
- 디스크립터 모델에서 요구하는 설명 또는 메타데이터

이것이 가장 중요한 단계입니다. 변수가 `AcDbSystemVariables`에만 존재하고 `AcDbSysVarManager`에 등록되지 않으면, 그것은 이름 상수일 뿐 사용 가능한 시스템 변수가 아닙니다.

`AcApDocManager`는 초기화 중에 등록된 모든 시스템 변수를 자동으로 명령으로 등록합니다.

즉, 새로 추가된 변수는 보통 전용 명령 클래스를 작성하지 않고도 명령줄에서 사용할 수 있습니다.

명령줄 흐름은 다음과 같습니다:

```text
Command: MYNEWVAR
New value for MYNEWVAR <default>: ...
```

### 3. 저장 모델 선택

그다음 새 변수가 다음 중 어느 쪽인지 결정해야 합니다:

- 도면 상태나 도면 기본값에 속하면 데이터베이스 상주 변수
- 편집기 동작, UI 기본 설정 또는 애플리케이션 런타임 상태에 속하면 비데이터베이스 변수

데이터베이스 상주 변수라면 `AcDbSysVarManager`가 이를 `AcDbDatabase`의 필드에 매핑할 수 있어야 합니다.

비데이터베이스 변수라면 `AcDbSysVarManager`가 내부 런타임 캐시에 보관할 수 있습니다.

경험칙은 다음과 같습니다:

- 현재 레이어나 현재 색상과 같은 항목에는 데이터베이스 상주 변수를 사용합니다
- 픽박스 크기나 색상 테마와 같은 항목에는 비데이터베이스 변수를 사용합니다

### 4. 필요 시 동작 연결

변수 변경이 UI나 편집기 동작에 즉시 영향을 주어야 한다면 소비 모듈에 해당 로직을 추가합니다.

선호되는 패턴은 여러 위치에서 변수를 수동으로 검사하는 대신 `sysVarChanged`에 반응하는 것입니다.

`PICKBOX`는 이 패턴의 좋은 예입니다:

- 변수는 `AcDbSysVarManager`에 등록됩니다
- 명령 시스템이 이를 명령줄에 노출합니다
- `AcEdCursorManager`가 변경을 수신하고 커서를 즉시 갱신합니다

따라서 실제로 새 변수에 대한 최소 경로는 다음과 같습니다:

1. `AcDbSystemVariables`에 이름을 정의합니다
2. `AcDbSysVarManager`에 디스크립터를 등록합니다
3. 저장 전략을 결정합니다
4. 선택적으로 값에 반응하는 리스너나 비즈니스 로직을 연결합니다

그 후에는 내장 시스템 변수와 동일한 통합 `getVar` / `setVar` 흐름에 참여할 수 있습니다.

## 요약

CAD-Viewer에서 시스템 변수는 단순한 설정 모음 이상입니다. 이들은 애플리케이션 상태에 대한 통합 추상화를 형성합니다:

- 아래로는 도면 관련 데이터베이스 상태에 매핑됩니다
- 위로는 편집기와 UI 동작을 구동합니다
- 중간에서 중앙 집중식 접근, 타입 제약, 변경 알림을 제공합니다

명령이 "무엇을 할지"에 대한 답이라면, 시스템 변수는 "어떤 설정이나 모드에서 수행할지"에 대한 답입니다.

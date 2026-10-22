---
title: "다중 저장소 디버깅"
---

# 다중 저장소 디버깅

`cad-viewer` 저장소는 다른 MLight 저장소의 패키지에 의존합니다. 예를 들어:

- 저장소 **`cad-viewer`**
  - 패키지: `@mlightcad/cad-simple-viewer`
- 저장소 **`realdwg-web`**
  - 패키지: `@mlightcad/data-model`, `@mlightcad/libredwg-converter`
- 저장소 **`mtext-renderer`**
  - 패키지: `@mlightcad/mtext-renderer`, `@mlightcad/mtext-input-box`, `@mlightcad/mtext-parser`

의존성 체인 예시:

```
@mlightcad/cad-simple-viewer  --->  @mlightcad/data-model
                                   @mlightcad/libredwg-converter
                                   @mlightcad/mtext-renderer
```

개발 중에는 `cad-viewer` 내부에서 즉시 수정하고 테스트해야 하는 버그가 `realdwg-web`이나 `mtext-renderer`에 존재할 수 있습니다.

## `pnpm link`의 문제

여러 모노레포에 걸쳐 `pnpm link`를 사용하면 여러 문제가 발생합니다:

- 설정과 해제가 복잡함
- unlink 단계를 잊기 쉬움
- `node_modules` 상태를 파악하기 어려워짐
- CI / 재현성을 깨뜨림
- 새로운 개발자가 따라가기 어려움

로컬 디버깅을 단순화하기 위해 pnpm overrides와 함께 **로컬 디렉터리 의존성** 방식을 채택합니다.

## 해결책: pnpm overrides와 함께 로컬 디렉터리 의존성 사용

패키지를 게시하거나 링크하는 대신, `pnpm-workspace.yaml`의 `overrides`를 일시적으로 변경하여 다른 저장소에 있는 패키지의 로컬 파일 시스템 경로를 직접 참조합니다.

중앙 집중식 버전 관리는 `pnpm-workspace.yaml`에 있습니다:

- 게시된 semver 범위(예: `^1.8.3`)가 릴리스의 정보 출처입니다
- `pnpm sync:versions`가 해당 값을 각 `packages/*/package.json`으로 전파합니다
- CI와 릴리스 스크립트는 `pnpm sync:versions:check`를 실행하여 모든 것이 정렬된 상태로 유지되도록 합니다

단기 디버깅을 위해서는 semver override를 `file:` 경로로 대체합니다. 이 방식은:

✅ `pnpm`과 자연스럽게 동작합니다  
✅ 전역 링크가 필요하지 않습니다  
✅ 명시적이며 되돌리기 쉽습니다  
✅ 단기 디버깅에 적합합니다  
✅ 의존성 해석을 예측 가능하게 유지합니다  
✅ 모노레포의 모든 패키지에 적용됩니다

## 디렉터리 레이아웃(권장)

저장소를 나란히 배치합니다:

```
workspace/
├── cad-viewer/
│   ├── packages/
│   │   └── cad-simple-viewer/
│   ├── package.json
│   └── pnpm-workspace.yaml
│
├── realdwg-web/
│   ├── packages/
│   │   ├── data-model/
│   │   └── libredwg-converter/
│   └── pnpm-workspace.yaml
│
└── mtext-renderer/
    ├── packages/
    │   ├── mtext-renderer/
    │   └── mtext-input-box/
    └── pnpm-workspace.yaml
```

> ⚠️ 이 레이아웃은 **필수가 아니지만**, 상대 경로를 관리하기가 더 쉽습니다.

## 단계별 가이드

### 1. `pnpm-workspace.yaml`에 로컬 `file:` override 추가

`cad-viewer/pnpm-workspace.yaml`에서 디버깅하려는 semver 항목을 로컬 경로로 일시적으로 대체합니다.

일반(게시된) override는 다음과 같습니다:

```yaml
packages:
  - 'packages/*'

overrides:
  '@mlightcad/data-model': '^1.8.3'
  '@mlightcad/libredwg-converter': '^3.6.3'
  '@mlightcad/mtext-input-box': '^0.2.16'
  '@mlightcad/mtext-renderer': '^0.11.2'
  # ... other shared dependency pins
```

로컬 디버깅을 위해서는 테스트해야 하는 패키지만 변경합니다:

```yaml
overrides:
  '@mlightcad/data-model': 'file:../realdwg-web/packages/data-model'
  '@mlightcad/libredwg-converter': 'file:../realdwg-web/packages/libredwg-converter'
  '@mlightcad/mtext-renderer': 'file:../mtext-renderer/packages/mtext-renderer'
  # Keep other overrides unchanged, or comment out entries you are not debugging
```

> 디렉터리 구조가 다르면 상대 경로를 조정하십시오.  
> override를 루트 `package.json`에 넣지 **마십시오**. override는 `pnpm-workspace.yaml`에 속합니다.

### 2. 의존성 설치

**`cad-viewer`의 루트**에서:

```
pnpm install
```

pnpm은 다음을 수행합니다:

- override된 패키지를 로컬 디렉터리에서 해석합니다
- `node_modules` 내부에 심볼릭 링크를 생성합니다
- 파일 기반 의존성으로 추적합니다

### 3. 의존성 빌드(필요한 경우)

업스트림 패키지에 빌드 단계(TypeScript, 번들링 등)가 필요하면:

```
cd ../realdwg-web
pnpm install
pnpm build
```

활발한 개발을 위해 다음을 실행할 수도 있습니다:

```
pnpm dev
```

또는 지원되는 경우 watch 모드를 사용합니다. 해당 저장소의 패키지를 디버깅할 때는 `mtext-renderer`에서도 동일한 단계를 반복합니다.

### 4. 평소처럼 디버깅

이제 다음을 할 수 있습니다:

- 업스트림 저장소 내부의 코드 수정(예: `realdwg-web/packages/data-model`)
- 다시 빌드(또는 watch 모드가 다시 빌드하도록 둠)
- `cad-viewer`에서 변경 사항을 즉시 테스트

링크도, 게시도, 재설치도 필요하지 않습니다.

## 게시된 패키지로 되돌리기

디버깅이 끝난 후:

1. `cad-viewer/pnpm-workspace.yaml`의 semver override를 복원합니다(모든 `file:` 경로 제거).
2. 의존성 버전을 워크스페이스 패키지로 동기화합니다:

```
pnpm sync:versions
```

3. 의존성을 재설치합니다:

```
pnpm install
```

4. `pnpm sync:versions`가 생성한 모든 `package.json` 변경을 복원된 `pnpm-workspace.yaml`과 함께 커밋합니다.

이를 통해 다음이 보장됩니다:

- CI 일관성
- 깨끗한 의존성 그래프
- 실수로 커밋된 로컬 경로 없음

## 릴리스 또는 PR 전 버전 동기화

PR을 열거나 릴리스를 실행하기 전에 의존성 버전이 정렬되어 있는지 확인합니다:

```
pnpm sync:versions
```

이는 `pnpm-workspace.yaml`에서 `overrides`를 읽고 모든 `packages/*/package.json`의 일치하는 항목을 갱신합니다.

파일을 쓰지 않고 확인하려면:

```
pnpm sync:versions:check
```

릴리스 스크립트(`pnpm release`)와 CI는 모두 이 검사를 자동으로 실행합니다. 버전이 동기화되지 않았다면 `pnpm sync:versions`로 수정하고, 커밋한 뒤 다시 시도합니다.

외부 의존성을 올릴 때의 일반적인 작업 흐름:

1. `pnpm-workspace.yaml`의 `overrides`에서 semver 업데이트
2. `pnpm sync:versions` 실행
3. `pnpm install` 실행
4. 테스트, 커밋, PR 열기

## ⚠️ 중요 사항

### 로컬 경로를 커밋하지 마십시오

로컬 `file:` override는 **개발자 전용**입니다.

커밋하기 전에:

- `pnpm-workspace.yaml`에 `file:` 경로가 **없는지** 확인합니다
- `pnpm sync:versions`를 실행하여 모든 `package.json`이 게시된 semver override와 일치하도록 합니다
- PR과 릴리스에는 게시된 버전을 사용합니다

### 이 방식을 사용해야 하는 경우

✅ 여러 저장소에 걸친 버그 수정  
✅ 통합 문제 디버깅  
✅ 게시 없이 빠른 반복  
❌ 장기 의존성 관리  
❌ CI / 프로덕션 빌드

## 비교: `pnpm link` vs pnpm overrides를 사용한 로컬 경로

| 측면           | pnpm link | pnpm overrides를 사용한 로컬 경로 |
| -------------- | --------- | ------------------------------- |
| 설정 복잡도     | 높음      | 낮음                             |
| 명시성         | 암시적    | 명시적                           |
| 되돌리기 용이성 | ❌         | ✅                               |
| CI 안전성      | ❌         | ❌ (개발 전용)                    |
| 팀 친화성      | ❌         | ✅                               |

## 요약

**`cad-viewer`**와 **`realdwg-web`** 또는 **`mtext-renderer`** 같은 업스트림 저장소에 걸친 문제를 디버깅할 때는 **`pnpm-workspace.yaml`의 `file:` override**를 일시적으로 사용합니다.

이는:

- 단순하고
- 투명하며
- 가르치기 쉽고
- 되돌리기 쉬우며
- 모노레포의 모든 패키지에 적용됩니다

디버깅이 끝났거나 릴리스 전에는 semver override를 복원하고 **`pnpm sync:versions`**를 실행한 뒤 동기화된 `package.json` 파일을 커밋합니다.

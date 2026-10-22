---
title: "현지화"
---

# 현지화

이 페이지는 **`@mlightcad/cad-simple-viewer`**에 의존하는 새 npm 패키지를 만들 때 **문자열을 현지화하는 방법**과 **사용자 정의 명령에 현지화된 문자열을 추가하는 방법**을 설명합니다.

목표는 다음과 같습니다:

-   `@mlightcad/cad-simple-viewer`를 **프레임워크 독립적**으로 유지합니다(Vue / React / i18n 런타임 의존성 없음)
-   **호스트 애플리케이션**(Vue + `vue-i18n` 또는 기타)이 **동일한 메시지를 병합하고 재사용**할 수 있게 합니다
-   **명령, 프롬프트, 설명**이 일관되게 현지화되도록 합니다

## 설계 철학

`@mlightcad/cad-simple-viewer`는 `AcApI18n`을 통해 **최소한의 i18n 레지스트리**를 제공합니다:

-   UI 프레임워크 의존성 없음
-   `vue-i18n`과 호환되는 메시지 형식
-   여러 패키지로부터의 **심층 병합** 지원
-   코어/편집기 로직을 위한 간단한 `t(key)` 헬퍼 제공

`AcApI18n`은 완전한 번역 프레임워크가 아니라 **공유 메시지 레지스트리**로 이해하면 됩니다.

## 로캘 메시지 구조

메시지는 단순한 중첩 객체입니다:

```
export interface AcApLocaleMessage {
  [key: string]: string | AcApLocaleMessage
}
```

키는 **점 경로로 주소 지정 가능**합니다:

```
AcApI18n.t('command.ACAD.line')
```

### 권장 키 명명 규칙

| 카테고리    | 접두사    | 예시                          |
| ----------- | --------- | ----------------------------- |
| 명령        | `command` | `command.ACAD.line`           |
| Jig 프롬프트 | `jig`     | `jig.ellipse.center`          |
| 대화상자    | `dialog`  | `dialog.confirm.ok`           |
| 엔티티      | `entity`  | `entity.property.color`       |
| 앱 UI       | `main`    | `main.toolPalette.draw.title` |

## 새 패키지에서 현지화된 문자열 만들기

### 로캘별 메시지 정의

패키지 내부에 로캘 파일을 만듭니다:

```
my-plugin/
 └─ i18n/
    ├─ en.ts
    └─ zh.ts
```

**`en.ts`**

```
export default {
  command: {
    ACAD: {
      mycmd: {
        description: 'Create something'
      }
    }
  },
  jig: {
    mycmd: {
      start: 'Specify start point:',
      end: 'Specify end point:'
    }
  }
}
```

**`zh.ts`**

```
export default {
  command: {
    ACAD: {
      mycmd: {
        description: '创建对象'
      }
    }
  },
  jig: {
    mycmd: {
      start: '指定起点：',
      end: '指定终点：'
    }
  }
}
```

위의 키 이름 `ACAD`는 명령 그룹 이름입니다. 

### `AcApI18n`으로 메시지 등록

메시지는 **한 번만** 등록하며, 보통 앱 또는 플러그인 초기화 중에 수행합니다:

```
import { AcApI18n } from '@mlightcad/cad-simple-viewer'
import en from './i18n/en'
import zh from './i18n/zh'

AcApI18n.mergeLocaleMessage('en', en)
AcApI18n.mergeLocaleMessage('zh', zh)
```

다음 경우 모두에서 동작합니다:

-   Vue + `vue-i18n`을 사용하는 경우
-   다른 프레임워크를 사용하는 경우
-   `AcApI18n.t()`에만 의존하는 경우

## Vue + vue-i18n과 함께 사용하기(호스트 애플리케이션)

Vue 애플리케이션에서 `AcApI18n`은 메시지의 **단일 정보 출처** 역할을 합니다.

```
import { createI18n } from 'vue-i18n'
import { AcApI18n } from '@mlightcad/cad-simple-viewer'

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: AcApI18n.messages,
  globalInjection: true
})
```

### 로캘 동기화(권장)

```
AcApI18n.setCurrentLocale(i18n.global.locale.value)

AcApI18n.events.localeChanged.addListener(e => {
  i18n.global.locale.value = e.new
})
```

이를 통해 다음이 보장됩니다:

-   코어 편집기 로직은 `AcApI18n.t()`를 사용합니다
-   UI 컴포넌트는 `vue-i18n`을 사용합니다
-   둘 다 항상 동일한 언어를 표시합니다


## 요약

-   `AcApI18n`은 경량의 프레임워크 독립적 i18n 레지스트리입니다

-   플러그인과 앱 메시지는 `mergeLocaleMessage`를 통해 병합됩니다

-   Vue 앱은 `vue-i18n`을 통해 동일한 메시지를 재사용합니다

이 접근 방식은 **라이브러리를 깔끔하게**, **앱을 유연하게**, **현지화를 일관되게** 유지합니다.

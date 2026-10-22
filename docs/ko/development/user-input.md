---
title: "사용자 입력"
---

# 사용자 입력

이 페이지는 AcEditor가 사용자 입력을 수집하는 방법(사용 가능한 입력 메서드, 공통 프롬프트 옵션 패턴(메시지, 키워드, jig, 러버 밴드 동작), 키워드 매칭 규칙, 프롬프트 결과 해석 방법 포함)을 설명합니다. 또한 의도된 사용법도 명확히 합니다: 입력은 캔버스에 수동으로 마우스/키보드 리스너를 붙이는 대신 AcEditor API를 통해 획득해야 합니다.

**목적**

AcEditor는 AutoCAD 편집기 입력 API의 구조와 의도를 반영합니다. 동적 프롬프트, 키워드 및 미리보기 jig를 조정하면서 사용자 입력을 획득하는 일관된 고수준 방법을 제공합니다. 입력 처리는 의도적으로 중앙 집중화되어 있습니다: 키워드 파싱과 마우스 상호 작용은 추상화되어 있으며 AcEditor 메서드를 통해 접근해야 합니다. 기술적으로 `AcEdBaseView.canvas`에서 키보드나 마우스 이벤트를 직접 수신할 수는 있지만, 이는 잘못된 사용법으로 간주되며 편집기의 입력 수명 주기, 키워드 처리 및 프롬프트 결과 규칙을 우회하게 됩니다.

**입력 메서드**

| 메서드 | 옵션 유형 | 결과 유형 | 일반적인 용도 |
| --- | --- | --- | --- |
| `getPoint` | `AcEdPromptPointOptions` | `AcEdPromptPointResult` | 점 획득 |
| `getDistance` | `AcEdPromptDistanceOptions` | `AcEdPromptDoubleResult` | 기준점이 선택적인 거리 입력 |
| `getAngle` | `AcEdPromptAngleOptions` | `AcEdPromptDoubleResult` | 기준점이 선택적인 각도 입력 |
| `getDouble` | `AcEdPromptDoubleOptions` | `AcEdPromptDoubleResult` | 숫자 입력(부동 소수점) |
| `getString` | `AcEdPromptStringOptions` | `AcEdPromptResult` | 자유 텍스트 입력 |
| `getKeywords` | `AcEdPromptKeywordOptions` | `string` | 키워드 전용 입력(전역 키워드 반환) |
| `getEntity` | `AcEdPromptEntityOptions` | `AcEdPromptEntityResult` | 엔티티 하나 선택 |
| `getSelection` | `AcEdPromptSelectionOptions` | `AcEdPromptSelectionResult` | 여러 엔티티 선택 |
| `getBox` | `AcEdPromptBoxOptions` | `AcEdPromptBoxResult` | 두 모서리를 선택하여 상자 정의 |

**공통 프롬프트 옵션**

모든 프롬프트 옵션 유형은 `AcEdPromptOptions<T>`에서 파생되며 다음과 같은 기능을 공유합니다:

- `message`: 사용자에게 표시되는 프롬프트 텍스트입니다.
- `keywords`: 유효한 키워드를 보유하는 `AcEdKeywordCollection`입니다.
- `appendKeywordsToMessage`: true이면 키워드가 표시를 위해 메시지에 추가됩니다.
- `jig`: 입력 중 라이브 미리보기를 활성화하려면 `AcEdPreviewJig<T>`를 연결합니다.
- `setMessageAndKeywords(messageAndKeywords, globalKeywords)`: `"Pick point [Yes/No]"`와 같은 결합된 메시지를 파싱하고 공백으로 구분된 목록에서 전역 키워드를 할당합니다.

**러버 밴드 및 기준점 설정**

여러 프롬프트 옵션은 러버 밴드 선 또는 기준점 동작을 지원합니다:

- `AcEdPromptPointOptions`: `basePoint`, `useBasePoint`, `useDashedLine`, `allowNone`.
- `AcEdPromptDistanceOptions`: `basePoint`, `useBasePoint`, `useDashedLine`, `only2d`.
- `AcEdPromptAngleOptions`: `basePoint`, `useBasePoint`, `useDashedLine`, `useAngleBase`.
- `AcEdPromptBoxOptions`: `useBasePoint`, `useDashedLine` 및 별도의 `firstCornerMessage` / `secondCornerMessage`.

`useBasePoint`가 true이면 편집기는 기준점에서 커서까지 러버 밴드 선을 그립니다. `useDashedLine`은 해당 선을 점선으로 표시할지 여부를 제어합니다.

**키워드 규칙 및 형식**

키워드는 `AcEdKeywordCollection`을 통해 정의되며 대소문자를 구분하지 않고 매칭됩니다. 확인된 값은 항상 키워드의 **전역 이름**입니다.

- 각 키워드에는 `displayName`(UI), `globalName`(내부), `localName`(사용자 입력)이 있습니다.
- 사용자는 `localName`, `globalName`, 표시 텍스트 또는 파생된 별칭을 입력할 수 있으며, 모두 대소문자를 구분하지 않고 매칭됩니다.
- 별칭은 전역 이름의 대문자에서 파생됩니다. 예: `Yes → Y`, `sAve → A`, `eXit → X`.
- 입력 앞에 `_`를 붙이면 전역 키워드 매칭을 강제합니다.

키워드는 두 가지 일반적인 방법으로 정의할 수 있습니다:

- API 사용: `options.keywords.add(displayName, globalName, localName)`.
- ObjectARX 스타일 문자열 목록(`AcEdKeywordCollection` 생성자용): 로컬 및 전역 섹션은 `_`로 구분되고, 쉼표로 된 축약은 선택 사항이며, 대문자가 별칭을 정의합니다.

예제:

```ts
const opts = new AcEdPromptPointOptions('Pick point')
opts.keywords.add('Yes', 'Yes', 'Y')
opts.keywords.add('No', 'No', 'N')
```

```ts
const keywords = new AcEdKeywordCollection('Ja Nein _ Yes No')
```

**프롬프트 결과**

대부분의 입력 메서드는 다음을 포함하는 `PromptResult` 스타일 객체를 반환합니다:

- `status`: `OK`, `Cancel` 또는 `Keyword`와 같은 `AcEdPromptStatus` 코드입니다.
- `stringResult`: `status === Keyword`일 때 매칭된 **전역 키워드**를 보유합니다.

유형별 결과 클래스는 `status === OK`일 때 유형이 지정된 `value`를 제공합니다:

| 결과 유형 | 값 필드 | 참고 |
| --- | --- | --- |
| `AcEdPromptPointResult` | `value: AcGePoint3dLike` | OK일 때 점 |
| `AcEdPromptDoubleResult` | `value: number` | OK일 때 double |
| `AcEdPromptEntityResult` | `objectId: AcDbObjectId` | 선택된 엔티티 ID |
| `AcEdPromptSelectionResult` | `value: AcEdSelectionSet` | 선택 세트 |
| `AcEdPromptBoxResult` | `value: AcGeBox2d` | 경계 상자 |

참고: `getKeywords`는 `PromptResult` 객체 대신 키워드 문자열을 직접 반환합니다.

**예제: 키워드가 있는 점 입력**

```ts
const opts = new AcEdPromptPointOptions('Pick point or [Yes/No]:')
opts.keywords.add('Yes', 'Yes', 'Y')
opts.keywords.add('No', 'No', 'N')

const result = await editor.getPoint(opts)
if (result.status === AcEdPromptStatus.Keyword) {
  console.log('Keyword:', result.stringResult)
} else if (result.status === AcEdPromptStatus.OK) {
  console.log('Point:', result.value)
}
```

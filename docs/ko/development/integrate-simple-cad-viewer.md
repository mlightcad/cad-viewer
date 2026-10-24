---
title: "Simple Viewer 통합"
---

# Simple Viewer 통합

**cad-simple-viewer**는 문서 관리, 명령 처리 및 UI와 렌더링 엔진 간의 협업 등 CAD 뷰어의 **고성능** 핵심 컴포넌트를 제공합니다. 대용량 CAD 파일을 처리할 때 최적의 성능을 발휘하도록 설계되었습니다.

이 모듈은 UI 프레임워크에 의존하지 않으며 캔버스 외에는 UI를 제공하지 않습니다. 고성능 CAD 뷰어를 자체 UI와 함께 웹 애플리케이션에 통합하려면 이 모듈이 올바른 선택입니다.

## 주요 기능
- 대용량 파일에 최적화된 문서 관리
- 효율적인 명령 스택 및 실행 취소/재실행 작업
- 렌더링 엔진과의 최적화된 통합
- 성능 중심의 설정 및 컨텍스트 관리
- 최대한의 유연성을 위한 프레임워크 독립적 설계

## cad-simple-viewer를 선택해야 하는 경우

UI 프레임워크 의존성 없이 **핵심 CAD 로직만**(문서 관리, 명령 스택, 렌더링 엔진 통합) 필요한 경우 `cad-simple-viewer`를 사용하십시오. 이 패키지는 다음과 같은 경우에 이상적입니다:

- **자신만의 사용자 정의 UI**를 구축하거나 CAD 기능을 Vue가 아닌 또는 웹이 아닌 환경에 통합하고자 하는 경우.
- 대용량 CAD 파일을 처리하기 위한 최대한의 유연성과 성능이 필요하며, 로직을 자신의 렌더링 또는 UI 계층에 연결할 계획인 경우.
- 필수 CAD 작업 및 캔버스 렌더링만 제공하는 프레임워크 독립적인 솔루션을 원하는 경우.

**권장 대상:** 사용자 정의 통합, 헤드리스 CAD 처리 또는 고도로 맞춤화된 CAD 솔루션을 구축하는 고급 사용자.

## 설치

```bash
npm install @mlightcad/cad-simple-viewer
```

## 사용법

기본 사용법 및 고급 사용법은 [cad-simple-viewer-example](https://github.com/mlightcad/cad-simple-viewer-example)을 참조하십시오.

`cad-simple-viewer`는 도면을 DWG/DXF 파일로 저장하는 기능을 지원하지 않지만, **도면을 실시간으로 수정**하는 데 대한 포괄적인 지원을 제공합니다. 도면 내에서 엔티티를 추가, 편집 및 삭제할 수 있으며, 뷰어는 이러한 변경 사항을 반영하여 자동으로 업데이트됩니다.

엔티티를 수정할 때는 기본 도면 데이터베이스와 직접 작업하게 됩니다. 뷰어는 이러한 변경 사항을 자동으로 감지하고 그에 따라 표시를 업데이트합니다. 이러한 실시간 동기화는 다음을 보장합니다:

- 모든 수정 사항이 즉시 표시됩니다
- 명령 스택이 실행 취소/재실행 작업을 위해 변경 사항을 적절하게 추적합니다. 이 기능은 곧 구현될 예정입니다.

이 기능 덕분에 `cad-simple-viewer`는 CAD 파일을 표시할 뿐만 아니라 사용자가 도면 내용과 상호 작용하고 이를 수정할 수 있어야 하는 애플리케이션에 적합합니다.

**중요 참고 사항**: `cad-simple-viewer`의 사용 패턴은 **AutoCAD RealDWG와 매우 유사합니다**. AutoCAD RealDWG 개발에 익숙하다면 API 구조와 워크플로가 거의 동일하다는 것을 알게 될 것입니다. 주요 차이점은 네이티브 RealDWG 라이브러리 대신 [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/)를 사용한다는 것입니다.

[cad-simple-viewer-example](https://github.com/mlightcad/cad-simple-viewer-example)에서는 [**realdwg-web API**](https://mlightcad.github.io/realdwg-web/)를 사용하여 도면을 생성하는 방법을 보여줍니다.

## 사용 가능한 내보내기

### 핵심 클래스

- `AcApContext` - 메인 애플리케이션 컨텍스트
- `AcApDocManager` - 문서 관리
- `AcApDocument` - 개별 문서 처리
- `AcApSettingManager` - 설정 관리

### 명령

- `AcApOpenCmd` - 파일 열기 명령
- `AcApZoomCmd` - 확대 명령
- `AcApPanCmd` - 이동 명령
- `AcApSelectCmd` - 선택 명령
- `AcApConvertToSvgCmd` - SVG 변환 명령

### 편집기 컴포넌트

- `AcEditor` - 메인 편집기 클래스
- `AcEdCommandStack` - 명령 스택 관리
- `AcEdSelectionSet` - 선택 처리
- `AcEdInputPoint` - 입력점 관리

### 뷰 컴포넌트

- `AcTrScene` - 장면 관리
- `AcTrLayoutView` - 레이아웃 뷰 처리
- `AcTrView2d` - 2D 뷰 관리

## MLightCAD에서의 역할

이 패키지는 핵심 로직 계층으로서, 프런트엔드 UI를 렌더링 엔진과 연결하고 모든 문서 관련 작업을 관리합니다.

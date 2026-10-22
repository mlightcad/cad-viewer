import { defineConfig } from 'vitepress'

const base = process.env.DOCS_BASE || '/cad-viewer/docs/'

function guideSidebar(prefix: string, labels: Record<string, string>) {
  return [
    {
      text: labels.ui,
      collapsed: false,
      items: [
        { text: labels.uiReadOnly, link: `${prefix}/guide/ui/read-only` },
        { text: labels.uiReview, link: `${prefix}/guide/ui/review` },
        { text: labels.uiWrite, link: `${prefix}/guide/ui/write` }
      ]
    },
    {
      text: labels.gesturesGroup,
      collapsed: false,
      items: [
        { text: labels.gestures, link: `${prefix}/guide/operations` },
        { text: labels.simmouse, link: `${prefix}/guide/simulated-mouse` },
        { text: labels.magnifier, link: `${prefix}/guide/magnifier` },
        { text: labels.sessionPanel, link: `${prefix}/guide/session-panel` },
        {
          text: labels.sessionAccessory,
          link: `${prefix}/guide/session-accessory`
        },
        { text: labels.aids, link: `${prefix}/guide/aids` }
      ]
    },
    {
      text: labels.markupGroup,
      collapsed: false,
      items: [
        { text: labels.mkOverview, link: `${prefix}/guide/markup/overview` },
        { text: labels.mkArrow, link: `${prefix}/guide/markup/arrow` },
        { text: labels.mkText, link: `${prefix}/guide/markup/text` },
        { text: labels.mkCloud, link: `${prefix}/guide/markup/cloud` },
        { text: labels.mkRect, link: `${prefix}/guide/markup/rectangle` },
        { text: labels.mkCircle, link: `${prefix}/guide/markup/circle` },
        { text: labels.mkCallout, link: `${prefix}/guide/markup/callout` },
        { text: labels.mkResults, link: `${prefix}/guide/markup/results` }
      ]
    },
    {
      text: labels.measureGroup,
      collapsed: false,
      items: [
        { text: labels.msOverview, link: `${prefix}/guide/measure/overview` },
        { text: labels.msDistance, link: `${prefix}/guide/measure/distance` },
        {
          text: labels.msContinuous,
          link: `${prefix}/guide/measure/distance-continuous`
        },
        { text: labels.msArea, link: `${prefix}/guide/measure/area` },
        { text: labels.msCoords, link: `${prefix}/guide/measure/coordinates` },
        { text: labels.msArc, link: `${prefix}/guide/measure/arc-length` },
        { text: labels.msAngle, link: `${prefix}/guide/measure/angle` },
        { text: labels.msResults, link: `${prefix}/guide/measure/results` }
      ]
    },
    {
      text: labels.scriptGroup,
      collapsed: false,
      items: [
        { text: labels.scOverview, link: `${prefix}/guide/script/overview` },
        { text: labels.scApi, link: `${prefix}/guide/script/api` },
        { text: labels.scExamples, link: `${prefix}/guide/script/examples` },
        {
          text: labels.scWriteWithAi,
          link: `${prefix}/guide/script/write-with-ai`
        }
      ]
    }
  ]
}

function developmentSidebar(prefix: string, labels: Record<string, string>) {
  return [
    {
      text: labels.groupGettingStarted,
      collapsed: false,
      items: [
        { text: labels.overview, link: `${prefix}/development/` },
        {
          text: labels.architecture,
          link: `${prefix}/development/architecture-overview`
        },
        {
          text: labels.basics,
          link: `${prefix}/development/cad-viewer-basics`
        },
        {
          text: labels.integrateSimple,
          link: `${prefix}/development/integrate-simple-cad-viewer`
        },
        {
          text: labels.integrateComponent,
          link: `${prefix}/development/integrate-cad-viewer-component`
        }
      ]
    },
    {
      text: labels.groupConfiguration,
      collapsed: false,
      items: [
        {
          text: labels.workerUrls,
          link: `${prefix}/development/configure-worker-urls`
        },
        {
          text: labels.proprietaryConverter,
          link: `${prefix}/development/install-and-use-proprietary-dwg-converter`
        },
        {
          text: labels.selfHostedFonts,
          link: `${prefix}/development/self-hosted-fonts-and-templates`
        }
      ]
    },
    {
      text: labels.groupCoreConcepts,
      collapsed: false,
      items: [
        { text: labels.jig, link: `${prefix}/development/jig-system` },
        { text: labels.userInput, link: `${prefix}/development/user-input` },
        { text: labels.command, link: `${prefix}/development/command` },
        {
          text: labels.entityModification,
          link: `${prefix}/development/entity-modification-best-practices`
        },
        {
          text: labels.colorSystem,
          link: `${prefix}/development/color-system`
        },
        {
          text: labels.systemVariables,
          link: `${prefix}/development/system-variables`
        },
        { text: labels.objectSnap, link: `${prefix}/development/object-snap` },
        {
          text: labels.annotationCommands,
          link: `${prefix}/development/annotation-commands`
        }
      ]
    },
    {
      text: labels.groupExtending,
      collapsed: false,
      items: [
        {
          text: labels.localization,
          link: `${prefix}/development/localization`
        },
        {
          text: labels.pluginSystem,
          link: `${prefix}/development/plugin-system`
        },
        {
          text: labels.dataSourcePlugin,
          link: `${prefix}/development/data-source-plugin`
        }
      ]
    },
    {
      text: labels.groupDeployment,
      collapsed: false,
      items: [
        {
          text: labels.debugging,
          link: `${prefix}/development/debugging-with-multiple-repo-changes`
        },
        {
          text: labels.tianzheng,
          link: `${prefix}/development/supporting-tianzheng-dwg-drawings`
        },
        {
          text: labels.cloudViewer,
          link: `${prefix}/development/cloud-dwg-web-viewer`
        },
        { text: labels.upgrade, link: `${prefix}/development/upgrade-guide` }
      ]
    }
  ]
}

const searchTranslations = {
  root: {
    button: { buttonText: 'Search', buttonAriaLabel: 'Search' },
    modal: {
      displayDetails: 'Display detailed list',
      resetButtonTitle: 'Reset search',
      backButtonTitle: 'Close search',
      noResultsText: 'No results for',
      footer: {
        selectText: 'to select',
        selectKeyAriaLabel: 'Enter',
        navigateText: 'to navigate',
        navigateUpKeyAriaLabel: 'up arrow',
        navigateDownKeyAriaLabel: 'down arrow',
        closeText: 'to close',
        closeKeyAriaLabel: 'Escape'
      }
    }
  },
  zh: {
    button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
    modal: {
      displayDetails: '显示详细列表',
      resetButtonTitle: '重置搜索',
      backButtonTitle: '关闭搜索',
      noResultsText: '未找到结果：',
      footer: {
        selectText: '选择',
        selectKeyAriaLabel: '回车',
        navigateText: '切换',
        navigateUpKeyAriaLabel: '上箭头',
        navigateDownKeyAriaLabel: '下箭头',
        closeText: '关闭',
        closeKeyAriaLabel: 'Esc'
      }
    }
  },
  ja: {
    button: { buttonText: '検索', buttonAriaLabel: '検索' },
    modal: {
      displayDetails: '詳細リストを表示',
      resetButtonTitle: '検索をリセット',
      backButtonTitle: '検索を閉じる',
      noResultsText: '結果なし：',
      footer: {
        selectText: '選択',
        selectKeyAriaLabel: 'Enter',
        navigateText: '移動',
        navigateUpKeyAriaLabel: '上矢印',
        navigateDownKeyAriaLabel: '下矢印',
        closeText: '閉じる',
        closeKeyAriaLabel: 'Esc'
      }
    }
  },
  ko: {
    button: { buttonText: '검색', buttonAriaLabel: '검색' },
    modal: {
      displayDetails: '상세 목록 표시',
      resetButtonTitle: '검색 초기화',
      backButtonTitle: '검색 닫기',
      noResultsText: '결과 없음:',
      footer: {
        selectText: '선택',
        selectKeyAriaLabel: 'Enter',
        navigateText: '이동',
        navigateUpKeyAriaLabel: '위쪽 화살표',
        navigateDownKeyAriaLabel: '아래쪽 화살표',
        closeText: '닫기',
        closeKeyAriaLabel: 'Esc'
      }
    }
  },
  ar: {
    button: { buttonText: 'بحث', buttonAriaLabel: 'بحث' },
    modal: {
      displayDetails: 'عرض القائمة التفصيلية',
      resetButtonTitle: 'إعادة تعيين البحث',
      backButtonTitle: 'إغلاق البحث',
      noResultsText: 'لا توجد نتائج لـ',
      footer: {
        selectText: 'للاختيار',
        selectKeyAriaLabel: 'Enter',
        navigateText: 'للتنقل',
        navigateUpKeyAriaLabel: 'السهم الأعلى',
        navigateDownKeyAriaLabel: 'السهم الأسفل',
        closeText: 'للإغلاق',
        closeKeyAriaLabel: 'Esc'
      }
    }
  },
  cs: {
    button: { buttonText: 'Hledat', buttonAriaLabel: 'Hledat' },
    modal: {
      displayDetails: 'Zobrazit podrobný seznam',
      resetButtonTitle: 'Resetovat hledání',
      backButtonTitle: 'Zavřít hledání',
      noResultsText: 'Žádné výsledky pro',
      footer: {
        selectText: 'vybrat',
        selectKeyAriaLabel: 'Enter',
        navigateText: 'přejít',
        navigateUpKeyAriaLabel: 'šipka nahoru',
        navigateDownKeyAriaLabel: 'šipka dolů',
        closeText: 'zavřít',
        closeKeyAriaLabel: 'Esc'
      }
    }
  },
  tr: {
    button: { buttonText: 'Ara', buttonAriaLabel: 'Ara' },
    modal: {
      displayDetails: 'Ayrıntılı listeyi göster',
      resetButtonTitle: 'Aramayı sıfırla',
      backButtonTitle: 'Aramayı kapat',
      noResultsText: 'Sonuç yok:',
      footer: {
        selectText: 'seçmek için',
        selectKeyAriaLabel: 'Enter',
        navigateText: 'gezinmek için',
        navigateUpKeyAriaLabel: 'yukarı ok',
        navigateDownKeyAriaLabel: 'aşağı ok',
        closeText: 'kapatmak için',
        closeKeyAriaLabel: 'Esc'
      }
    }
  }
}

export default defineConfig({
  title: 'MLightCAD Viewer',
  description: 'Web-based CAD Viewer',
  base,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }]
  ],
  ignoreDeadLinks: true,
  markdown: {
    theme: 'github-dark'
  },
  locales: {
    zh: {
      lang: 'zh-CN',
      label: '中文',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh/guide/ui/read-only' },
          { text: '开发', link: '/zh/development/' },
          { text: 'API', link: 'https://cad-viewer.readthedocs.io/en/latest/' },
          { text: 'GitHub', link: 'https://github.com/mlightcad/cad-viewer' }
        ],
        sidebar: {
          '/zh/guide/': guideSidebar('/zh', {
            ui: '用户界面',
            uiReadOnly: '只读模式',
            uiReview: '审阅模式',
            uiWrite: '读写模式',
            gesturesGroup: '操作和辅助显示',
            gestures: '操作方式',
            simmouse: '模拟鼠标（移动端）',
            magnifier: '放大镜（移动端）',
            aids: '辅助显示',
            sessionAccessory: '会话附件',
            sessionPanel: '命令会话面板（移动端）',
            markupGroup: '批注',
            mkOverview: '批注功能说明',
            mkArrow: '箭头',
            mkText: '文字',
            mkCloud: '云线',
            mkRect: '矩形',
            mkCircle: '圆',
            mkCallout: '标注（Callout）',
            mkResults: '看结果',
            measureGroup: '测量',
            msOverview: '测量功能说明',
            msDistance: '测长度',
            msContinuous: '连续测',
            msArea: '测面积',
            msCoords: '测坐标',
            msArc: '测弧长',
            msAngle: '测角度',
            msResults: '看结果',
            scriptGroup: '脚本',
            scOverview: '脚本功能说明',
            scApi: '脚本 API',
            scExamples: '脚本示例',
            scWriteWithAi: '用 AI 编写脚本'
          }),
          '/zh/development/': developmentSidebar('/zh', {
            groupGettingStarted: '快速上手',
            groupConfiguration: '配置',
            groupCoreConcepts: '核心概念',
            groupExtending: '扩展',
            groupDeployment: '部署与疑难排查',
            overview: '概览',
            architecture: '架构总览',
            basics: 'CAD Viewer 基础',
            integrateSimple: '集成 Simple CAD Viewer',
            integrateComponent: '集成 CAD Viewer 组件',
            workerUrls: '配置 Worker URL',
            proprietaryConverter: '安装和使用私有 DWG 转换器',
            selfHostedFonts: '自托管字体和模板',
            jig: 'Jig（动态预览）系统',
            userInput: '用户输入',
            command: '命令',
            entityModification: '实体修改最佳实践',
            colorSystem: '颜色系统',
            systemVariables: '系统变量',
            objectSnap: '对象捕捉（OSNAP）',
            annotationCommands: '标注命令',
            localization: '本地化',
            pluginSystem: '插件系统',
            dataSourcePlugin: '数据源插件',
            debugging: '多仓库联合调试',
            tianzheng: '支持天正 DWG 图纸',
            cloudViewer: '构建云端 DWG Web 查看器',
            upgrade: '升级 cad-simple-viewer 和 cad-viewer'
          })
        }
      }
    },
    root: {
      lang: 'en-US',
      label: 'English',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/ui/read-only' },
          { text: 'Development', link: '/development/' },
          { text: 'API', link: 'https://cad-viewer.readthedocs.io/en/latest/' },
          { text: 'GitHub', link: 'https://github.com/mlightcad/cad-viewer' }
        ],
        sidebar: {
          '/guide/': guideSidebar('', {
            ui: 'User Interface',
            uiReadOnly: 'Read-Only Mode',
            uiReview: 'Review Mode',
            uiWrite: 'Write Mode',
            gesturesGroup: 'Operations and Aids',
            gestures: 'Operations',
            simmouse: 'Simulated Mouse (Mobile)',
            magnifier: 'Magnifier (Mobile)',
            aids: 'Drawing Aids',
            sessionAccessory: 'Session Accessory',
            sessionPanel: 'Session Panel (Mobile)',
            markupGroup: 'Markup',
            mkOverview: 'Markup Overview',
            mkArrow: 'Arrow',
            mkText: 'Text',
            mkCloud: 'Revision Cloud',
            mkRect: 'Rectangle',
            mkCircle: 'Circle',
            mkCallout: 'Callout',
            mkResults: 'View Results',
            measureGroup: 'Measurement',
            msOverview: 'Measurement Overview',
            msDistance: 'Distance',
            msContinuous: 'Continuous Distance',
            msArea: 'Area',
            msCoords: 'Coordinates',
            msArc: 'Arc Length',
            msAngle: 'Angle',
            msResults: 'View Results',
            scriptGroup: 'Script',
            scOverview: 'Script Overview',
            scApi: 'Script API',
            scExamples: 'Script Examples',
            scWriteWithAi: 'Write Scripts with AI'
          }),
          '/development/': developmentSidebar('', {
            groupGettingStarted: 'Getting Started',
            groupConfiguration: 'Configuration',
            groupCoreConcepts: 'Core Concepts',
            groupExtending: 'Extending',
            groupDeployment: 'Deployment & Troubleshooting',
            overview: 'Overview',
            architecture: 'Architecture Overview',
            basics: 'CAD Viewer Basics',
            integrateSimple: 'Integrate Simple CAD Viewer',
            integrateComponent: 'Integrate CAD Viewer Component',
            workerUrls: 'Configure Worker URLs',
            proprietaryConverter: 'Install and Use Proprietary DWG Converter',
            selfHostedFonts: 'Self-Hosted Fonts and Templates',
            jig: 'Jig System',
            userInput: 'User Input',
            command: 'Command',
            entityModification: 'Entity Modification Best Practices',
            colorSystem: 'Color System',
            systemVariables: 'System Variables',
            objectSnap: 'Object Snap (OSNAP)',
            annotationCommands: 'Annotation Commands',
            localization: 'Localization',
            pluginSystem: 'Plugin System',
            dataSourcePlugin: 'Data Source Plugin',
            debugging: 'Debugging with Multiple Repo Changes',
            tianzheng: 'Supporting Tianzheng DWG Drawings',
            cloudViewer: 'Build a Cloud DWG Web Viewer',
            upgrade: 'Upgrading cad-simple-viewer and cad-viewer'
          })
        }
      }
    },
    ja: {
      lang: 'ja-JP',
      label: '日本語',
      themeConfig: {
        nav: [
          { text: 'ガイド', link: '/ja/guide/ui/read-only' },
          { text: '開発', link: '/ja/development/' },
          { text: 'API', link: 'https://cad-viewer.readthedocs.io/en/latest/' },
          { text: 'GitHub', link: 'https://github.com/mlightcad/cad-viewer' }
        ],
        sidebar: {
          '/ja/guide/': guideSidebar('/ja', {
            ui: 'ユーザーインターフェース',
            uiReadOnly: '閲覧専用モード',
            uiReview: 'レビューモード',
            uiWrite: '編集モード',
            gesturesGroup: '操作と補助表示',
            gestures: '操作方法',
            simmouse: 'シミュレートマウス（モバイル）',
            magnifier: '拡大鏡（モバイル）',
            aids: '作図補助',
            sessionAccessory: 'セッションアクセサリ',
            sessionPanel: 'セッションパネル（モバイル）',
            markupGroup: '注釈',
            mkOverview: '注釈機能の説明',
            mkArrow: '矢印',
            mkText: 'テキスト',
            mkCloud: '修正クラウド',
            mkRect: '長方形',
            mkCircle: '円',
            mkCallout: '引出注釈（Callout）',
            mkResults: '結果を見る',
            measureGroup: '計測',
            msOverview: '計測機能の説明',
            msDistance: '長さ計測',
            msContinuous: '連続計測',
            msArea: '面積計測',
            msCoords: '座標計測',
            msArc: '円弧長計測',
            msAngle: '角度計測',
            msResults: '結果を見る',
            scriptGroup: 'スクリプト',
            scOverview: 'スクリプト概要',
            scApi: 'スクリプト API',
            scExamples: 'スクリプト例',
            scWriteWithAi: 'AI でスクリプトを作成'
          }),
          '/ja/development/': developmentSidebar('/ja', {
            groupGettingStarted: 'はじめに',
            groupConfiguration: '設定',
            groupCoreConcepts: 'コア概念',
            groupExtending: '拡張',
            groupDeployment: 'デプロイとトラブルシューティング',
            overview: '概要',
            architecture: 'アーキテクチャ概要',
            basics: 'CAD Viewer の基礎',
            integrateSimple: 'Simple CAD Viewer の統合',
            integrateComponent: 'CAD Viewer コンポーネントの統合',
            workerUrls: 'Worker URL の設定',
            proprietaryConverter: '独自 DWG コンバーターのインストールと使用',
            selfHostedFonts: 'セルフホストフォントとテンプレート',
            jig: 'Jig システム',
            userInput: 'ユーザー入力',
            command: 'コマンド',
            entityModification: 'エンティティ変更のベストプラクティス',
            colorSystem: '色システム',
            systemVariables: 'システム変数',
            objectSnap: 'オブジェクトスナップ（OSNAP）',
            annotationCommands: '注釈コマンド',
            localization: 'ローカリゼーション',
            pluginSystem: 'プラグインシステム',
            dataSourcePlugin: 'データソースプラグイン',
            debugging: '複数リポジトリでのデバッグ',
            tianzheng: '天正 DWG 図面のサポート',
            cloudViewer: 'クラウド DWG Web ビューアの構築',
            upgrade: 'cad-simple-viewer と cad-viewer のアップグレード'
          })
        }
      }
    },
    ko: {
      lang: 'ko-KR',
      label: '한국어',
      themeConfig: {
        nav: [
          { text: '가이드', link: '/ko/guide/ui/read-only' },
          { text: '개발', link: '/ko/development/' },
          { text: 'API', link: 'https://cad-viewer.readthedocs.io/en/latest/' },
          { text: 'GitHub', link: 'https://github.com/mlightcad/cad-viewer' }
        ],
        sidebar: {
          '/ko/guide/': guideSidebar('/ko', {
            ui: '사용자 인터페이스',
            uiReadOnly: '읽기 전용 모드',
            uiReview: '검토 모드',
            uiWrite: '쓰기 모드',
            gesturesGroup: '조작 및 보조 표시',
            gestures: '조작 방법',
            simmouse: '시뮬레이션 마우스（모바일）',
            magnifier: '돋보기（모바일）',
            aids: '작업 보조',
            sessionAccessory: '세션 액세서리',
            sessionPanel: '세션 패널 (모바일)',
            markupGroup: '주석',
            mkOverview: '주석 기능 설명',
            mkArrow: '화살표',
            mkText: '텍스트',
            mkCloud: '수정 구름',
            mkRect: '사각형',
            mkCircle: '원',
            mkCallout: '풍선 주석 (Callout)',
            mkResults: '결과 보기',
            measureGroup: '측정',
            msOverview: '측정 기능 설명',
            msDistance: '길이 측정',
            msContinuous: '연속 측정',
            msArea: '면적 측정',
            msCoords: '좌표 측정',
            msArc: '호 길이 측정',
            msAngle: '각도 측정',
            msResults: '결과 보기',
            scriptGroup: '스크립트',
            scOverview: '스크립트 개요',
            scApi: '스크립트 API',
            scExamples: '스크립트 예제',
            scWriteWithAi: 'AI로 스크립트 작성'
          }),
          '/ko/development/': developmentSidebar('/ko', {
            groupGettingStarted: '시작하기',
            groupConfiguration: '구성',
            groupCoreConcepts: '핵심 개념',
            groupExtending: '확장',
            groupDeployment: '배포 및 문제 해결',
            overview: '개요',
            architecture: '아키텍처 개요',
            basics: 'CAD Viewer 기본',
            integrateSimple: 'Simple CAD Viewer 통합',
            integrateComponent: 'CAD Viewer 컴포넌트 통합',
            workerUrls: 'Worker URL 구성',
            proprietaryConverter: '독점 DWG 변환기 설치 및 사용',
            selfHostedFonts: '자체 호스팅 폰트 및 템플릿',
            jig: 'Jig 시스템',
            userInput: '사용자 입력',
            command: '명령',
            entityModification: '엔티티 수정 모범 사례',
            colorSystem: '색상 시스템',
            systemVariables: '시스템 변수',
            objectSnap: '객체 스냅(OSNAP)',
            annotationCommands: '주석 명령',
            localization: '현지화',
            pluginSystem: '플러그인 시스템',
            dataSourcePlugin: '데이터 소스 플러그인',
            debugging: '다중 저장소 디버깅',
            tianzheng: '톈정(Tianzheng) DWG 도면 지원',
            cloudViewer: '클라우드 DWG 웹 뷰어 구축',
            upgrade: 'cad-simple-viewer 및 cad-viewer 업그레이드'
          })
        }
      }
    },
    ar: {
      lang: 'ar-SA',
      label: 'العربية',
      dir: 'rtl',
      themeConfig: {
        nav: [
          { text: 'الدليل', link: '/ar/guide/ui/read-only' },
          { text: 'التطوير', link: '/ar/development/' },
          { text: 'API', link: 'https://cad-viewer.readthedocs.io/en/latest/' },
          { text: 'GitHub', link: 'https://github.com/mlightcad/cad-viewer' }
        ],
        sidebar: {
          '/ar/guide/': guideSidebar('/ar', {
            ui: 'واجهة المستخدم',
            uiReadOnly: 'وضع القراءة فقط',
            uiReview: 'وضع المراجعة',
            uiWrite: 'وضع القراءة والكتابة',
            gesturesGroup: 'العمليات والمساعدات',
            gestures: 'طرق التشغيل',
            simmouse: 'الماوس المحاكى (للأجهزة المحمولة)',
            magnifier: 'العدسة المكبرة (للأجهزة المحمولة)',
            aids: 'وسائل المساعدة',
            sessionAccessory: 'ملحق الجلسة',
            sessionPanel: 'لوحة الجلسة (للجوال)',
            markupGroup: 'التعليقات',
            mkOverview: 'نظرة عامة على التعليقات',
            mkArrow: 'سهم',
            mkText: 'نص',
            mkCloud: 'سحابة مراجعة',
            mkRect: 'مستطيل',
            mkCircle: 'دائرة',
            mkCallout: 'تعليق توضيحي (Callout)',
            mkResults: 'عرض النتائج',
            measureGroup: 'القياس',
            msOverview: 'نظرة عامة على القياس',
            msDistance: 'قياس الطول',
            msContinuous: 'قياس متتابع',
            msArea: 'قياس المساحة',
            msCoords: 'قياس الإحداثيات',
            msArc: 'قياس طول القوس',
            msAngle: 'قياس الزاوية',
            msResults: 'عرض النتائج',
            scriptGroup: 'البرنامج النصي',
            scOverview: 'نظرة عامة على البرنامج النصي',
            scApi: 'API البرنامج النصي',
            scExamples: 'أمثلة البرنامج النصي',
            scWriteWithAi: 'كتابة البرامج النصية باستخدام الذكاء الاصطناعي'
          }),
          '/ar/development/': developmentSidebar('/ar', {
            groupGettingStarted: 'البدء',
            groupConfiguration: 'التهيئة',
            groupCoreConcepts: 'المفاهيم الأساسية',
            groupExtending: 'التوسعة',
            groupDeployment: 'النشر واستكشاف الأخطاء',
            overview: 'نظرة عامة',
            architecture: 'نظرة عامة على البنية',
            basics: 'أساسيات CAD Viewer',
            integrateSimple: 'دمج Simple CAD Viewer',
            integrateComponent: 'دمج مكوّن CAD Viewer',
            workerUrls: 'تهيئة عناوين Worker',
            proprietaryConverter: 'تثبيت واستخدام محوّل DWG الخاص',
            selfHostedFonts: 'الخطوط والقوالب المستضافة ذاتيًا',
            jig: 'نظام Jig',
            userInput: 'إدخال المستخدم',
            command: 'الأمر',
            entityModification: 'أفضل ممارسات تعديل الكيانات',
            colorSystem: 'نظام الألوان',
            systemVariables: 'متغيرات النظام',
            objectSnap: 'التقاط الكائنات (OSNAP)',
            annotationCommands: 'أوامر التعليقات التوضيحية',
            localization: 'الترجمة المحلية',
            pluginSystem: 'نظام الإضافات',
            dataSourcePlugin: 'إضافة مصدر البيانات',
            debugging: 'تصحيح الأخطاء مع تغييرات متعددة للمستودعات',
            tianzheng: 'دعم رسومات Tianzheng DWG',
            cloudViewer: 'إنشاء عارض ويب سحابي لملفات DWG',
            upgrade: 'ترقية cad-simple-viewer و cad-viewer'
          })
        }
      }
    },
    cs: {
      lang: 'cs-CZ',
      label: 'Čeština',
      themeConfig: {
        nav: [
          { text: 'Průvodce', link: '/cs/guide/ui/read-only' },
          { text: 'Vývoj', link: '/cs/development/' },
          { text: 'API', link: 'https://cad-viewer.readthedocs.io/en/latest/' },
          { text: 'GitHub', link: 'https://github.com/mlightcad/cad-viewer' }
        ],
        sidebar: {
          '/cs/guide/': guideSidebar('/cs', {
            ui: 'Uživatelské rozhraní',
            uiReadOnly: 'Režim pouze pro čtení',
            uiReview: 'Režim kontroly',
            uiWrite: 'Režim čtení a zápisu',
            gesturesGroup: 'Ovládání a pomůcky',
            gestures: 'Způsoby ovládání',
            simmouse: 'Simulovaná myš (Mobilní)',
            magnifier: 'Lupa (Mobilní)',
            aids: 'Kreslicí pomůcky',
            sessionAccessory: 'Příslušenství relace',
            sessionPanel: 'Panel relace (mobilní)',
            markupGroup: 'Komentáře',
            mkOverview: 'Přehled komentářů',
            mkArrow: 'Šipka',
            mkText: 'Text',
            mkCloud: 'Revizní oblak',
            mkRect: 'Obdélník',
            mkCircle: 'Kružnice',
            mkCallout: 'Bublina (Callout)',
            mkResults: 'Zobrazení výsledků',
            measureGroup: 'Měření',
            msOverview: 'Přehled měření',
            msDistance: 'Měření vzdálenosti',
            msContinuous: 'Postupné měření',
            msArea: 'Měření plochy',
            msCoords: 'Měření souřadnic',
            msArc: 'Měření délky oblouku',
            msAngle: 'Měření úhlu',
            msResults: 'Zobrazení výsledků',
            scriptGroup: 'Skript',
            scOverview: 'Přehled skriptů',
            scApi: 'API skriptů',
            scExamples: 'Příklady skriptů',
            scWriteWithAi: 'Psaní skriptů pomocí AI'
          }),
          '/cs/development/': developmentSidebar('/cs', {
            groupGettingStarted: 'Začínáme',
            groupConfiguration: 'Konfigurace',
            groupCoreConcepts: 'Základní koncepty',
            groupExtending: 'Rozšíření',
            groupDeployment: 'Nasazení a řešení potíží',
            overview: 'Přehled',
            architecture: 'Přehled architektury',
            basics: 'Základy CAD Viewer',
            integrateSimple: 'Integrace Simple CAD Viewer',
            integrateComponent: 'Integrace komponenty CAD Viewer',
            workerUrls: 'Konfigurace adres URL Worker',
            proprietaryConverter:
              'Instalace a použití proprietárního převodníku DWG',
            selfHostedFonts: 'Vlastní hostování fontů a šablon',
            jig: 'Systém Jig',
            userInput: 'Uživatelský vstup',
            command: 'Příkaz',
            entityModification: 'Osvědčené postupy pro úpravy entit',
            colorSystem: 'Barevný systém',
            systemVariables: 'Systémové proměnné',
            objectSnap: 'Objektové snapping (OSNAP)',
            annotationCommands: 'Anotační příkazy',
            localization: 'Lokalizace',
            pluginSystem: 'Systém pluginů',
            dataSourcePlugin: 'Plugin datového zdroje',
            debugging: 'Ladění se změnami ve více repozitářích',
            tianzheng: 'Podpora výkresů Tianzheng DWG',
            cloudViewer: 'Vytvoření cloudového webového prohlížeče DWG',
            upgrade: 'Upgrade cad-simple-viewer a cad-viewer'
          })
        }
      }
    },
    tr: {
      lang: 'tr-TR',
      label: 'Türkçe',
      themeConfig: {
        nav: [
          { text: 'Rehber', link: '/tr/guide/ui/read-only' },
          { text: 'Geliştirme', link: '/tr/development/' },
          { text: 'API', link: 'https://cad-viewer.readthedocs.io/en/latest/' },
          { text: 'GitHub', link: 'https://github.com/mlightcad/cad-viewer' }
        ],
        sidebar: {
          '/tr/guide/': guideSidebar('/tr', {
            ui: 'Kullanıcı Arayüzü',
            uiReadOnly: 'Salt Okunur Mod',
            uiReview: 'İnceleme Modu',
            uiWrite: 'Okuma-Yazma Modu',
            gesturesGroup: 'İşlemler ve Yardımcılar',
            gestures: 'İşlem Yöntemleri',
            simmouse: 'Sanal Fare (Mobil)',
            magnifier: 'Büyüteç (Mobil)',
            aids: 'Çizim Yardımcıları',
            sessionAccessory: 'Oturum Aksesuarı',
            sessionPanel: 'Oturum Paneli (Mobil)',
            markupGroup: 'Açıklamalar',
            mkOverview: 'Açıklama Genel Bakış',
            mkArrow: 'Ok',
            mkText: 'Metin',
            mkCloud: 'Revizyon Bulutu',
            mkRect: 'Dikdörtgen',
            mkCircle: 'Daire',
            mkCallout: 'Balon Açıklama (Callout)',
            mkResults: 'Sonuçları Görüntüle',
            measureGroup: 'Ölçüm',
            msOverview: 'Ölçüm Genel Bakış',
            msDistance: 'Uzunluk Ölçümü',
            msContinuous: 'Ardışık Ölçüm',
            msArea: 'Alan Ölçümü',
            msCoords: 'Koordinat Ölçümü',
            msArc: 'Yay Uzunluğu Ölçümü',
            msAngle: 'Açı Ölçümü',
            msResults: 'Sonuçları Görüntüle',
            scriptGroup: 'Betik',
            scOverview: 'Betik Genel Bakış',
            scApi: "Betik API'si",
            scExamples: 'Betik Örnekleri',
            scWriteWithAi: 'AI ile Betik Yazma'
          }),
          '/tr/development/': developmentSidebar('/tr', {
            groupGettingStarted: 'Başlangıç',
            groupConfiguration: 'Yapılandırma',
            groupCoreConcepts: 'Temel Kavramlar',
            groupExtending: 'Genişletme',
            groupDeployment: 'Dağıtım ve Sorun Giderme',
            overview: 'Genel Bakış',
            architecture: 'Mimariye Genel Bakış',
            basics: 'CAD Viewer Temelleri',
            integrateSimple: 'Simple CAD Viewer Entegrasyonu',
            integrateComponent: 'CAD Viewer Bileşeni Entegrasyonu',
            workerUrls: "Worker URL'lerini Yapılandırma",
            proprietaryConverter:
              'Tescilli DWG Dönüştürücüsünü Kurma ve Kullanma',
            selfHostedFonts: 'Kendinde Barındırılan Yazı Tipleri ve Şablonlar',
            jig: 'Jig Sistemi',
            userInput: 'Kullanıcı Girdisi',
            command: 'Komut',
            entityModification: 'Varlık Değiştirme En İyi Uygulamaları',
            colorSystem: 'Renk Sistemi',
            systemVariables: 'Sistem Değişkenleri',
            objectSnap: 'Nesne Yakalama (OSNAP)',
            annotationCommands: 'Açıklama Komutları',
            localization: 'Yerelleştirme',
            pluginSystem: 'Eklenti Sistemi',
            dataSourcePlugin: 'Veri Kaynağı Eklentisi',
            debugging: 'Birden Fazla Depo Değişikliğiyle Hata Ayıklama',
            tianzheng: 'Tianzheng DWG Çizimlerini Destekleme',
            cloudViewer: 'Bulut DWG Web Görüntüleyici Oluşturma',
            upgrade: 'cad-simple-viewer ve cad-viewer Yükseltme'
          })
        }
      }
    }
  },
  themeConfig: {
    search: {
      provider: 'local',
      options: {
        detailedView: true,
        locales: {
          root: { translations: searchTranslations.root },
          zh: { translations: searchTranslations.zh },
          ja: { translations: searchTranslations.ja },
          ko: { translations: searchTranslations.ko },
          ar: { translations: searchTranslations.ar },
          cs: { translations: searchTranslations.cs },
          tr: { translations: searchTranslations.tr }
        }
      }
    }
  }
})

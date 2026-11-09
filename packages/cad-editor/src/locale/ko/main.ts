import enMain from '../en/main'

export default {
  ...enMain,
  bsearch: {
    title: '검색 및 변환',
    found: '인스턴스 {count}개 찾음, {included}개 포함',
    position: '{index}/{count}',
    previous: '이전 인스턴스',
    next: '다음 인스턴스',
    includeCurrent: '이 인스턴스 포함',
    convert: '블록으로 변환…',
    cancel: '취소',
    rotation: '회전',
    mirror: '대칭',
    scale: '축척',
    sameLayer: '같은 도면층',
    existingBlocks: '기존 블록',
    textVariations: '문자 변형',
    pickPrompt: '인스턴스를 클릭하여 포함 또는 제외하거나'
  },
  ribbon: {
    ...enMain.ribbon,
    tab: {
      ...enMain.ribbon.tab,
      ai: 'AI'
    },
    group: {
      ...enMain.ribbon.group,
      smartBlocks: '스마트 블록',
      agent: '에이전트',
      pdf: 'PDF',
      groups: '그룹'
    },
    tooltip: {
      ...enMain.ribbon.tooltip,
      searchConvert: '선택한 객체의 모든 사본을 찾아 블록으로 변환합니다(BSEARCH).',
      importPdf: 'PDF 파일에서 벡터 형상을 가져오고 원, 호, 곡선을 복원합니다 (IPDF).',
      pdfScale: '알려진 거리의 두 점으로 가져온 PDF 형상의 축척을 조정합니다 (PDFSCALE).',
      pdfDim: 'PDF에서 분해된 치수(화살표 또는 사선, 치수선, 치수 보조선, 문자)를 치수 객체로 되돌립니다 (PDFDIM).',
      pdfBlock: 'PDF의 반복 형상을 블록으로 만들고 각 사본을 블록 참조로 바꿉니다 (PDFBLOCK).',
      pdfText: 'PDF에서 분해된 문자 획을 문자 객체로 되돌립니다 (PDFTEXT).',
      group: '선택한 객체에서 그룹을 만듭니다(GROUP).',
      ungroup: '그룹 정의를 분해합니다(UNGROUP).',
      groupEdit:
        '그룹 구성원을 추가, 제거하거나 이름을 바꿉니다(GROUPEDIT).',
      groupSelect:
        '그룹 선택을 켜거나 끕니다(PICKSTYLE 그룹 비트).',
      classicGroup: '객체 그룹 대화상자를 엽니다(CLASSICGROUP).'
    },
    command: {
      ...enMain.ribbon.command,
      searchConvert: '검색 및\n변환',
      importPdf: 'PDF\n가져오기',
      pdfScale: '축척\n보정',
      pdfDim: '치수\n인식',
      pdfBlock: '블록\n만들기',
      pdfText: '문자\n인식',
      group: '그룹',
      ungroup: '그룹 해제',
      groupEdit: '그룹 편집',
      groupSelect: '그룹 선택 켜기/끄기',
      classicGroup: '그룹 관리자'
    }
  }
}

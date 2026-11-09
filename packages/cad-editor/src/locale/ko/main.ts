import enMain from '../en/main'

export default {
  ...enMain,
  ribbon: {
    ...enMain.ribbon,
    tab: {
      ...enMain.ribbon.tab,
      ai: 'AI'
    },
    group: {
      ...enMain.ribbon.group,
      agent: '에이전트',
      pdf: 'PDF',
      groups: '그룹'
    },
    tooltip: {
      ...enMain.ribbon.tooltip,
      importPdf: 'PDF 파일에서 벡터 형상을 가져오고 원, 호, 곡선을 복원합니다 (IPDF).',
      pdfScale: '알려진 거리의 두 점으로 가져온 PDF 형상의 축척을 조정합니다 (PDFSCALE).',
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
      importPdf: 'PDF\n가져오기',
      pdfScale: '축척\n보정',
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

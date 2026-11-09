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
      agent: 'エージェント',
      pdf: 'PDF',
      groups: 'グループ'
    },
    tooltip: {
      ...enMain.ribbon.tooltip,
      importPdf: 'PDF ファイルからベクトル図形を読み込み、円・円弧・曲線を復元します (IPDF)。',
      pdfScale: '既知の距離の 2 点から読み込んだ PDF 図形の尺度を変更します (PDFSCALE)。',
      pdfDim: 'PDF で分解された寸法（矢印または斜線、寸法線、寸法補助線、文字）を寸法オブジェクトに戻します (PDFDIM)。',
      pdfBlock: 'PDF の繰り返し図形をブロックにし、各コピーをブロック参照に置き換えます (PDFBLOCK)。',
      pdfText: 'PDF で分解された文字のストロークを文字オブジェクトに戻します (PDFTEXT)。',
      group: '選択したオブジェクトからグループを作成します (GROUP)。',
      ungroup: 'グループ定義を分解します (UNGROUP)。',
      groupEdit:
        'グループメンバの追加、削除、または名前変更を行います (GROUPEDIT)。',
      groupSelect:
        'グループ選択のオン/オフを切り替えます (PICKSTYLE グループビット)。',
      classicGroup:
        'オブジェクトグループダイアログを開きます (CLASSICGROUP)。'
    },
    command: {
      ...enMain.ribbon.command,
      importPdf: 'PDF\n読み込み',
      pdfScale: '尺度\n校正',
      pdfDim: '寸法\n認識',
      pdfBlock: 'ブロック\n作成',
      pdfText: '文字\n認識',
      group: 'グループ',
      ungroup: 'グループ解除',
      groupEdit: 'グループ編集',
      groupSelect: 'グループ選択 オン/オフ',
      classicGroup: 'グループ管理'
    }
  }
}

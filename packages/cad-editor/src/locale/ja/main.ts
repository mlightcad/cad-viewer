export default {
  mainMenu: {
    new: '新規図面',
    open: '図面を開く',
    drawingUnits: '図面単位',
    exportMenu: '書き出し',
    export: 'DXF に書き出し',
    exportHtml: 'HTML に書き出し',
    exportPdf: 'PDF に書き出し',
    exportSvg: 'SVG に書き出し',
    exportImage: 'イメージに書き出し',
    about: 'バージョン情報'
  },
  ribbon: {
    tab: {
      ai: 'AI',
      home: 'ホーム',
      insert: '挿入',
      view: '表示',
      review: 'レビュー',
      measurement: '計測',
      hatchContext: 'ハッチング',
      mtextEditorContext: 'テキスト エディタ'
    },
    hatch: {
      group: {
        boundary: '境界',
        pattern: 'パターン',
        properties: 'プロパティ',
        options: 'オプション',
        close: '閉じる'
      },
      command: {
        pickPoints: '点をクリック',
        selectObjects: 'オブジェクトを選択',
        close: '閉じる'
      },
      field: {
        pattern: 'パターン',
        scale: '尺度',
        angle: '角度',
        style: 'スタイル',
        associative: '自動調整',
        fillType: '塗り潰しの種類',
        fillColor: '色',
        patternColor: 'パターンの色',
        gradient1Color: 'グラデーション色 1',
        backgroundColor: '背景色',
        gradient2Color: 'グラデーション色 2',
        opacity: '透過性',
        imageScale: 'イメージの尺度'
      },
      style: {
        normal: '標準',
        outer: '外側',
        ignore: '無視'
      },
      fillType: {
        solid: '塗り潰し',
        pattern: 'パターン',
        gradient: 'グラデーション'
      },
      associative: {
        on: 'オン',
        off: 'オフ'
      },
      tooltip: {
        pickPoints: '内側の点をクリックしてハッチング領域を作成します。',
        selectObjects: 'ハッチングする閉じた境界オブジェクトを選択します。',
        pattern: 'ハッチング パターン名を選択します。',
        scale: 'ハッチング パターンの尺度を設定します。',
        angle: 'ハッチング パターンの角度を度単位で設定します。',
        style: 'ハッチング作成時の領域検出スタイルを指定します。',
        associative: '自動調整ハッチング モードを切り替えます。',
        fillType:
          '塗り潰しの種類 (塗り潰し、パターン、グラデーション) を選択します。',
        fillColor: '塗り潰しの色を選択します。',
        patternColor: 'パターンの線の色を選択します。',
        gradient1Color: '1 番目のグラデーション色を選択します。',
        backgroundColor: 'パターン塗り潰しの背景色を選択します。',
        gradient2Color: '2 番目のグラデーション色を選択します。',
        opacity: 'ハッチングの透過性 (0-90) を設定します。',
        imageScale: '塗り潰しイメージの尺度を設定します。',
        close: 'ハッチング作成を終了し、このコンテキスト タブを閉じます。'
      }
    },
    mtext: {
      group: {
        textStyle: '文字スタイル',
        format: '書式設定',
        paragraph: '段落',
        insert: '挿入',
        close: '閉じる'
      },
      field: {
        textStyle: '文字スタイル',
        font: 'フォント',
        color: '色',
        height: '高さ',
        obliqueAngle: '傾斜角度',
        tracking: '文字間隔',
        widthFactor: '幅係数'
      },
      characterMap: {
        title: '文字コード表',
        font: 'フォント(F):',
        charsToCopy: 'コピーする文字(A):',
        select: '選択(S)',
        copy: 'コピー(C)',
        noGlyphs: 'このフォントで使用できる文字はありません。',
        copyFailed: 'クリップボードにコピーできません。'
      },
      command: {
        bold: '太字',
        underline: '下線',
        superscript: '上付き',
        italic: '斜体',
        overline: '上線',
        subscript: '下付き',
        strikethrough: '取り消し線',
        stack: 'スタック',
        toggleCase: '大文字/小文字',
        attachment: '位置合わせ',
        list: '箇条書きと番号付け',
        lineSpacing: '行間隔',
        paragraphAlignment: '段落の位置合わせ',
        symbol: '記号',
        close: '閉じる'
      },
      tooltip: {
        textStyle: '現在の図面から文字スタイルを選択します。',
        bold: '太字の書式を切り替えます。',
        underline: '下線の書式を切り替えます。',
        superscript: '上付きの書式を切り替えます。',
        italic: '斜体の書式を切り替えます。',
        overline: '上線の書式を切り替えます。',
        subscript: '下付きの書式を切り替えます。',
        strikethrough: '取り消し線の書式を切り替えます。',
        stack: '選択した分数文字をスタックまたはスタック解除します。',
        toggleCase: '選択した文字の大文字と小文字を切り替えます。',
        font: '現在の文字フォントを設定します。',
        color: '現在の文字色を設定します。',
        height: '現在の文字の高さを設定します。任意の値も入力できます。',
        obliqueAngle:
          '選択した文字の傾斜角度を度単位で設定します (負の値で逆方向に傾斜)。',
        tracking: '選択した文字の間隔を広げたり狭めたりします (既定値は 1)。',
        widthFactor: '選択した文字を水平方向に伸縮します (既定値は 1)。',
        attachment: 'マルチ テキストの位置合わせ点を設定します。',
        list: '箇条書きと番号付けを挿入または設定します。',
        lineSpacing: '行間隔を設定します。',
        paragraphAlignment: '段落の水平方向の位置合わせを設定します。',
        symbol: 'よく使う製図記号を挿入します。',
        close: 'テキスト エディタとこのコンテキスト タブを閉じます。'
      },
      attachment: {
        TL: '左上 TL',
        TC: '上中心 TC',
        TR: '右上 TR',
        ML: '左中央 ML',
        MC: '中央 MC',
        MR: '右中央 MR',
        BL: '左下 BL',
        BC: '下中心 BC',
        BR: '右下 BR'
      },
      list: {
        off: 'オフ',
        number: '番号付き',
        letter: 'アルファベット',
        bullet: '箇条書き',
        start: '開始',
        continue: '継続',
        auto: '自動箇条書きと番号付けを許可',
        allowList: '箇条書きとリストを許可'
      },
      lineSpacing: {
        more: 'その他...',
        clear: '段落間隔をクリア'
      },
      paragraphAlign: {
        default: '既定',
        left: '左',
        center: '中心',
        right: '右',
        justified: '両端揃え',
        distributed: '均等割り付け'
      },
      symbol: {
        degree: '度  %%d',
        plusMinus: 'プラス/マイナス  %%p',
        diameter: '直径  %%c',
        almostEqual: 'ほぼ等しい  \\U+2248',
        angle: '角度  \\U+2220',
        boundary: '境界線  \\U+E100',
        centerLine: '中心線  \\U+2104',
        delta: 'デルタ  \\U+0394',
        electricalPhase: '電気位相  \\U+0278',
        flowLine: 'フロー線  \\U+E101',
        identical: '合同  \\U+2261',
        notEqual: '等しくない  \\U+2260',
        ohm: 'オーム  \\U+2126',
        omega: 'オメガ  \\U+03A9',
        propertyLine: '境界線(敷地)  \\U+214A',
        subscriptTwo: '下付き 2  \\U+2082',
        squared: '2 乗  \\U+00B2',
        cubed: '3 乗  \\U+00B3',
        nbsp: '改行なしスペース Ctrl+Shift+Space',
        other: 'その他...'
      }
    },
    group: {
      smartBlocks: 'スマート ブロック',
      agent: 'エージェント',
      aiModel: 'AI モデル',
      pdf: 'PDF',
      draw: '作成',
      dimension: '寸法',
      modify: '修正',
      layer: '画層',
      properties: 'プロパティ',
      groups: 'グループ',
      utilities: 'ユーティリティ',
      annotation: '注釈',
      navigate: 'ナビゲート',
      namedViews: '名前の付いたビュー',
      coordinates: '座標',
      review: 'レビュー',
      measurement: '計測',
      style: 'スタイル',
      lengthUnits: '長さの単位',
      angleUnits: '角度の単位',
      reference: '参照',
      block: 'ブロック'
    },
    insertBlock: {
      empty: '使用可能なブロックがありません',
      currentDrawing: '現在の図面',
      previewMenu: 'ブロック プレビュー ギャラリー'
    },
    property: {
      color: '色',
      lineType: '線種',
      lineWeight: '線の太さ'
    },
    layerTools: {
      select: '画層',
      off: '画層非表示',
      isolate: '選択表示',
      freeze: '画層フリーズ',
      lock: '画層ロック',
      current: '現在に設定',
      allOn: '画層表示',
      unisolate: '選択表示解除',
      thaw: '画層フリーズ解除',
      unlock: '画層ロック解除',
      restore: '画層復元'
    },
    arc: {
      threePoint: '3 点',
      startCenterEnd: '始点、中心、終点',
      startCenterAngle: '始点、中心、角度',
      startCenterLength: '始点、中心、弦の長さ',
      startEndAngle: '始点、終点、角度',
      startEndDirection: '始点、終点、方向',
      startEndRadius: '始点、終点、半径',
      centerStartEnd: '中心、始点、終点',
      centerStartAngle: '中心、始点、角度',
      centerStartLength: '中心、始点、弦の長さ'
    },
    circle: {
      centerRadius: '中心、半径',
      centerDiameter: '中心、直径',
      twoPoint: '2 点',
      threePoint: '3 点',
      tanTanRadius: '接線、接線、半径',
      tanTanTan: '接線、接線、接線'
    },
    ellipse: {
      ellipse: '楕円',
      arc: '楕円弧'
    },
    tooltip: {
      searchConvert:
        '選択したオブジェクトのすべてのコピーを検索してブロックに変換します（BSEARCH）。',
      detectConvert:
        '図面全体から繰り返しオブジェクトを検出してブロックに変換します（BDETECT）。',
      importPdf:
        'PDF ファイルからベクトル図形を読み込み、円・円弧・曲線を復元します (PDFIMPORT)。',
      pdfScale:
        '既知の距離の 2 点から読み込んだ PDF 図形の尺度を変更します (PDFSCALE)。',
      pdfDim:
        'PDF で分解された寸法（矢印または斜線、寸法線、寸法補助線、文字）を寸法オブジェクトに戻します (PDFDIM)。',
      pdfBlock:
        'PDF の繰り返し図形をブロックにし、各コピーをブロック参照に置き換えます (PDFBLOCK)。',
      pdfText:
        'PDF で分解された文字のストロークを文字オブジェクトに戻します (PDFTEXT)。',
      line: '1 本の直線セグメントを作成します。',
      polyline:
        '連続した線分または円弧セグメントを 1 つのオブジェクトとして作成します。',
      spline:
        'フィット点または制御点を通る滑らかなスプライン曲線を作成します。',
      sketch: '連続したフリーハンドの線分を作成します。',
      revcloud: '図面の領域を強調表示する雲マークを作成します。',
      circle: '複数の作成方法で円を作成します。',
      arc: '複数の作成方法で円弧を作成します。',
      mline: '複数の平行線を 1 つのマルチラインとして作成します。',
      ray: '始点から一方向に無限に延びる放射線を作成します。',
      xline: '両方向に無限に延びる構築線を作成します。',
      ellipse: '楕円または楕円弧を作成します。',
      rect: '長方形または正多角形を作成します。',
      point: '図面に点オブジェクトを配置します。',
      hatch: '閉じた領域をハッチング パターンで塗り潰します。',
      text: '図面にマルチ テキストの注釈を作成します。',
      dimension: '複数の作成方法で寸法を作成します。',
      dimlinear: '水平、垂直、または回転した長さ寸法を作成します。',
      dimaligned: '平行寸法を作成します。',
      dimradius: '円または円弧の半径寸法を作成します。',
      dimdiameter: '円または円弧の直径寸法を作成します。',
      dimangular: '角度寸法を作成します。',
      dimarc: '弧長寸法を作成します。',
      dimordinate: '座標寸法を作成します。',
      dimcontinue: '直前の寸法から直列寸法を作成します。',
      dimbaseline: '直前の寸法から並列寸法を作成します。',
      dimstyle: '寸法スタイル管理を開きます。',
      mleader: 'マルチ引出線の注釈を作成します。',
      mleaderAdd: '既存のマルチ引出線に引出線を追加します。',
      mleaderRemove: '既存のマルチ引出線から引出線を削除します。',
      move: '選択したオブジェクトを新しい位置に移動します。',
      rotate: '選択したオブジェクトを基点を中心に回転します。',
      copy: '選択したオブジェクトを新しい位置に複写します。',
      erase: '選択したオブジェクトを図面から削除します。',
      offset: '指定した距離にオブジェクトの平行コピーを作成します。',
      undo: '直前の編集操作を元に戻します。',
      redo: '元に戻した直前の編集操作をやり直します。',
      properties: '現在の選択のプロパティ パレットを開きます。',
      group: '選択したオブジェクトからグループを作成します (GROUP)。',
      ungroup: 'グループ定義を分解します (UNGROUP)。',
      groupEdit:
        'グループメンバの追加、削除、または名前変更を行います (GROUPEDIT)。',
      groupSelect:
        'グループ選択のオン/オフを切り替えます (PICKSTYLE グループビット)。',
      classicGroup: 'オブジェクトグループダイアログを開きます (CLASSICGROUP)。',
      quickSelect:
        'クイック選択を開き、条件でオブジェクトをフィルタして選択します。',
      find: '検索パレットを開き、図面全体または現在のレイアウトの文字を検索します。',
      countList: '集計パレットを開き、ブロックの集計を表示および管理します。',
      missingResources:
        'フォント、イメージ、外部参照の「見つからない / 外部リソース」パレットを開きます。',
      drawingUnits: '図面単位を開き、座標の形式、精度、挿入尺度を設定します。',
      attachDwg:
        'DWG または DXF 図面を外部参照としてアタッチします (XATTACH)。',
      attachImage:
        'ラスター イメージを外部参照としてアタッチします (IMAGEATTACH)。',
      insert:
        'ブロック パレットを開き、ブロック定義を参照して挿入します (INSERT)。',
      editAttributes:
        '拡張属性編集を開き、ブロックの属性値と表示プロパティを編集します (ATTEDIT)。',
      defineAttribute: 'ブロックで使用する属性定義を作成します (ATTDEF)。',
      agent:
        'CAD エージェント パレット タブを開き、自然言語で図形を作成します。',
      llmSettings:
        'CAD エージェントと PDF の文字認識（OCR）で使用する AI モデルのプロバイダと API キーを設定します。',
      pan: '表示倍率を変更せずに図面の表示を移動します。',
      zoom: '図面の表示をズームします。',
      zoomExtents:
        'すべてのオブジェクトの最大範囲を表示するようにズームします。',
      zoomWindow: '窓で指定した領域を表示するようにズームします。',
      zoomPrevious: '前のビューを表示するようにズームします。',
      zoomSaved: '保存された VPORT / レイアウト ビューにズームします。',
      zoomSmart: '主要な図形のまとまりにズームします。',
      newView: '現在の表示または窓から新しい名前の付いたビューを作成します。',
      viewManager:
        'ビュー管理を開き、名前の付いたビューを作成、復元、削除します。',
      ucs: '現在のユーザ座標系の原点と方向を設定します。',
      namedUcs: '名前の付いた UCS 定義と UCS アイコンの設定を管理します。',
      ucsWorld: 'UCS をワールド座標系に設定します。',
      ucsOrigin: '新しい UCS 原点を定義します。',
      ucsX: 'X 軸を中心に UCS を回転します。',
      ucsY: 'Y 軸を中心に UCS を回転します。',
      ucsZ: 'Z 軸を中心に UCS を回転します。',
      ucsZAxis: 'Z 軸を指定して UCS を定義します。',
      ucsView: 'UCS を現在のビューに位置合わせします。',
      ucsObject: 'UCS を選択したオブジェクトに位置合わせします。',
      restoreView: '図面に保存された名前の付いたビューを復元します。',
      propertyColor:
        '新規作成オブジェクトまたは選択したオブジェクトの色を設定します。',
      propertyLineType:
        '新規作成オブジェクトまたは選択したオブジェクトの線種を設定します。',
      propertyLineWeight:
        '新規作成オブジェクトまたは選択したオブジェクトの線の太さを設定します。',
      layerAction: {
        off: '選択した画層を非表示にし、フリーズせずにオブジェクトを非表示にします。',
        isolate:
          '選択した画層のみを表示して他の画層を非表示にし、関連するオブジェクトに集中できるようにします。',
        freeze:
          '選択した画層をフリーズし、オブジェクトを非表示にして再作図の対象から除外します。',
        lock: '選択した画層をロックし、オブジェクトは表示されますが編集できなくなります。',
        current:
          '選択した画層を現在の画層にし、新しいオブジェクトをその画層に作成します。',
        allOn:
          '非表示になっているすべての画層を表示します。フリーズされた画層はフリーズのままです。',
        unisolate:
          '画層選択表示で非表示またはロックされた画層を、その後の画層の変更を保持したまま復元します。',
        thaw: '選択した画層のフリーズを解除し、オブジェクトを表示して再作図の対象に戻します。',
        unlock:
          '選択した画層のロックを解除し、オブジェクトを再び選択および修正できるようにします。',
        restore: 'このリボンでの直前の画層操作の前の画層状態に復元します。'
      },
      circleOption: {
        centerRadius: '中心点と半径を指定して円を作成します。',
        centerDiameter: '中心点と直径を指定して円を作成します。',
        twoPoint: '2 点で直径を定義して円を作成します。',
        threePoint: '3 点を通る円を作成します。',
        tanTanRadius:
          '2 つのオブジェクトに接し、指定した半径の円を作成します。',
        tanTanTan: '3 つのオブジェクトに接する円を作成します。'
      },
      arcOption: {
        threePoint: '始点、2 点目、終点を通る円弧を作成します。',
        startCenterEnd: '始点、中心点、終点を指定して円弧を作成します。',
        startCenterAngle: '始点、中心点、中心角を指定して円弧を作成します。',
        startCenterLength: '始点、中心点、弦の長さを指定して円弧を作成します。',
        startEndAngle: '始点、終点、中心角を指定して円弧を作成します。',
        startEndDirection:
          '始点、終点、始点での接線方向を指定して円弧を作成します。',
        startEndRadius: '始点、終点、半径を指定して円弧を作成します。',
        centerStartEnd: '中心点、始点、終点を指定して円弧を作成します。',
        centerStartAngle: '中心点、始点、中心角を指定して円弧を作成します。',
        centerStartLength: '中心点、始点、弦の長さを指定して円弧を作成します。'
      },
      rectOption: {
        rectangle: '対角コーナーまたは寸法を指定して長方形を作成します。',
        polygon: '辺の数と作成方法を指定して正多角形を作成します。'
      },
      ellipseOption: {
        ellipse: '長軸と短軸を指定して楕円を作成します。',
        arc: '楕円の軸と円弧の範囲を指定して楕円弧を作成します。'
      }
    },
    command: {
      searchConvert: '検索して\n変換',
      detectConvert: '検出して\n変換',
      importPdf: 'PDF\n読み込み',
      pdfScale: '尺度\n校正',
      pdfDim: '寸法\n認識',
      pdfBlock: 'ブロック\n作成',
      pdfText: '文字\n認識',
      line: '線分',
      polyline: 'ポリライン',
      circle: '円',
      arc: '円弧',
      mline: 'マルチライン',
      ray: '放射線',
      xline: '構築線',
      ellipse: '楕円',
      spline: 'スプライン',
      sketch: 'スケッチ',
      revcloud: '雲マーク',
      rect: '長方形',
      rectangle: '長方形',
      polygon: 'ポリゴン',
      point: '点',
      divide: '等分割',
      hatch: 'ハッチング',
      text: '文字',
      gradient: 'グラデーション',
      dimension: '寸法',
      dimlinear: '長さ寸法',
      dimaligned: '平行寸法',
      dimradius: '半径',
      dimdiameter: '直径',
      dimangular: '角度',
      dimarc: '弧長\n寸法',
      dimordinate: '座標',
      dimcontinue: '直列',
      dimbaseline: '並列',
      dimstyle: '寸法スタイル',
      mleader: 'マルチ引出線',
      mleaderAdd: '引出線を追加',
      mleaderRemove: '引出線を削除',
      move: '移動',
      rotate: '回転',
      copy: '複写',
      erase: '削除',
      offset: 'オフセット',
      undo: '元に戻す',
      redo: 'やり直し',
      properties: 'プロパティ',
      group: 'グループ',
      ungroup: 'グループ解除',
      groupEdit: 'グループ編集',
      groupSelect: 'グループ選択 オン/オフ',
      classicGroup: 'グループ管理',
      quickSelect: 'クイック\n選択',
      find: '検索',
      countList: '集計',
      drawingUnits: '図面\n単位',
      attachDwg: 'DWG\nアタッチ',
      attachImage: 'イメージ\nアタッチ',
      insert: '挿入',
      editAttributes: '属性\n編集',
      defineAttribute: '属性\n定義',
      agent: 'エージェント',
      llmSettings: 'モデル\n設定',
      pan: '画面移動',
      zoom: 'ズーム',
      zoomExtents: 'オブジェクト範囲',
      zoomWindow: '窓',
      zoomPrevious: '前画面',
      zoomSaved: '保存済み',
      zoomSmart: 'スマート',
      newView: '新規\nビュー',
      viewManager: 'ビュー\n管理',
      ucs: 'UCS',
      namedUcs: '名前の付いた\nUCS',
      ucsWorld: 'ワールド',
      ucsOrigin: '原点',
      ucsX: 'X',
      ucsY: 'Y',
      ucsZ: 'Z',
      ucsZAxis: 'Z 軸',
      ucsView: 'ビュー',
      ucsObject: 'オブジェクト',
      restoreView: 'ビュー\n復元'
    }
  },
  bsearch: {
    found: '{count} 個のインスタンス、{included} 個を含める',
    previous: '前のインスタンス',
    next: '次のインスタンス',
    convert: 'ブロックに変換…',
    cancel: 'キャンセル',
    rotation: '回転',
    mirror: '鏡像',
    scale: '尺度',
    sameLayer: '同一画層',
    existingBlocks: '既存ブロック',
    textVariations: '文字の違い',
    pickPrompt: 'インスタンスをクリックして含める/除外する、または',
    source: '選択オブジェクト: {count} 個',
    options: '検索オプション',
    none: '他のインスタンスは見つかりませんでした。検索オプションを変更するか、選択したオブジェクトだけを変換してください。',
    includeAll: 'すべて含める',
    include: 'このインスタンスを含める',
    instance: 'インスタンス {index}',
    blockReference: 'ブロック参照',
    rotatedBy: '回転 {angle}°',
    mirrored: '鏡像',
    scaledBy: '尺度 {scale}',
    hint: '行をクリックするとインスタンスにズームします。図面でインスタンスをクリックすると、含めるか除外するかを切り替えます。'
  },
  bdetect: {
    detecting: '図面内の繰り返しオブジェクトを検索しています…',
    foundSoFar: 'これまでに {count} グループを検出',
    stop: '停止',
    groups: '繰り返しオブジェクトのグループ {count} 個',
    none: '繰り返しオブジェクトは見つかりませんでした。',
    selectAll: 'すべて選択',
    instances: '{count} 個のインスタンス × {objects} 個のオブジェクト',
    layers: '画層: {layers}',
    attributes: '属性',
    attributesHint: 'インスタンス間で異なる文字は属性になります',
    blockName: 'ブロック名',
    review: 'このグループを確認して変換…',
    convertSelected: '選択したグループを変換 ({count})',
    close: '閉じる',
    pickPrompt: 'オブジェクトをクリックしてグループを表示、または',
    summary: '{groups} 個のグループを {count} 個のブロック参照に変換しました',
    nameDuplicate:
      'ブロック名「{name}」は選択した別のグループで使用されています'
  },
  verticalToolbar: {
    measure: {
      text: '計測',
      description: '計測ツール'
    },
    measureDistance: {
      text: '距離',
      description: '2 点間の距離を計測します'
    },
    measureContinuous: {
      text: '連続',
      description:
        'Enter またはキャンセルまで連続して点をクリックし、連結した距離を計測します'
    },
    measureAngle: {
      text: '角度',
      description: '共通の頂点を持つ 2 本の線分の間の角度を計測します'
    },
    measureArea: {
      text: '面積',
      description: '多角形の面積を計測します'
    },
    measureArc: {
      text: '円弧',
      description: '3 点で定義した円弧の長さを計測します'
    },
    measurePoint: {
      text: '点',
      description: 'クリックした点の X/Y 座標を計測します'
    },
    measurementPanel: {
      text: 'パネル',
      description: '計測パレットを開きます'
    },
    clearMeasurements: {
      text: 'クリア',
      description: '現在のレイアウトからすべての計測を削除します'
    },
    measurementImport: {
      text: '読み込み',
      description: 'サイドカー JSON ファイルから計測を読み込みます'
    },
    measurementExport: {
      text: '書き出し',
      description: '計測をサイドカー JSON ファイルに書き出します'
    },
    annotation: {
      text: '注釈',
      description: 'レビュー ツール'
    },
    layer: {
      text: '画層',
      description: '画層を管理します'
    },
    pan: {
      text: '画面移動',
      description: '表示方向や表示倍率を変更せずにビューを移動します'
    },
    markupPanel: {
      text: 'パネル',
      description: 'マークアップ パレットを開きます'
    },
    markupText: {
      text: '文字',
      description: '文字マークアップを配置します'
    },
    markupCloud: {
      text: '雲マーク',
      description: '雲マークのマークアップを作成します'
    },
    markupRect: {
      text: '長方形',
      description: '長方形のマークアップを作成します'
    },
    markupCircle: {
      text: '円',
      description: '円のマークアップを作成します'
    },
    markupArrow: {
      text: '矢印',
      description: '矢印のマークアップを作成します'
    },
    markupLine: {
      text: '線分',
      description: '線分のマークアップを作成します'
    },
    markupCallout: {
      text: '吹き出し',
      description: '吹き出しを作成します'
    },
    markupStamp: {
      text: 'スタンプ',
      description: 'スタンプを配置します'
    },
    markupImport: {
      text: '読み込み',
      description: 'サイドカー JSON ファイルからマークアップを読み込みます'
    },
    markupExport: {
      text: '書き出し',
      description: 'マークアップをサイドカー JSON ファイルに書き出します'
    },
    markupColor: {
      text: '色',
      description: '新しいマークアップの色を設定します'
    },
    markupFontSize: {
      text: '文字の高さ',
      description:
        'マークアップの文字の高さ設定を開きます (画面に合わせる、またはワールドの高さ)',
      fit: 'フィット',
      wcs: 'WCS'
    },
    measurementColor: {
      text: '色',
      description: '選択した計測、または次に追加する計測の色を設定します'
    },
    measurementFontSize: {
      text: '文字の高さ',
      description:
        '選択した計測、または次に追加する計測の文字の高さ設定を開きます',
      fit: 'フィット',
      wcs: 'WCS'
    },
    showMarkup: {
      text: '表示',
      description: 'マークアップを表示します'
    },
    hideMarkup: {
      text: '非表示',
      description: 'マークアップを非表示にします'
    },
    showMeasurements: {
      text: '表示',
      description: '計測を表示します'
    },
    hideMeasurements: {
      text: '非表示',
      description: '計測を非表示にします'
    },
    clearMarkups: {
      text: 'クリア',
      description: '現在のレイアウトのすべてのマークアップをクリアします'
    },
    select: {
      text: '選択',
      description: 'オブジェクトを選択します'
    },
    switchBg: {
      text: '切り替え',
      description: '図面の背景を白と黒で切り替えます',
      disabledInReadingMode:
        '閲覧モードがオンの間は使用できません (白いキャンバスに固定)'
    },
    readingMode: {
      text: '閲覧',
      description:
        '閲覧モードを切り替えます: 白いキャンバスに黒い線で表示し、確認しやすくします'
    },
    zoom: {
      text: 'ズーム',
      description:
        'ズーム ツール: 保存済みビュー、オブジェクト範囲、スマート範囲、窓'
    },
    zoomSaved: {
      text: '保存済み',
      description:
        'AutoCAD で保存されたビュー (VPORT / レイアウトの図面範囲)、または開いたときのビューを復元します'
    },
    zoomToExtent: {
      text: 'オブジェクト範囲',
      description: 'すべてのオブジェクトの最大範囲を表示するようにズームします'
    },
    zoomSmartExtents: {
      text: 'スマート',
      description:
        '遠く離れた外れ値のオブジェクトを無視し、主要な図形のまとまりにズームします'
    },
    zoomToBox: {
      text: '窓',
      description: '長方形の窓で指定した領域を表示するようにズームします'
    }
  },
  statusBar: {
    setting: {
      tooltip: '表示設定',
      commandLine: 'コマンド ライン',
      coordinate: '座標',
      entityInfo: 'オブジェクト情報',
      languageSelector: '言語選択',
      ribbon: 'リボン',
      toolbar: 'ツールバー',
      stats: '統計'
    },
    cannoscale: {
      tooltip: '注釈尺度 (CANNOSCALE)'
    },
    annoallvisible: {
      on: '現在の尺度をサポートしない異尺度対応オブジェクトを非表示',
      off: 'すべての異尺度対応オブジェクトを表示 (ANNOALLVISIBLE)'
    },
    osnap: {
      tooltip: 'オブジェクト スナップ',
      endpoint: '端点',
      midpoint: '中点',
      center: '中心',
      node: '点',
      quadrant: '四半円点',
      intersection: '交点',
      insertion: '挿入基点',
      nearest: '近接点'
    },
    pointStyle: {
      tooltip: '点スタイルを変更'
    },
    fullScreen: {
      on: '全画面表示をオフ',
      off: '全画面表示をオン'
    },
    dynamicInput: {
      on: 'ダイナミック入力をオフ',
      off: 'ダイナミック入力をオン'
    },
    lineWidth: {
      on: '線の太さを非表示',
      off: '線の太さを表示'
    },
    orthoMode: {
      on: '直交モードをオフ',
      off: '直交モードをオン'
    },
    polarTracking: {
      on: '極トラッキングをオフ',
      off: '極トラッキングをオン'
    },
    theme: {
      dark: 'ライト テーマに切り替え',
      light: 'ダーク テーマに切り替え'
    },
    warning: {
      font: '次のフォントが見つかりません!'
    },
    notification: {
      tooltip: '通知を表示'
    },
    export: {
      tooltip: 'イメージを PNG として書き出し'
    },
    moreLayouts: 'その他のレイアウト'
  },
  toolPalette: {
    entityProperties: {
      tab: 'プロパティ',
      title: 'オブジェクト プロパティ',
      propertyPanel: {
        noEntitySelected: 'オブジェクトが選択されていません!',
        multipleEntitySelected: '{count} 個のオブジェクトを選択',
        propValCopied: 'プロパティ値をコピーしました',
        failedToCopyPropVal: 'プロパティ値をコピーできませんでした!'
      }
    },
    layerManager: {
      tab: '画層',
      title: '画層管理',
      currentLayerLabel: '現在の画層: {name}',
      searchPlaceholder: '画層を検索',
      filters: 'フィルタ',
      collapseFilters: 'フィルタを折りたたむ',
      expandFilters: 'フィルタを展開',
      filterAll: 'すべて',
      filterAllUsed: '使用中のすべての画層',
      toolbar: {
        showFilters: '画層フィルタ',
        newFilter: '新規フィルタ',
        newFilterGroup: '新規グループ フィルタ',
        newLayer: '新規画層',
        deleteLayer: '画層を削除',
        setCurrent: '現在に設定'
      },
      prompts: {
        newFilterTitle: '新規フィルタ',
        newFilterName: 'フィルタ名を入力',
        newFilterGroupTitle: '新規グループ フィルタ',
        newFilterGroupName: 'グループ フィルタ名を入力',
        newLayerTitle: '新規画層',
        newLayerName: '画層名を入力',
        confirm: 'OK',
        cancel: 'キャンセル'
      },
      messages: {
        filterCreated: 'フィルタ「{name}」を作成しました',
        filterExists: 'フィルタ「{name}」は既に存在します',
        filterCreateFailed: 'フィルタを作成できませんでした',
        layerCreated: '画層「{name}」を作成しました',
        layerExists: '画層「{name}」は既に存在します',
        layerCreateFailed: '画層を作成できませんでした',
        layerDeleted: '画層「{name}」を削除しました',
        layerDeleteFailed: '画層「{name}」を削除できませんでした',
        cannotDeleteLayer0: '画層「0」は削除できません',
        cannotDeleteCurrent: '現在の画層は削除できません',
        selectLayerFirst: '先に画層を選択してください',
        setCurrentSuccess: '現在の画層を「{name}」に設定しました',
        setCurrentFailed: '現在の画層を設定できませんでした'
      },
      layerList: {
        name: '名前',
        on: '表示',
        freeze: 'フリーズ',
        lock: 'ロック',
        plot: '印刷',
        color: '色',
        linetype: '線種',
        lineweight: '線の太さ',
        transparency: '透過性',
        description: '説明',
        currentLayer: '現在の画層',
        newLayerPlaceholder: '画層名',
        zoomToLayer: 'クリックした画層「{layer}」にズームしました',
        lineWeightDefault: '既定'
      }
    },
    find: {
      tab: '検索',
      title: '検索',
      placeholder: '文字を検索',
      input: '検索文字列',
      find: '検索',
      matchCase: '大文字と小文字を区別',
      currentLayoutOnly: '現在のレイアウトのみ',
      hint: 'Enter キーを押すと、図面全体 (すべてのレイアウト) の文字、マルチ テキスト、属性、およびブロック、寸法、引出線、表内の文字を検索します。',
      hintLayout:
        'Enter キーを押すと、現在のレイアウトの文字、マルチ テキスト、属性、およびブロック、寸法、引出線、表内の文字を検索します。',
      noResults: '文字が見つかりません',
      count: '{count} 件見つかりました',
      countLayouts: '{layouts} 個のレイアウトで {count} 件見つかりました',
      countTruncated:
        '最初の {count} 件を表示しています — 検索条件を絞り込んでください',
      noDocument: '検索するには図面を開いてください',
      layoutUnavailable: 'レイアウト「{layout}」を開けませんでした',
      unnamedLayout: '(名前のないレイアウト)',
      kind: {
        text: '文字',
        mtext: 'マルチ テキスト',
        attribute: '属性',
        block: 'ブロック内の文字',
        dimension: '寸法',
        leader: '引出線',
        table: '表'
      }
    },
    bdetect: {
      tab: '検出',
      title: '検出して変換'
    },
    bsearch: {
      tab: '検索',
      title: '検索して変換'
    },
    countList: {
      tab: '集計',
      title: '集計',
      searchPlaceholder: 'ブロック名を検索',
      countInArea: '領域内を集計',
      areaSet: '集計領域を更新しました',
      areaCleared: 'モデル空間全体を集計しています',
      blockName: 'ブロック',
      count: '数',
      empty: '表示されているブロックが見つかりません',
      prompt: {
        firstCorner: '集計領域の 1 つ目のコーナーを指定 または [全体(E)]: ',
        secondCorner: 'もう一方のコーナーを指定: '
      }
    },
    designReview: {
      tab: 'レビュー',
      title: 'レビュー',
      searchPlaceholder: 'マークアップを検索',
      empty: 'マークアップはまだありません',
      type: '種類',
      status: 'ステータス',
      author: '作成者',
      summary: '概要',
      details: '詳細',
      closeDetails: '詳細を閉じる',
      label: 'ラベル',
      comment: 'コメント',
      zoomTo: 'ズーム',
      delete: '削除',
      clear: 'すべてクリア',
      statusValues: {
        open: '未対応',
        question: '質問',
        answered: '回答済み',
        closed: '完了'
      }
    },
    measurements: {
      tab: '計測',
      title: '計測',
      empty: '計測はまだありません',
      type: '種類',
      value: '値',
      filterAll: 'すべて',
      delete: '削除',
      clear: 'すべてクリア',
      typeValues: {
        distance: '距離',
        angle: '角度',
        area: '面積',
        arc: '円弧',
        point: 'XY'
      }
    },
    missingResources: {
      tab: 'リソース',
      title: '見つからない / 外部リソース',
      fontTab: 'フォント',
      imageTab: 'イメージ',
      xrefTab: '外部参照',
      attach: 'アタッチ',
      attachDwg: 'DWG/DXF をアタッチ...',
      attachImage: 'イメージをアタッチ...',
      attachImageFailed: 'イメージ「{name}」をアタッチできませんでした',
      fileReferences: 'ファイル参照',
      details: '詳細',
      foundAt: '検出場所',
      selectReference: '参照を選択すると詳細が表示されます',
      expandDetails: '詳細を展開',
      collapseDetails: '詳細を折りたたむ',
      apply: '適用',
      applyDone: '置き換えを適用しました',
      emptyFonts: '見つからないフォントはありません',
      emptyImages: '見つからないイメージはありません',
      matchFontType: 'フォントの種類を一致させる (SHX / メッシュ)',
      missedFont: '見つからないフォント',
      replacedFont: '置き換えフォント',
      selectFont: '置き換えるフォントを選択',
      selectLocalFont: 'ローカルのフォント ファイルを選択',
      file: 'ファイル',
      replace: '置き換え',
      name: '名前',
      path: '保存パス',
      type: 'タイプ',
      typeAttach: 'アタッチ',
      typeOverlay: 'オーバーレイ',
      typeImage: 'イメージ',
      status: 'ステータス',
      statusMissing: '見つかりません',
      statusLoaded: 'ロード済み',
      actions: '操作',
      visible: '表示',
      browse: '参照…',
      fromUrl: 'URL…',
      unload: 'アンロード',
      load: 'ロード',
      empty: 'この図面には外部参照やイメージはありません',
      urlPrompt: 'DWG または DXF ファイルの URL を入力',
      urlRequired: 'URL を入力してください',
      loadFailed: '参照「{name}」をロードできませんでした'
    },
    memoryProfile: {
      tab: 'メモリ',
      title: 'メモリ プロファイル',
      refresh: '更新',
      collecting: 'メモリを分析しています ...',
      showPie: '概要グラフを表示',
      hidePie: '概要グラフを非表示',
      collectedAt: '収集日時 {time}',
      heapUsed: 'JS ヒープ {used} / {total}',
      estimateNote:
        'ジオメトリのサイズはバッファの byteLength に基づきます。その他のカテゴリは推定値です。',
      estimated: '推定',
      pieTotal: '計上済み',
      pieAriaLabel: 'カテゴリ別のメモリ内訳',
      empty: 'データなし',
      missedFonts: '見つからないフォント',
      fontMemory: 'フォント / マルチ テキストのメモリ',
      fontMemorySummary: 'メモリ {live} (メイン {main} · ワーカー {workers})',
      fontStorage: 'IndexedDB ストレージ (メモリではありません)',
      fontStorageSummary: 'キャッシュ済みフォント {count} 個 · {size}',
      materialPoint: '点',
      materialLine: '線',
      materialFill: '塗り潰し',
      materialTotal: '合計',
      dataModelCounts:
        'オブジェクト {entities} 個 · 非図形オブジェクト {objects} 個 · {total}',
      dataModelCategories: 'カテゴリ別',
      dataModelEntityTypes: 'オブジェクト タイプ別',
      categories: {
        heap: 'JS ヒープ',
        geometry: 'ジオメトリ',
        mapping: 'マッピング',
        spatial: '空間インデックス',
        dataModel: 'データ モデル',
        materials: 'マテリアル',
        fonts: 'フォント'
      },
      tabs: {
        geometry: 'ジオメトリ',
        spatial: '空間',
        dataModel: 'データ モデル',
        materials: 'マテリアル',
        fonts: 'フォント'
      },
      columns: {
        layout: 'レイアウト',
        layer: '画層',
        geometry: 'ジオメトリ',
        mapping: 'マッピング',
        entities: 'オブジェクト',
        rootItems: 'ルート',
        childItems: '子',
        estimated: '推定サイズ',
        type: 'タイプ',
        count: '数',
        category: 'カテゴリ',
        font: 'フォント'
      }
    },
    openFileProfile: {
      tab: '開く性能',
      title: 'ファイルを開く性能',
      refresh: '更新',
      copy: 'コピー',
      copied: '性能データをコピーしました',
      copyFailed: '性能データをコピーできませんでした',
      collectedAt: '収集日時 {time}',
      hint: '最後に図面を開いたときに自動的に記録されます。OPENPROF=1 に設定するとコンソールにも出力されます。',
      noData:
        'まだプロファイルがありません。図面を開いてから OPENPERF を実行してください。',
      empty: 'データなし',
      timing: '実時間',
      progressive: '段階的オープン',
      progressiveMode: 'モード',
      progressiveOn: 'オン',
      progressiveOff: 'オフ',
      midOpenPaints: 'オープン中の描画',
      yields: 'Yield 回数',
      cache: 'INSERT 描画キャッシュ (最上位)',
      slowBlocks: '最も遅いブロック テンプレートのミス',
      total: 'オープン合計',
      read: 'db.read',
      parse: '解析',
      entity: 'ENTITY フラッシュ',
      convert: 'シーン変換',
      cacheHits: 'キャッシュ ヒット',
      cacheMisses: 'キャッシュ ミス',
      cacheBuild: 'ミス時の構築',
      cacheCompact: 'ミス時の圧縮',
      cacheHitPath: 'ヒット パス',
      columns: {
        stage: '段階',
        duration: '所要時間',
        share: '割合',
        metric: '指標',
        value: '値',
        block: 'ブロック',
        build: '構築',
        compact: '圧縮'
      }
    },
    blocks: {
      tab: 'ブロック',
      title: 'ブロック',
      tabCurrentDrawing: '現在の図面',
      tabRecent: '最近使用',
      tabFavorites: 'お気に入り',
      tabLibraries: 'ライブラリ',
      sectionCurrentDrawing: '現在の図面のブロック',
      sectionRecent: '最近使用したブロック',
      sectionFavorites: 'お気に入りのブロック',
      sectionLibraries: 'ブロック ライブラリ',
      filterPlaceholder: 'フィルタ...',
      empty: '使用可能なブロックがありません',
      emptyRecent: '最近挿入したブロックはありません',
      emptyFavorites: 'お気に入りのブロックはありません',
      emptyLibraries: 'ライブラリが設定されていません',
      toggleFavorite: 'お気に入りを切り替え',
      options: 'オプション',
      insertionPoint: '挿入位置',
      scale: '尺度',
      rotation: '回転',
      angle: '角度',
      autoPlacement: '自動配置',
      repeatPlacement: '繰り返し配置',
      explode: '分解'
    }
  },
  colorDropdown: {
    custom: 'カスタム'
  },
  lineTypeSelect: {
    placeholder: '線種'
  },
  colorIndexPicker: {
    color: '色: ',
    colorIndex: '色番号: ',
    inputPlaceholder: '0-256、BYLAYER、BYBLOCK',
    rgb: 'RGB: '
  },
  entityInfo: {
    color: '色',
    layer: '画層',
    lineType: '線種'
  },
  ribbonProperty: {
    color: '色',
    lineType: '線種',
    lineWeight: '線の太さ',
    layer: '画層'
  },
  layerSelect: {
    searchPlaceholder: '画層名を検索',
    noLayerAvailable: '使用可能な画層がありません',
    noMatchedLayer: '一致する画層がありません',
    tooltip: {
      layer: '画層',
      visibility: '表示/非表示',
      freeze: 'フリーズ',
      lock: 'ロック',
      lineType: '線種',
      color: '色',
      visible: '表示',
      hidden: '非表示',
      frozen: 'フリーズ',
      thawed: 'フリーズ解除',
      locked: 'ロック',
      unlocked: 'ロック解除'
    }
  },
  message: {
    loadingFonts: 'フォントをロードしています ...',
    loadingDwgConverter: 'DWG コンバータをロードしています...',
    fontsNotFound: 'フォント {fonts} がフォント リポジトリに見つかりません!',
    fontsNotLoaded: 'フォント {fonts} をロードできません!',
    fontMissedInDrawing:
      'フォント「{font}」は {count} 個の文字オブジェクトで必要ですが、使用できません。「{replacementFont}」で表示しています。',
    fontMissedReplacement: '「{font}」(「{replacement}」で表示)',
    fontCached: 'フォント「{font}」をキャッシュしました。',
    fontCacheFailed: 'フォント「{fileName}」をキャッシュできませんでした。',
    failedToGetAvaiableFonts:
      '「{url}」から使用可能なフォントを取得できませんでした!',
    failedToOpenFile: 'ファイル「{fileName}」を開けませんでした!',
    failedToOpenFileToast:
      '「{fileName}」を開けませんでした。詳細は通知センターを確認してください。',
    failedToOpenFileWorkerOom:
      '「{fileName}」を開けませんでした。使用可能なメモリが不足しているため解析に失敗しました (LibreDWG パーサ)。{dwgParserLink} から商用 DWG パーサを購入すると、大きな図面もこのクラッシュなしで開くことができます。',
    failedToOpenFileWorkerOomLink: 'こちらのページ',
    failedToOpenFileWorkerTimeout:
      '「{fileName}」を開けませんでした。図面の解析中にタイムアウトしました。',
    failedToOpenFileFontLoadFailed:
      '「{fileName}」を開けませんでした。必要なフォントをロードできませんでした。',
    failedToOpenFileLicenseExpired:
      '「{fileName}」を開けませんでした。DWG コンバータのライセンスの有効期限が切れています。',
    failedToOpenFileLicenseInvalid:
      '「{fileName}」を開けませんでした。DWG コンバータのライセンスが見つからないか無効です。',
    fetchingDrawingFile: 'ファイルを取得しています ...',
    unknownEntities:
      'この図面には不明またはサポートされていないオブジェクトが {count} 個含まれています! これらのオブジェクトは表示されません。',
    tianzhengEntities:
      'この図面には TArch / Tianzheng (または類似のサードパーティ製) のカスタム オブジェクトが約 {count} 個含まれています。この環境では完全に解析できないため、一部の内容が表示されない場合があります。',
    emptyProxyEntities:
      'この図面にはプロキシ グラフィックスのないカスタム オブジェクトが {count} 個含まれています! これらのオブジェクトは表示されません。'
  },
  notification: {
    center: {
      title: '通知',
      clearAll: 'すべてクリア',
      noNotifications: '通知はありません'
    },
    group: {
      fontMissed: '見つからないフォント',
      fontMissedSummary:
        'フォント関連のメッセージが {count} 件あります。クリックして詳細を展開します。',
      unsupportedEntities: 'サポートされていないオブジェクト',
      unsupportedEntitiesSummary:
        '解析関連のメッセージが {count} 件あります。クリックして詳細を展開します。',
      genericSummary:
        'メッセージが {count} 件あります。クリックして詳細を展開します。'
    },
    time: {
      justNow: 'たった今',
      minutesAgo: '{count} 分前 | {count} 分前',
      hoursAgo: '{count} 時間前 | {count} 時間前',
      daysAgo: '{count} 日前 | {count} 日前'
    },
    title: {
      failedToOpenFile: 'ファイルを開けませんでした',
      failedToOpenFileWorkerOom: 'メモリ不足',
      failedToOpenFileWorkerTimeout: 'オープンのタイムアウト',
      failedToOpenFileFontLoadFailed: 'フォントのロードに失敗',
      failedToOpenFileLicenseExpired: 'ライセンスの期限切れ',
      failedToOpenFileLicenseInvalid: '無効なライセンス',
      fontNotFound: 'フォントが見つかりません',
      fontNotLoaded: 'フォントがロードされていません',
      parsingWarning: '図面の解析で問題が発生しました',
      systemMessage: 'システム メッセージ',
      systemWarning: 'システム警告',
      systemError: 'システム エラー',
      systemInfo: 'システム情報'
    }
  }
}

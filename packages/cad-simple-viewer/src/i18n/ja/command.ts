export default {
  ACAD: {
    '-hatch': {
      description:
        'リボン UI を使わずにコマンド ライン オプションでハッチングを作成します'
    },
    '-layer': {
      description: 'コマンド ライン オプションで画層を管理します'
    },
    about: {
      description: 'mlightcad に関する情報を表示します'
    },
    acadver: {
      description:
        '図面データベースのバージョン識別子を保存します (読み込み専用)'
    },
    annoallvisible: {
      description:
        '現在の注釈尺度をサポートしない異尺度対応オブジェクトを表示するかどうかをコントロールします'
    },
    angbase: {
      description: '現在の UCS を基準にして基準角度 0 の方向を設定します'
    },
    angdir: {
      description:
        '正の角度を時計回りに測定するか反時計回りに測定するかを設定します'
    },
    arc: {
      description: '円弧を作成します'
    },
    aunits: {
      description: '角度の表示形式を設定します'
    },
    auprec: {
      description: '角度の表示精度を設定します (AUNITS と組み合わせて使用)'
    },
    bmpout: {
      description: 'BMP に書き出します'
    },
    cannoscale: {
      description: '現在の注釈尺度の名前を設定します'
    },
    cdxf: {
      description: '現在の図面を DXF に書き出します'
    },
    cpdf: {
      description: '現在の図面を PDF に書き出します'
    },
    '-cpdf': {
      description: 'コマンド ライン オプションで現在の図面を PDF に書き出します'
    },
    cecolor: {
      description: '新しく作成するオブジェクトの既定の色を設定します'
    },
    celtscale: {
      description: '新しく作成するオブジェクトの線種尺度をコントロールします'
    },
    celtype: {
      description: '新しく作成するオブジェクトの線種を設定します'
    },
    celweight: {
      description: '新しく作成するオブジェクトの既定の線の太さを設定します'
    },
    cetransparency: {
      description: '新しく作成するオブジェクトの透過性を設定します'
    },
    cachefont: {
      description:
        '文字のレンダリング用にローカル フォント ファイルを IndexedDB にキャッシュします'
    },
    circle: {
      description: '中心と半径を指定して円を作成します'
    },
    clayer: {
      description:
        '新しいオブジェクトと編集操作で使用する現在の画層を設定します'
    },
    cmleaderstyle: {
      description: '現在のマルチ引出線スタイルの名前を設定します'
    },
    cmlscale: {
      description: 'マルチラインの全体の幅をコントロールします'
    },
    cmlstyle: {
      description: '現在のマルチライン スタイルの名前を設定します'
    },
    colortheme: {
      description:
        'ユーザ インタフェースのカラー テーマ (ダークまたはライト) をコントロールします'
    },
    copy: {
      description: '選択したオブジェクトを新しい位置に複写します',
      prompt: 'オブジェクトを選択'
    },
    csvg: {
      description: '現在の図面を SVG に変換します'
    },
    chtml: {
      description:
        '現在の図面をオフラインで使用できる単独の HTML ファイルに書き出します'
    },
    '-chtml': {
      description:
        'コマンド ライン オプションで現在の図面を HTML に書き出します'
    },
    dimlinear: {
      description: '長さ寸法を作成します'
    },
    dimaligned: {
      description: '平行寸法を作成します'
    },
    dimradius: {
      description: '円または円弧の半径寸法を作成します'
    },
    dimdiameter: {
      description: '円または円弧の直径寸法を作成します'
    },
    dimangular: {
      description: '角度寸法を作成します'
    },
    dimarc: {
      description: '弧長寸法を作成します'
    },
    dimordinate: {
      description: '座標寸法を作成します'
    },
    dimcontinue: {
      description: '直列寸法を作成します'
    },
    dimbaseline: {
      description: '並列寸法を作成します'
    },
    dimstyle: {
      description: '現在の寸法スタイルの名前を設定します'
    },
    dwgname: {
      description: '現在の図面ファイルの名前を保存します (読み込み専用)'
    },
    loginname: {
      description: 'ユーザのログイン名を表示します (読み込み専用)'
    },
    dynmode: {
      description: 'カーソル位置のダイナミック入力の設定をコントロールします'
    },
    dynprompt: {
      description:
        'ダイナミック入力のツールチップでのプロンプトの表示をコントロールします'
    },
    ellipse: {
      description: '軸の端点または中心を指定して楕円または楕円弧を作成します'
    },
    erase: {
      description: '選択したオブジェクトを図面から削除します',
      prompt: 'オブジェクトを選択'
    },
    group: {
      description:
        'グループと呼ばれるオブジェクトの保存セットを作成および管理します'
    },
    '-bsearch': {
      description:
        '同一のジオメトリを検索してブロックに変換します（コマンドライン）',
      prompt: '検索するオブジェクトを選択'
    },
    '-group': {
      description: 'コマンドラインオプションでグループを作成および管理します'
    },
    groupedit: {
      description:
        'グループにオブジェクトを追加・削除するか、グループ名を変更します'
    },
    ungroup: {
      description: 'オブジェクトとグループの関連付けを解除します'
    },
    extmax: {
      description:
        'モデル空間の図面範囲の右上コーナーを保存します (読み込み専用)'
    },
    extmin: {
      description:
        'モデル空間の図面範囲の左下コーナーを保存します (読み込み専用)'
    },
    entout: {
      description:
        '選択したオブジェクトの結合プレビュー イメージを書き出します',
      prompt: 'オブジェクトを選択'
    },
    hideobjects: {
      description: '選択したオブジェクトの表示を一時的に非表示にします',
      prompt: 'オブジェクトを選択'
    },
    imageattach: {
      description: 'ラスター イメージを外部参照として現在の図面にアタッチします'
    },
    '-insert': {
      description: 'ブロック定義を現在の図面に挿入します (コマンド ライン)'
    },
    xattach: {
      description:
        'DWG または DXF 図面を外部参照として現在の図面にアタッチします'
    },
    gripcolor: {
      description:
        '選択したオブジェクトに表示される非選択グリップの色を設定します'
    },
    griphot: {
      description: '選択された (ホット) グリップの色を設定します'
    },
    gripobjlimit: {
      description:
        '選択セットが指定した数のオブジェクトを超えるとグリップを表示しません (0 = 制限なし)'
    },
    grips: {
      description:
        '選択したオブジェクトにグリップを表示するかどうかをコントロールします'
    },
    gripsize: {
      description: 'グリップ ボックスのサイズをピクセル単位で設定します'
    },
    hatch: {
      description:
        '閉じた領域または選択したオブジェクトをハッチング パターンで塗り潰します'
    },
    pdfdim: {
      description: 'PDF で分解された寸法を寸法オブジェクトに戻します',
      prompt: '寸法を含む範囲を選択'
    },
    pdfblock: {
      description: 'PDF の繰り返し図形をブロックに戻します',
      prompt: 'ブロック 1 個分のオブジェクトを選択'
    },
    pdftext: {
      description:
        'PDF で分解された文字のストロークを文字オブジェクトに戻します',
      prompt: '変換する文字ストロークを選択'
    },
    pdfscale: {
      description: '既知の距離から読み込んだ PDF 図形の尺度を校正します',
      prompt: '尺度変更するオブジェクトを選択'
    },
    ipdf: {
      description: 'PDF ファイルからベクトル ジオメトリを読み込みます'
    },
    hpang: {
      description:
        '新しく作成するハッチング パターンの既定の角度をラジアン単位で設定します'
    },
    hpassoc: {
      description:
        '新しく作成するハッチングを自動調整にするかどうかをコントロールします'
    },
    hpbackgroundcolor: {
      description: '新しく作成するハッチング パターンの既定の背景色を設定します'
    },
    hpcolor: {
      description: '新しく作成するハッチングの既定の色を設定します'
    },
    hpdouble: {
      description:
        'ユーザ定義ハッチング パターンをクロスにするかどうかをコントロールします'
    },
    hpislanddetection: {
      description:
        '新しく作成するハッチング境界内の島の処理方法をコントロールします'
    },
    hplayer: {
      description: '新しく作成するハッチングと塗り潰しの既定の画層を設定します'
    },
    hpname: {
      description:
        'このセッションで新しく作成するハッチングの既定のパターン名を設定します'
    },
    hpscale: {
      description: '新しく作成するハッチング パターンの既定の尺度を設定します'
    },
    hpseparate: {
      description:
        '複数の境界に対して 1 つのハッチング オブジェクトを作成するか、個別のハッチング オブジェクトを作成するかをコントロールします'
    },
    hptransparency: {
      description:
        '新しく作成するハッチングと塗り潰しの既定の透過性を設定します'
    },
    insunits: {
      description:
        '挿入するブロック、イメージ、外部参照を自動的に尺度変更するための図面単位を指定します'
    },
    jpgout: {
      description: 'JPEG に書き出します'
    },
    laycur: {
      description:
        '選択したオブジェクトの画層プロパティを現在の画層に変更します',
      prompt: '現在の画層に変更するオブジェクトを選択'
    },
    laydel: {
      description: '画層とその画層上のすべてのオブジェクトを削除します'
    },
    layerclose: {
      description: '画層プロパティ管理を閉じます'
    },
    layerp: {
      description: '画層設定に対する直前の変更または一連の変更を元に戻します'
    },
    layfrz: {
      description: '選択したオブジェクトの画層をフリーズします',
      prompt: 'フリーズする画層上のオブジェクトを選択'
    },
    layiso: {
      description: '選択したオブジェクトの画層を選択表示します',
      prompt: '選択表示する画層上のオブジェクトを選択'
    },
    laylck: {
      description: '選択したオブジェクトの画層をロックします',
      prompt: 'ロックする画層上のオブジェクトを選択'
    },
    layoff: {
      description: '選択したオブジェクトの画層を非表示にします',
      prompt: '非表示にする画層上のオブジェクトを選択'
    },
    layon: {
      description: '図面内のすべての画層を表示します'
    },
    laythw: {
      description: '図面内のフリーズされたすべての画層をフリーズ解除します'
    },
    layulk: {
      description: '選択したオブジェクトの画層をロック解除します',
      prompt: 'ロック解除する画層上のオブジェクトを選択'
    },
    layuniso: {
      description: 'LAYISO で非表示またはロックされた画層を元に戻します'
    },
    line: {
      description: '点と点の間に直線セグメントを作成します'
    },
    log: {
      description: 'デバッグ情報をコンソールに出力します'
    },
    ltscale: {
      description: '図面のグローバル線種尺度を設定します'
    },
    lunits: {
      description: '座標と距離の表示形式を設定します'
    },
    luprec: {
      description:
        '長さの単位の表示精度を設定します (LUNITS と組み合わせて使用)'
    },
    lwdisplay: {
      description: '図面に線の太さを表示するかどうかをコントロールします'
    },
    clearmeasurements: {
      description: '現在のレイアウトからすべての計測を削除します'
    },
    measurementvis: {
      description: '現在のレイアウトの計測を表示または非表示にします'
    },
    measurementpanel: {
      description: '計測パレットを開きます'
    },
    measurementexport: {
      description: '計測をサイドカー JSON ファイルに書き出します'
    },
    measurementimport: {
      description: 'サイドカー JSON ファイルから計測を読み込みます'
    },
    measurearea: {
      description: '選択したオブジェクトまたは点の面積と周長を計算します'
    },
    measureangle: {
      description: '2 本の線分または 3 点間の角度を計測します'
    },
    measurearc: {
      description: '円弧セグメントの長さを計測します'
    },
    measuredistance: {
      description: '2 点間の距離と差分値を計測します'
    },
    measurecontinuous: {
      description:
        'Enter キーを押すかキャンセルするまで連続して点を指定し、連続した距離を計測します'
    },
    measurepoint: {
      description: '指定した点の X/Y 座標を計測します'
    },
    measurement: {
      description:
        '図面でヤード・ポンド法とメートル法のどちらの単位を使用するかを設定します'
    },
    measurementcolor: {
      description: '計測オーバーレイに使用する色を設定します'
    },
    modelbkcolor: {
      description: 'モデル空間の作図領域の背景色を設定します'
    },
    leader: {
      description: '注釈とフィーチャを結ぶ引出線を作成します'
    },
    mleader: {
      description: 'マルチ引出線オブジェクトを作成します'
    },
    mleaderedit: {
      description: 'マルチ引出線に引出線を追加または削除します'
    },
    mleadereditremove: {
      description: 'マルチ引出線から引出線を削除します'
    },
    mline: {
      description:
        '複数の平行線を 1 つのマルチライン オブジェクトとして作成します'
    },
    move: {
      description: '選択したオブジェクトを変位ベクトルだけ移動します',
      prompt: 'オブジェクトを選択'
    },
    objectscale: {
      description:
        '選択した異尺度対応オブジェクトのサポートする注釈尺度を追加または削除します',
      prompt: '異尺度対応オブジェクトを選択'
    },
    offset: {
      description: '指定した距離に平行な曲線、ポリライン、円を作成します'
    },
    mtext: {
      description: 'マルチ テキスト オブジェクトを作成します'
    },
    open: {
      description: '既存の図面ファイルを開きます'
    },
    openprof: {
      description:
        'ファイルを開く各段階のタイミング プロファイルをコンソールに出力するかどうかをコントロールします'
    },
    openperf: {
      description:
        '直前に図面を開いたときのタイミングを示す[開くパフォーマンス]パレットを開きます'
    },
    orthomode: {
      description: 'カーソルの動きを水平または垂直方向に拘束します'
    },
    osmode: {
      description:
        'ビットコード値を使用して定常オブジェクト スナップ モードを設定します'
    },
    pan: {
      description: '表示方向や倍率を変更せずにビューを画面移動します'
    },
    paperbkcolor: {
      description: 'ペーパー空間 (レイアウト) の作図領域の背景色を設定します'
    },
    pdmode: {
      description: '点オブジェクトの表示方法をコントロールします'
    },
    pdsize: {
      description: '点オブジェクトの表示サイズを設定します'
    },
    pickbox: {
      description:
        'オブジェクトを選択するときに使用する選択ボックスのサイズ (ピクセル単位) を設定します'
    },
    pline: {
      description: '複数の点を指定してポリラインを作成します'
    },
    pngout: {
      description: 'PNG に書き出します'
    },
    point: {
      description: '点を作成します'
    },
    polaraddang: {
      description:
        '追加の極トラッキング角度をセミコロン区切りのリストとして保存します'
    },
    polarang: {
      description: '極トラッキングの極角度の増分を設定します'
    },
    polarmode: {
      description:
        '極トラッキングとオブジェクト スナップ トラッキングの設定をコントロールします'
    },
    polygon: {
      description:
        '中心と半径、または 1 本のエッジを指定して正多角形を作成します'
    },
    qnew: {
      description: '新しい図面を開始します'
    },
    close: {
      description: '現在の図面を閉じます'
    },
    ray: {
      description: '点から始まり無限に延びる放射線を作成します'
    },
    rectang: {
      description: '対角の 2 つのコーナーを指定して長方形を作成します'
    },
    regen: {
      description: '現在の図面を再描画します'
    },
    revcloud: {
      description: '雲マークを作成または修正します'
    },
    markuptext: {
      description: '文字マークアップ ラベルを配置します'
    },
    markupline: {
      description: '線分マークアップを作成します'
    },
    markuparrow: {
      description: '矢印マークアップを作成します'
    },
    markupcloud: {
      description: '雲マークのマークアップを作成します'
    },
    markuprect: {
      description: '長方形マークアップを作成します'
    },
    markupcircle: {
      description: '円マークアップを作成します'
    },
    markuphighlight: {
      description: 'ハイライト長方形マークアップを作成します'
    },
    markupcallout: {
      description:
        '吹き出しを作成します: 引出線の先端を指定し、テキスト ボックスを配置してから文字を入力します'
    },
    markupstamp: {
      description: 'スタンプまたはカスタム記号を配置します'
    },
    markupvis: {
      description: 'マークアップを表示または非表示にします'
    },
    clearmarkups: {
      description: '現在のレイアウトのすべてのマークアップをクリアします'
    },
    markupexport: {
      description: 'マークアップをサイドカー JSON ファイルに書き出します'
    },
    markupimport: {
      description: 'サイドカー JSON ファイルからマークアップを読み込みます'
    },
    markuppanel: {
      description: 'マークアップ パレットを開きます'
    },
    rotate: {
      description: '選択したオブジェクトを基点を中心に回転します',
      prompt: 'オブジェクトを選択'
    },
    select: {
      description: 'オブジェクトを選択します'
    },
    shortcutmenu: {
      description:
        '作図領域でショートカット メニューを使用できるかどうかをコントロールします'
    },
    sketch: {
      description: '一連のフリーハンドの線分を作成します'
    },
    spline: {
      description: '制御点を指定して滑らかなスプライン曲線を作成します'
    },
    textstyle: {
      description: '現在の文字スタイルの名前を設定します'
    },
    unitmode: {
      description:
        'LUNITS が建築単位または分数単位のときの座標の分数表示をコントロールします'
    },
    switchbg: {
      description: '作図領域の背景を白と黒で切り替えます'
    },
    readingmode: {
      description:
        '閲覧モードを切り替えます: 確認しやすいように白いキャンバスに黒い線で表示します'
    },
    unisolateobjects: {
      description:
        'HIDEOBJECTS で非表示にしたすべてのオブジェクトを再表示します'
    },
    undo: {
      description: '直前のデータベース編集操作を元に戻します',
      nothingToUndo: '元に戻す操作はありません。'
    },
    redo: {
      description: '元に戻した直前のデータベース編集操作をやり直します',
      nothingToRedo: 'やり直す操作はありません。'
    },
    xline: {
      description: '両方向に無限に延びる構築線を作成します'
    },
    zoom: {
      description: 'すべてのオブジェクトの最大範囲を表示するようにズームします'
    },
    view: {
      description:
        'ビュー管理を開いて、名前の付いたビューを作成、復元、削除します'
    },
    newview: {
      description:
        '現在の表示またはウィンドウから新しい名前の付いたビューを作成します'
    },
    viewrestore: {
      description: '名前を指定して名前の付いたビューを復元します'
    },
    ucs: {
      description: '現在のユーザ座標系の原点と方向を設定します'
    },
    ucsman: {
      description: '名前の付いた UCS 定義と UCS アイコンの設定を管理します'
    }
  },
  USER: {}
}

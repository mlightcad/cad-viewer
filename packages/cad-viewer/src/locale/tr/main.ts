export default {
  mainMenu: {
    new: 'Yeni Çizim',
    open: 'Çizim Aç',
    drawingUnits: 'Çizim Birimleri',
    exportMenu: 'Dışa Aktar',
    export: 'DXF\'e Dışa Aktar',
    exportHtml: 'HTML\'e Dışa Aktar',
    exportPdf: 'PDF\'e Dışa Aktar',
    exportSvg: 'SVG\'e Dışa Aktar',
    exportImage: 'Görüntüye Dışa Aktar'
  },
  ribbon: {
    tab: {
      home: 'Ana Sayfa',
      tools: 'Araçlar',
      hatchContext: 'Tarama',
      mtextEditorContext: 'Metin Düzenleyici'
    },
    hatch: {
      group: {
        boundary: 'Sınırlar',
        pattern: 'Desen',
        properties: 'Özellikler',
        options: 'Seçenekler',
        close: 'Kapat'
      },
      command: {
        pickPoints: 'Nokta Seç',
        selectObjects: 'Nesne Seç',
        close: 'Kapat'
      },
      field: {
        pattern: 'Desen',
        scale: 'Ölçek',
        angle: 'Açı',
        style: 'Stil',
        associative: 'İlişkisel',
        fillType: 'Dolgu Türü',
        fillColor: 'Renk',
        patternColor: 'Desen Rengi',
        gradient1Color: 'Geçiş Rengi 1',
        backgroundColor: 'Arka Plan Rengi',
        gradient2Color: 'Geçiş Rengi 2',
        opacity: 'Saydamlık',
        imageScale: 'Görüntü Ölçeği'
      },
      style: {
        normal: 'Normal',
        outer: 'Dış',
        ignore: 'Yoksay'
      },
      fillType: {
        solid: 'Düz',
        pattern: 'Desen',
        gradient: 'Geçiş'
      },
      associative: {
        on: 'Açık',
        off: 'Kapalı'
      },
      tooltip: {
        pickPoints: 'Tarama bölgeleri oluşturmak için iç noktalar seçin.',
        selectObjects: 'Taranacak kapalı sınır nesnelerini seçin.',
        pattern: 'Tarama deseni adını seçin.',
        scale: 'Tarama deseni ölçeğini ayarlayın.',
        angle: 'Tarama deseni açısını derece cinsinden ayarlayın.',
        style: 'Tarama oluşturma için ada tespit stilini kontrol edin.',
        associative: 'İlişkisel tarama modunu aç/kapat.',
        fillType: 'Dolgu türünü seçin: düz, desen veya geçiş.',
        fillColor: 'Dolgu rengini seçin.',
        patternColor: 'Desen çizgi rengini seçin.',
        gradient1Color: 'İlk geçiş rengini seçin.',
        backgroundColor: 'Desen dolgusu için arka plan rengini seçin.',
        gradient2Color: 'İkinci geçiş rengini seçin.',
        opacity: 'Tarama saydamlığını ayarlayın (0-90).',
        imageScale: 'Dolgu görüntüsü ölçeğini ayarlayın.',
        close: 'Tarama oluşturmadan çıkın ve bu bağlamsal sekmeyi kapatın.'
      }
    },
    mtext: {
      group: {
        textStyle: 'Metin Stili',
        format: 'Biçim',
        paragraph: 'Paragraf',
        insert: 'Ekle',
        close: 'Kapat'
      },
      field: {
        textStyle: 'Metin Stili',
        font: 'Yazı Tipi',
        color: 'Renk',
        height: 'Yükseklik',
        obliqueAngle: 'Eğim açısı',
        tracking: 'Karakter Aralığı',
        widthFactor: 'Genişlik faktörü'
      },
      characterMap: {
        title: 'Karakter Eşlemi',
        font: 'Yazı Tipi(F):',
        charsToCopy: 'Kopyalanacak karakterler(A):',
        select: 'Seç(S)',
        copy: 'Kopyala(C)',
        noGlyphs: 'Bu yazı tipi için kullanılabilir karakter yok.',
        copyFailed: 'Panoya kopyalanamadı.'
      },
      command: {
        bold: 'Kalın',
        underline: 'Altı Çizili',
        superscript: 'Üst Simge',
        italic: 'İtalik',
        overline: 'Üstü Çizili',
        subscript: 'Alt Simge',
        strikethrough: 'Üstü Çizili (Silme)',
        stack: 'Yığın',
        toggleCase: 'Büyük/Küçük Harf',
        attachment: 'Hizalama',
        list: 'Madde İşaretleri ve Numaralandırma',
        lineSpacing: 'Satır Aralığı',
        paragraphAlignment: 'Paragraf Hizalaması',
        symbol: 'Sembol',
        close: 'Kapat'
      },
      tooltip: {
        textStyle: 'Geçerli çizimden bir metin stili seçin.',
        bold: 'Kalın biçimlendirmeyi aç/kapat.',
        underline: 'Altı çizili biçimlendirmeyi aç/kapat.',
        superscript: 'Üst simge biçimlendirmeyi aç/kapat.',
        italic: 'İtalik biçimlendirmeyi aç/kapat.',
        overline: 'Üstü çizili biçimlendirmeyi aç/kapat.',
        subscript: 'Alt simge biçimlendirmeyi aç/kapat.',
        strikethrough: 'Üstü çizili (silme) biçimlendirmeyi aç/kapat.',
        stack: 'Seçili kesir metnini yığınla veya ayır.',
        toggleCase: 'Seçili metni büyük ve küçük harf arasında değiştirin.',
        font: 'Geçerli metin yazı tipini ayarlayın.',
        color: 'Geçerli metin rengini ayarlayın.',
        height:
          'Geçerli metin yüksekliğini ayarlayın. Özel değerlere izin verilir.',
        obliqueAngle:
          'Seçili karakterler için eğim açısını derece cinsinden ayarlayın (negatif değer diğer yöne eğer).',
        tracking:
          'Seçili karakterler arasındaki boşluğu artırın veya azaltın (varsayılan 1\'dir).',
        widthFactor:
          'Seçili karakterleri yatay olarak genişletin veya sıkıştırın (varsayılan 1\'dir).',
        attachment: 'Çok satırlı metin bağlantı noktasını ayarlayın.',
        list: 'Madde işaretleri ve numaralandırma ekleyin veya yapılandırın.',
        lineSpacing: 'Satır aralığını ayarlayın.',
        paragraphAlignment: 'Paragraf yatay hizalamasını ayarlayın.',
        symbol: 'Ortak bir çizim sembolü ekleyin.',
        close: 'Metin düzenleyicisini ve bu bağlamsal sekmeyi kapatın.'
      },
      attachment: {
        TL: 'Sol Üst TL',
        TC: 'Orta Üst TC',
        TR: 'Sağ Üst TR',
        ML: 'Sol Orta ML',
        MC: 'Orta Orta MC',
        MR: 'Sağ Orta MR',
        BL: 'Sol Alt BL',
        BC: 'Orta Alt BC',
        BR: 'Sağ Alt BR'
      },
      list: {
        off: 'Kapalı',
        number: 'Numaralı',
        letter: 'Harfli',
        bullet: 'Madde İşaretli',
        start: 'Başlat',
        continue: 'Devam Et',
        auto: 'Otomatik Madde İşareti ve Numaralandırmaya İzin Ver',
        allowList: 'Madde İşaretleri ve Listelere İzin Ver'
      },
      lineSpacing: {
        more: 'Daha Fazla...',
        clear: 'Paragraf Aralığını Temizle'
      },
      paragraphAlign: {
        default: 'Varsayılan',
        left: 'Sol',
        center: 'Orta',
        right: 'Sağ',
        justified: 'İki Yana Yaslı',
        distributed: 'Dağıtılmış'
      },
      symbol: {
        degree: 'Derece  %%d',
        plusMinus: 'Artı/Eksi  %%p',
        diameter: 'Çap  %%c',
        almostEqual: 'Yaklaşık Eşit  \\U+2248',
        angle: 'Açı  \\U+2220',
        boundary: 'Sınır Çizgisi  \\U+E100',
        centerLine: 'Merkez Çizgisi  \\U+2104',
        delta: 'Delta  \\U+0394',
        electricalPhase: 'Elektrik Fazı  \\U+0278',
        flowLine: 'Akış Çizgisi  \\U+E101',
        identical: 'Özdeş  \\U+2261',
        notEqual: 'Eşit Değil  \\U+2260',
        ohm: 'Ohm  \\U+2126',
        omega: 'Omega  \\U+03A9',
        propertyLine: 'Mülkiyet Sınırı  \\U+214A',
        subscriptTwo: 'Alt Simge 2  \\U+2082',
        squared: 'Kare  \\U+00B2',
        cubed: 'Küp  \\U+00B3',
        nbsp: 'Bölünemez Boşluk Ctrl+Shift+Space',
        other: 'Diğer...'
      }
    },
    group: {
      draw: 'Çiz',
      modify: 'Düzenle',
      layer: 'Katman',
      properties: 'Özellikler',
      utilities: 'Yardımcı Araçlar',
      annotation: 'Açıklama',
      measurement: 'Ölçüm'
    },
    property: {
      color: 'Renk',
      lineType: 'Çizgi Tipi',
      lineWeight: 'Çizgi Kalınlığı'
    },
    layerTools: {
      select: 'Katman',
      off: 'Katmanı Kapat',
      isolate: 'İzole Et',
      freeze: 'Katmanı Dondur',
      lock: 'Katmanı Kilitle',
      current: 'Geçerli Yap',
      allOn: 'Katmanı Aç',
      unisolate: 'İzolasyonu Kaldır',
      thaw: 'Katmanı Çöz',
      unlock: 'Katman Kilidini Aç',
      restore: 'Katmanı Geri Yükle'
    },
    arc: {
      threePoint: '3 Nokta',
      startCenterEnd: 'Başlangıç, Merkez, Bitiş',
      startCenterAngle: 'Başlangıç, Merkez, Açı',
      startCenterLength: 'Başlangıç, Merkez, Uzunluk',
      startEndAngle: 'Başlangıç, Bitiş, Açı',
      startEndDirection: 'Başlangıç, Bitiş, Yön',
      startEndRadius: 'Başlangıç, Bitiş, Yarıçap',
      centerStartEnd: 'Merkez, Başlangıç, Bitiş',
      centerStartAngle: 'Merkez, Başlangıç, Açı',
      centerStartLength: 'Merkez, Başlangıç, Uzunluk'
    },
    circle: {
      centerRadius: 'Merkez, Yarıçap',
      centerDiameter: 'Merkez, Çap',
      twoPoint: '2 Nokta',
      threePoint: '3 Nokta',
      tanTanRadius: 'Teğet, Teğet, Yarıçap',
      tanTanTan: 'Teğet, Teğet, Teğet'
    },
    ellipse: {
      ellipse: 'Elips',
      arc: 'Eliptik Yay'
    },
    tooltip: {
      line: 'Tek bir düz çizgi parçası çizin.',
      polyline:
        'Bağlı bir dizi çizgi veya yay parçasını tek bir nesne olarak çizin.',
      spline:
        'Uyum veya kontrol noktaları üzerinden düzgün bir spline eğrisi çizin.',
      circle: 'Birden fazla oluşturma yöntemiyle bir daire çizin.',
      arc: 'Birden fazla oluşturma yöntemiyle bir yay çizin.',
      mline:
        'Birden fazla paralel çizgiyi tek bir çoklu çizgi nesnesi olarak çizin.',
      ray: 'Bir başlangıç noktasından yarı sonsuz bir yardımcı ışın çizin.',
      xline: 'Sonsuz bir yardımcı çizgi çizin.',
      ellipse: 'Bir elips veya eliptik yay çizin.',
      rect: 'Bir dikdörtgen veya düzgün çokgen çizin.',
      point: 'Çizime bir nokta nesnesi yerleştirin.',
      hatch: 'Kapalı bir alanı tarama deseniyle doldurun.',
      text: 'Çizimde çok satırlı metin açıklamaları oluşturun.',
      move: 'Seçili nesneleri yeni bir konuma taşıyın.',
      rotate: 'Seçili nesneleri bir taban noktası etrafında döndürün.',
      copy: 'Seçili nesneleri yeni bir konuma kopyalayın.',
      erase: 'Seçili nesneleri çizimden silin.',
      offset:
        'Bir nesnenin belirtilen mesafede paralel bir kopyasını oluşturun.',
      undo: 'Son düzenleme işlemini geri alın.',
      redo: 'Son geri alınan düzenleme işlemini yineleyin.',
      properties: 'Geçerli seçim için Özellikler panelini açın.',
      quickSelect:
        'Ölçütlere göre varlıkları filtrelemek ve seçmek için Hızlı Seçimi açın.',
      countList: 'Blok sayılarını görüntülemek ve yönetmek için Sayım paletini açın.',
      missingResources:
        'Yazı tipleri, görseller ve xref’ler için Eksik / Harici Kaynaklar paletini açın.',
      drawingUnits:
        'Koordinat biçimlerini, hassasiyeti ve ekleme ölçeğini ayarlamak için Çizim Birimlerini açın.',
      agent:
        'Doğal dil kullanarak geometri çizmek için CAD Ajanı panel sekmesini açın.',
      propertyColor:
        'Yeni oluşturulan nesneler veya seçili varlıklar için rengi ayarlayın.',
      propertyLineType:
        'Yeni oluşturulan nesneler veya seçili varlıklar için çizgi tipini ayarlayın.',
      propertyLineWeight:
        'Yeni oluşturulan nesneler veya seçili varlıklar için çizgi kalınlığını ayarlayın.',
      layerAction: {
        off: 'Seçili katmanı kapatarak katmanı dondurmadan nesnelerini gizler.',
        isolate:
          'Yalnızca seçili katmanı gösterir ve diğerlerini gizleyerek ilgili nesnelere odaklanmanızı sağlar.',
        freeze:
          'Seçili katmanı dondurarak nesnelerini gizler ve yeniden oluşturma sırasında atlanmasını sağlar.',
        lock: 'Seçili katmanı kilitleyerek nesnelerinin görünür kalmasını ancak düzenlenememesini sağlar.',
        current:
          'Seçili katmanı geçerli yaparak yeni nesnelerin o katmanda oluşturulmasını sağlar.',
        allOn:
          'Şu anda kapalı olan tüm katmanları açar. Donmuş katmanlar donmuş kalır.',
        unisolate:
          'Katman İzole tarafından gizlenen veya kilitlenen katmanları, sonraki katman değişikliklerini koruyarak geri yükler.',
        thaw: 'Seçili katmanı çözerek nesnelerinin tekrar görünür ve yeniden oluşturmaya dahil olmasını sağlar.',
        unlock:
          'Seçili katmanın kilidini açarak nesnelerinin tekrar seçilip değiştirilebilmesini sağlar.',
        restore:
          'Bu şeritteki en son katman işleminden önceki katman durumunu geri yükler.'
      },
      circleOption: {
        centerRadius: 'Bir merkez nokta ve yarıçap belirterek daire oluşturun.',
        centerDiameter: 'Bir merkez nokta ve çap belirterek daire oluşturun.',
        twoPoint: 'Çapı iki nokta ile tanımlanan bir daire oluşturun.',
        threePoint: 'Üç noktadan geçen bir daire oluşturun.',
        tanTanRadius:
          'Belirtilen yarıçapla iki nesneye teğet bir daire oluşturun.',
        tanTanTan: 'Üç nesneye teğet bir daire oluşturun.'
      },
      arcOption: {
        threePoint:
          'Bir başlangıç noktası, ikinci bir nokta ve bir bitiş noktasından geçen bir yay oluşturun.',
        startCenterEnd:
          'Bir başlangıç noktası, merkez nokta ve bitiş noktası belirterek yay oluşturun.',
        startCenterAngle:
          'Bir başlangıç noktası, merkez nokta ve dahili açı kullanarak yay oluşturun.',
        startCenterLength:
          'Bir başlangıç noktası, merkez nokta ve yay uzunluğu kullanarak yay oluşturun.',
        startEndAngle:
          'Dahili açıyla başlangıç ve bitiş noktalarından yay oluşturun.',
        startEndDirection:
          'Başlangıç noktasında teğet yönle başlangıç ve bitiş noktalarından yay oluşturun.',
        startEndRadius:
          'Belirtilen yarıçapla başlangıç ve bitiş noktalarından yay oluşturun.',
        centerStartEnd:
          'Bir merkez nokta, başlangıç noktası ve bitiş noktası belirterek yay oluşturun.',
        centerStartAngle:
          'Bir merkez nokta, başlangıç noktası ve dahili açı belirterek yay oluşturun.',
        centerStartLength:
          'Bir merkez nokta, başlangıç noktası ve yay uzunluğu belirterek yay oluşturun.'
      },
      rectOption: {
        rectangle:
          'Karşılıklı köşeler veya boyutlar belirterek dikdörtgen oluşturun.',
        polygon:
          'Kenar sayısı ve oluşturma yöntemi belirterek düzgün çokgen oluşturun.'
      },
      ellipseOption: {
        ellipse: 'Büyük ve küçük eksenleri belirterek tam bir elips oluşturun.',
        arc: 'Elips eksenlerini ve yay sınırlarını belirterek eliptik yay oluşturun.'
      }
    },
    command: {
      line: 'Çizgi',
      polyline: 'Çoklu Çizgi',
      circle: 'Daire',
      arc: 'Yay',
      mline: 'Çoklu Çizgi (MLine)',
      ray: 'Işın',
      xline: 'Sonsuz Çizgi',
      ellipse: 'Elips',
      spline: 'Spline',
      rect: 'Dikdörtgen',
      rectangle: 'Dikdörtgen',
      polygon: 'Çokgen',
      point: 'Nokta',
      divide: 'Böl',
      hatch: 'Tarama',
      text: 'Metin',
      gradient: 'Geçiş',
      move: 'Taşı',
      rotate: 'Döndür',
      copy: 'Kopyala',
      erase: 'Sil',
      offset: 'Ötele',
      undo: 'Geri Al',
      redo: 'Yinele',
      properties: 'Özellikler',
      quickSelect: 'Hızlı\nSeçim',
      countList: 'Sayım',
      drawingUnits: 'Çizim\nBirimleri',
      agent: 'CAD\nAjanı'
    }
  },
  verticalToolbar: {
    measure: {
      text: 'Ölç',
      description: 'Ölçüm araçları'
    },
    measureDistance: {
      text: 'Mesafe',
      description: 'İki nokta arasındaki mesafeyi ölçer'
    },
    measureAngle: {
      text: 'Açı',
      description: 'Ortak bir köşeyi paylaşan iki çizgi arasındaki açıyı ölçer'
    },
    measureArea: {
      text: 'Alan',
      description: 'Bir çokgenin alanını ölçer'
    },
    measureArc: {
      text: 'Yay',
      description: 'Üç nokta ile tanımlanan bir yayın uzunluğunu ölçer'
    },
    clearMeasurements: {
      text: 'Temizle',
      description: 'Görünümden tüm etkin ölçümleri kaldırır'
    },
    annotation: {
      text: 'Açıklama',
      description:
        'Çizim içeriğini açıklamak ve işaretlemek için metin veya grafik açıklamalar oluşturur'
    },
    hideAnnotation: {
      text: 'Gizle',
      description: 'Açıklamaları gizler'
    },
    layer: {
      text: 'Katman',
      description: 'Katmanları yönetir'
    },
    pan: {
      text: 'Kaydır',
      description:
        'Görüntüleme yönünü veya büyütmeyi değiştirmeden görünümü kaydırır'
    },
    revCircle: {
      text: 'Daire',
      description:
        'Çizimde alanları vurgulamak ve açıklamak için daireler kullanır'
    },
    revLine: {
      text: 'Çizgi',
      description:
        'Çizimdeki nesneleri veya alanları açıklamak ve göstermek için düz çizgiler kullanır'
    },
    revFreehand: {
      text: 'Serbest El',
      description:
        'Çizim içeriğini serbestçe açıklamak ve vurgulamak için serbest el çizimleri kullanır'
    },
    revRect: {
      text: 'Dikdörtgen',
      description:
        'Çizimdeki nesneleri veya alanları vurgulamak ve açıklamak için dikdörtgenler kullanın'
    },
    revCloud: {
      text: 'Bulut Revizyon',
      description:
        'Çizimdeki alanları bulut şeklinde bir çerçeveyle vurgulamak için kullanılır'
    },
    select: {
      text: 'Seç',
      description: 'Varlıkları seçer'
    },
    showAnnotation: {
      text: 'Göster',
      description: 'Açıklamaları gösterir'
    },
    switchBg: {
      text: 'Değiştir',
      description: 'Çizim arka planını beyaz ve siyah arasında değiştirir'
    },
    zoomToExtent: {
      text: 'Tümünü Yakınlaştır',
      description:
        'Tüm varlıkların maksimum sınırlarını görüntülemek için yakınlaştırır'
    },
    zoomToBox: {
      text: 'Pencereyi Yakınlaştır',
      description:
        'Dikdörtgen bir pencereyle belirtilen alanı görüntülemek için yakınlaştırır'
    }
  },
  statusBar: {
    setting: {
      tooltip: 'Görüntü Ayarları',
      commandLine: 'Komut Satırı',
      coordinate: 'Koordinat',
      entityInfo: 'Varlık Bilgisi',
      fileName: 'Dosya Adı',
      languageSelector: 'Dil Seçici',
      mainMenu: 'Ana Menü',
      toolbar: 'Araç Çubuğu',
      stats: 'İstatistikler'
    },
    osnap: {
      tooltip: 'Nesne Yakalama',
      endpoint: 'Uç Nokta',
      midpoint: 'Orta Nokta',
      center: 'Merkez',
      node: 'Düğüm',
      quadrant: 'Çeyrek',
      insertion: 'Ekleme',
      nearest: 'En Yakın'
    },
    pointStyle: {
      tooltip: 'Nokta stilini değiştir'
    },
    fullScreen: {
      on: 'Tam ekran modunu kapat',
      off: 'Tam ekran modunu aç'
    },
    dynamicInput: {
      on: 'Dinamik girişi kapat',
      off: 'Dinamik girişi aç'
    },
    lineWidth: {
      on: 'Çizgi genişliklerini gizle',
      off: 'Çizgi genişliklerini göster'
    },
    orthoMode: {
      on: 'Ortogonal modu kapat',
      off: 'Ortogonal modu aç'
    },
    polarTracking: {
      on: 'Kutupsal izlemeyi kapat',
      off: 'Kutupsal izlemeyi aç'
    },
    theme: {
      dark: 'Açık temaya geç',
      light: 'Koyu temaya geç'
    },
    warning: {
      font: 'Aşağıdaki yazı tipleri bulunamadı!'
    },
    notification: {
      tooltip: 'Bildirimleri göster'
    },
    export: {
      tooltip: 'Görüntüyü PNG olarak dışa aktar'
    }
  },
  toolPalette: {
    moreTabs: 'Diğer sekmeler',
    entityProperties: {
      tab: 'Özellikler',
      title: 'Varlık Özellikleri',
      propertyPanel: {
        noEntitySelected: 'Hiçbir varlık seçilmedi!',
        multipleEntitySelected: '{count} varlık seçildi',
        propValCopied: 'Özellik değeri kopyalandı',
        failedToCopyPropVal: 'Özellik değeri kopyalanamadı!'
      }
    },
    layerManager: {
      tab: 'Katmanlar',
      title: 'Katman Yöneticisi',
      currentLayerLabel: 'Geçerli katman: {name}',
      searchPlaceholder: 'Katman ara',
      filters: 'Filtreler',
      collapseFilters: 'Filtreleri daralt',
      expandFilters: 'Filtreleri genişlet',
      filterAll: 'Tümü',
      filterAllUsed: 'Kullanılan Tüm Katmanlar',
      toolbar: {
        showFilters: 'Katman Filtreleri',
        newFilter: 'Yeni Filtre',
        newFilterGroup: 'Yeni Grup Filtresi',
        newLayer: 'Yeni Katman',
        deleteLayer: 'Katmanı Sil',
        setCurrent: 'Geçerli Yap'
      },
      prompts: {
        newFilterTitle: 'Yeni Filtre',
        newFilterName: 'Filtre adını girin',
        newFilterGroupTitle: 'Yeni Grup Filtresi',
        newFilterGroupName: 'Grup filtresi adını girin',
        newLayerTitle: 'Yeni Katman',
        newLayerName: 'Katman adını girin',
        confirm: 'Tamam',
        cancel: 'İptal'
      },
      messages: {
        filterCreated: '"{name}" filtresi oluşturuldu',
        filterExists: '"{name}" adlı filtre zaten var',
        filterCreateFailed: 'Filtre oluşturulamadı',
        layerCreated: '"{name}" katmanı oluşturuldu',
        layerExists: '"{name}" katmanı zaten var',
        layerCreateFailed: 'Katman oluşturulamadı',
        layerDeleted: '"{name}" katmanı silindi',
        layerDeleteFailed: '"{name}" katmanı silinemedi',
        cannotDeleteLayer0: '"0" katmanı silinemez',
        cannotDeleteCurrent: 'Geçerli katman silinemez',
        selectLayerFirst: 'Önce bir katman seçin',
        setCurrentSuccess: 'Geçerli katman "{name}" olarak ayarlandı',
        setCurrentFailed: 'Geçerli katman ayarlanamadı'
      },
      layerList: {
        name: 'Ad',
        on: 'Açık',
        color: 'Renk',
        currentLayer: 'Geçerli katman',
        zoomToLayer: 'Tıklanan "{layer}" katmanına yakınlaştırıldı'
      }
    },
    countList: {
      tab: 'Sayım',
      title: 'Sayım',
      searchPlaceholder: 'Blok adı ara',
      countInArea: 'Alanda say',
      areaSet: 'Sayım alanı güncellendi',
      areaCleared: 'Tüm model alanı sayılıyor',
      blockName: 'Blok',
      count: 'Adet',
      empty: 'Görünür blok bulunamadı',
      prompt: {
        firstCorner:
          'Sayım alanının ilk köşesini belirtin veya [Entire]: ',
        secondCorner: 'Karşı köşeyi belirtin: '
      }
    },
    missingResources: {
      tab: 'Kaynaklar',
      title: 'Eksik / Harici Kaynaklar',
      fontTab: 'Yazı tipi',
      imageTab: 'Görsel',
      xrefTab: 'Harici Referanslar',
      attach: 'Ekle',
      attachDwg: 'DWG/DXF ekle...',
      attachImage: 'Görüntü ekle...',
      attachImageFailed: '"{name}" görüntüsü eklenemedi',
      fileReferences: 'Dosya Referansları',
      details: 'Ayrıntılar',
      foundAt: 'Bulunduğu yer',
      selectReference: 'Ayrıntıları görmek için bir referans seçin',
      expandDetails: 'Ayrıntıları genişlet',
      collapseDetails: 'Ayrıntıları daralt',
      apply: 'Uygula',
      applyDone: 'Değiştirmeler uygulandı',
      emptyFonts: 'Eksik yazı tipi yok',
      emptyImages: 'Eksik görsel yok',
      matchFontType: 'Yazı tipi türünü eşleştir (SHX / mesh)',
      missedFont: 'Eksik yazı tipi',
      replacedFont: 'Yerine kullanılan yazı tipi',
      selectFont: 'Yerine kullanılacak yazı tipini seçin',
      selectLocalFont: 'Yerel yazı tipi dosyası seçin',
      file: 'Dosya',
      replace: 'Değiştir',
      name: 'Ad',
      path: 'Kayıtlı yol',
      type: 'Tür',
      typeAttach: 'Ekle',
      typeOverlay: 'Kaplama',
      typeImage: 'Görüntü',
      status: 'Durum',
      statusMissing: 'Eksik',
      statusLoaded: 'Yüklendi',
      actions: 'İşlemler',
      visible: 'Görünür',
      browse: 'Gözat…',
      fromUrl: 'URL…',
      unload: 'Kaldır',
      load: 'Yükle',
      empty: 'Bu çizimde harici referans veya görüntü yok',
      urlPrompt: 'DWG veya DXF dosyasının URL’sini girin',
      urlRequired: 'Lütfen bir URL girin',
      loadFailed: '"{name}" referansı yüklenemedi'
    },
    memoryProfile: {
      tab: 'Bellek',
      title: 'Bellek Profili',
      refresh: 'Yenile',
      collecting: 'Bellek analiz ediliyor ...',
      showPie: 'Özet grafiği göster',
      hidePie: 'Özet grafiği gizle',
      collectedAt: 'Toplama zamanı {time}',
      heapUsed: 'JS yığını {used} / {total}',
      estimateNote:
        'Geometri boyutları tampon byteLength değerinden gelir. Diğer kategoriler tahmindir.',
      estimated: 'tah.',
      pieTotal: 'Hesaplanan',
      pieAriaLabel: 'Kategoriye göre bellek dağılımı',
      empty: 'Veri yok',
      missedFonts: 'Eksik yazı tipleri',
      fontMemory: 'Yazı tipi / mtext belleği',
      fontMemorySummary: 'Bellek {live} (ana {main} · worker {workers})',
      fontStorage: 'IndexedDB depolama (belleğe dahil değil)',
      fontStorageSummary: '{count} önbellek yazı tipi · {size}',
      materialPoint: 'Nokta',
      materialLine: 'Çizgi',
      materialFill: 'Dolgu',
      materialTotal: 'Toplam',
      dataModelCounts: '{entities} varlık · {objects} nesne · {total}',
      dataModelCategories: 'Kategoriye göre',
      dataModelEntityTypes: 'Varlık türüne göre',
      categories: {
        heap: 'JS Yığını',
        geometry: 'Geometri',
        mapping: 'Eşleme',
        spatial: 'Uzamsal Dizin',
        dataModel: 'Veri Modeli',
        materials: 'Malzemeler',
        fonts: 'Yazı Tipleri'
      },
      tabs: {
        geometry: 'Geometri',
        spatial: 'Uzamsal',
        dataModel: 'Veri Modeli',
        materials: 'Malzemeler',
        fonts: 'Yazı Tipleri'
      },
      columns: {
        layout: 'Düzen',
        layer: 'Katman',
        geometry: 'Geometri',
        mapping: 'Eşleme',
        entities: 'Varlıklar',
        rootItems: 'Kök',
        childItems: 'Alt',
        estimated: 'Tah. boyut',
        type: 'Tür',
        count: 'Adet',
        category: 'Kategori',
        font: 'Yazı tipi'
      }
    }
  },
  colorDropdown: {
    custom: 'Özel'
  },
  lineTypeSelect: {
    placeholder: 'Çizgi Tipi'
  },
  colorIndexPicker: {
    color: 'Renk: ',
    colorIndex: 'Renk İndeksi: ',
    inputPlaceholder: '0-256, BYLAYER, BYBLOCK',
    rgb: 'RGB: '
  },
  entityInfo: {
    color: 'Renk',
    layer: 'Katman',
    lineType: 'Çizgi Tipi'
  },
  ribbonProperty: {
    color: 'Renk',
    lineType: 'Çizgi Tipi',
    lineWeight: 'Çizgi Kalınlığı',
    layer: 'Katman'
  },
  layerSelect: {
    searchPlaceholder: 'Katman adı ara',
    noLayerAvailable: 'Kullanılabilir katman yok',
    noMatchedLayer: 'Eşleşen katman yok',
    tooltip: {
      layer: 'Katman',
      visibility: 'Görünürlük',
      freeze: 'Dondur',
      lock: 'Kilitle',
      lineType: 'Çizgi Tipi',
      color: 'Renk',
      visible: 'Görünür',
      hidden: 'Gizli',
      frozen: 'Donmuş',
      thawed: 'Çözülmüş',
      locked: 'Kilitli',
      unlocked: 'Kilidi Açık'
    }
  },
  message: {
    loadingFonts: 'Yazı tipleri yükleniyor ...',
    loadingDwgConverter: 'DWG dönüştürücü yükleniyor...',
    fontsNotFound: '{fonts} yazı tipleri yazı tipi deposunda bulunamıyor!',
    fontsNotLoaded: '{fonts} yazı tipleri yüklenemiyor!',
    fontMissedInDrawing:
      '"{font}" yazı tipi {count} metin nesnesi tarafından gerekli ancak kullanılamıyor. "{replacementFont}" ile gösteriliyor.',
    fontMissedReplacement: '"{font}" ("{replacement}" ile gösteriliyor)',
    fontCached: '"{font}" yazı tipi başarıyla önbelleğe alındı.',
    fontCacheFailed: '"{fileName}" yazı tipi önbelleğe alınamadı.',
    failedToGetAvaiableFonts:
      '"{url}" adresinden kullanılabilir yazı tipleri alınamadı!',
    failedToOpenFile: '"{fileName}" dosyası açılamadı!',
    failedToOpenFileWorkerOom:
      '"{fileName}" açılamadı. Çizim mevcut bellek için çok büyük.',
    failedToOpenFileWorkerTimeout:
      '"{fileName}" açılamadı. Çizim ayrıştırılırken işlem zaman aşımına uğradı.',
    failedToOpenFileFontLoadFailed:
      '"{fileName}" açılamadı. Gerekli yazı tipleri yüklenemedi.',
    fetchingDrawingFile: 'Dosya alınıyor ...',
    unknownEntities:
      'Bu çizim {count} bilinmeyen veya desteklenmeyen varlık içeriyor! Bu varlıklar gösterilmeyecek.'
  },
  notification: {
    center: {
      title: 'Bildirimler',
      clearAll: 'Tümünü Temizle',
      noNotifications: 'Bildirim yok'
    },
    time: {
      justNow: 'Az önce',
      minutesAgo: '{count} dakika önce | {count} dakika önce',
      hoursAgo: '{count} saat önce | {count} saat önce',
      daysAgo: '{count} gün önce | {count} gün önce'
    },
    title: {
      failedToOpenFile: 'Dosya Açılamadı',
      failedToOpenFileWorkerOom: 'Çizim Çok Büyük',
      failedToOpenFileWorkerTimeout: 'Açma Zaman Aşımı',
      failedToOpenFileFontLoadFailed: 'Yazı Tipi Yüklenemedi',
      fontNotFound: 'Yazı Tipi Bulunamadı',
      fontNotLoaded: 'Yazı Tipi Yüklenemedi',
      parsingWarning: 'Çizim Ayrıştırma Sorunları'
    }
  }
}

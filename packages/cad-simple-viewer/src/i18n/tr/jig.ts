export default {
  arc: {
    startPointOrCenter: 'Yayın başlangıç noktasını belirtin veya',
    secondPointOrOptions: 'Yayın ikinci noktasını belirtin veya',
    secondPoint: 'Yayın ikinci noktasını belirtin',
    startPoint: 'Yayın başlangıç noktasını belirtin',
    centerPoint: 'Yayın merkez noktasını belirtin',
    endPoint: 'Yayın bitiş noktasını belirtin',
    endPointOrOptions: 'Yayın bitiş noktasını belirtin veya',
    centerPointOrOptions: 'Yayın merkez noktasını belirtin',
    includedAngle: 'İç açıyı belirtin',
    chordLength: 'Kiriş uzunluğunu belirtin',
    tangentDirection: 'Yayın başlangıç noktası için teğet yönünü belirtin',
    radius: 'Yayın yarıçapını belirtin',
    keywords: {
      center: {
        display: 'Merkez(M)',
        local: 'Merkez',
        global: 'Center'
      },
      end: {
        display: 'Bitiş(B)',
        local: 'Bitiş',
        global: 'End'
      },
      angle: {
        display: 'Açı(A)',
        local: 'Açı',
        global: 'Angle'
      },
      chordLength: {
        display: 'kiriş Uzunluğu(U)',
        local: 'Kiriş Uzunluğu',
        global: 'ChordLength'
      },
      direction: {
        display: 'Yön(Y)',
        local: 'Yön',
        global: 'Direction'
      },
      radius: {
        display: 'Yarıçap(R)',
        local: 'Yarıçap',
        global: 'Radius'
      }
    },
    invalid: {
      threePoint:
        'Geçersiz 3 noktalı yay: noktalar aynı doğru üzerinde veya bir yay tanımlayamıyor.',
      center:
        'Geçersiz merkez girişi: başlangıç ve bitiş noktaları aynı çember üzerinde olmalıdır.',
      angle:
        'Geçersiz açı girişi: iç açı 0 dereceden büyük ve 360 dereceden küçük olmalıdır.',
      chordLength:
        'Geçersiz kiriş uzunluğu: değer mevcut yarıçap için geçerli aralığın dışında.',
      direction: 'Geçersiz yön: bu teğet yönünden bir yay oluşturulamıyor.',
      radius:
        'Geçersiz yarıçap: belirtilen yarıçap başlangıç ve bitiş noktalarını birleştiremiyor.'
    }
  },
  circle: {
    center: 'Çemberin merkezini belirtin',
    centerOrOptions: 'Çemberin merkez noktasını belirtin veya',
    radius: 'Çemberin yarıçapını belirtin',
    radiusOrDiameter: 'Çemberin yarıçapını belirtin veya',
    diameter: 'Çemberin çapını belirtin',
    twoPointFirst: 'Çember çapının ilk uç noktasını belirtin',
    twoPointSecond: 'Çember çapının ikinci uç noktasını belirtin',
    threePointFirst: 'Çember üzerindeki ilk noktayı belirtin',
    threePointSecond: 'Çember üzerindeki ikinci noktayı belirtin',
    threePointThird: 'Çember üzerindeki üçüncü noktayı belirtin',
    keywords: {
      threeP: {
        display: '3N(3N)',
        local: '3N',
        global: '3P'
      },
      twoP: {
        display: '2N(2N)',
        local: '2N',
        global: '2P'
      },
      diameter: {
        display: 'Çap(Ç)',
        local: 'Çap',
        global: 'Diameter'
      }
    }
  },
  copy: {
    basePointOrOptions: 'Temel noktayı belirtin veya',
    displacementOrArray: 'Yer değiştirmeyi belirtin veya',
    secondPointOrArray: 'İkinci noktayı belirtin veya',
    modePrompt: 'Kopyalama modu seçeneğini girin',
    arrayItemCount: 'Orijinal dahil dizideki öğe sayısını girin',
    arraySecondPointOrFit: 'İkinci noktayı belirtin veya',
    arrayFitSecondPoint: 'İkinci noktayı belirtin',
    keywords: {
      displacement: {
        display: 'Yer değiştirme(Y)',
        local: 'Yer değiştirme',
        global: 'Displacement'
      },
      mode: {
        display: 'Mod(O)',
        local: 'Mod',
        global: 'Mode'
      },
      multiple: {
        display: 'Çoklu(Ç)',
        local: 'Çoklu',
        global: 'Multiple'
      },
      single: {
        display: 'Tekli(T)',
        local: 'Tekli',
        global: 'Single'
      },
      array: {
        display: 'Dizi(D)',
        local: 'Dizi',
        global: 'Array'
      },
      fit: {
        display: 'Uydur(U)',
        local: 'Uydur',
        global: 'Fit'
      }
    }
  },
  copybase: {
    basePoint: 'Taban noktasını belirtin'
  },
  pasteclip: {
    insertionPoint: 'Ekleme noktasını belirtin',
    empty: 'Panoda çizim nesnesi yok'
  },
  pasteorig: {
    sameDrawing: 'PASTEORIG, nesnelerin kopyalandığı çizime yapıştıramaz'
  },
  pasteblock: {
    insertionPoint: 'Ekleme noktasını belirtin'
  },
  dimlinear: {
    xLine1Point: 'İlk uzatma çizgisinin başlangıç noktasını belirtin',
    xLine2Point: 'İkinci uzatma çizgisinin başlangıç noktasını belirtin',
    dimLinePoint: 'Ölçü çizgisi konumunu belirtin',
    selectObject: 'Ölçülendirilecek nesneyi seçin',
    rejectObject: 'Nesne DIMLINEAR ile ölçülendirilemez.',
    dimensionText: 'Ölçü metnini girin',
    textAngle: 'Ölçü metninin açısını belirtin',
    rotationAngle: 'Ölçü çizgisinin açısını belirtin',
    keywords: {
      mtext: {
        display: 'Çok satırlı metin(M)',
        local: 'Çok satırlı metin',
        global: 'Mtext'
      },
      text: {
        display: 'Metin(T)',
        local: 'Metin',
        global: 'Text'
      },
      angle: {
        display: 'Açı(A)',
        local: 'Açı',
        global: 'Angle'
      },
      horizontal: {
        display: 'Yatay(H)',
        local: 'Yatay',
        global: 'Horizontal'
      },
      vertical: {
        display: 'Düşey(V)',
        local: 'Düşey',
        global: 'Vertical'
      },
      rotated: {
        display: 'Döndürülmüş(R)',
        local: 'Döndürülmüş',
        global: 'Rotated'
      }
    }
  },
  dimaligned: {
    xLine1Point: 'Birinci uzatma çizgisi orijinini belirtin veya <nesne seç>',
    xLine2Point: 'İkinci uzatma çizgisi orijinini belirtin',
    dimLinePoint: 'Ölçü çizgisi konumunu belirtin',
    selectObject: 'Ölçülendirilecek nesneyi seçin',
    rejectObject: 'Nesne DIMALIGNED ile ölçülendirilemez.',
    dimensionText: 'Ölçü metnini girin',
    textAngle: 'Ölçü metninin açısını belirtin',
    keywords: {
      mtext: {
        display: 'Çok satırlı metin(M)',
        local: 'Çok satırlı metin',
        global: 'Mtext'
      },
      text: {
        display: 'Metin(T)',
        local: 'Metin',
        global: 'Text'
      },
      angle: {
        display: 'Açı(A)',
        local: 'Açı',
        global: 'Angle'
      }
    }
  },
  dimradius: {
    selectObject: 'Yay veya daire seçin',
    rejectObject: 'Bir yay veya daire seçilmelidir.',
    dimLinePoint: 'Ölçü çizgisi konumunu belirtin',
    dimensionText: 'Ölçü metnini girin',
    textAngle: 'Ölçü metninin açısını belirtin',
    keywords: {
      mtext: {
        display: 'Çok satırlı metin(M)',
        local: 'Çok satırlı metin',
        global: 'Mtext'
      },
      text: {
        display: 'Metin(T)',
        local: 'Metin',
        global: 'Text'
      },
      angle: {
        display: 'Açı(A)',
        local: 'Açı',
        global: 'Angle'
      }
    }
  },
  dimdiameter: {
    selectObject: 'Yay veya daire seçin',
    rejectObject: 'Bir yay veya daire seçilmelidir.',
    dimLinePoint: 'Ölçü çizgisi konumunu belirtin',
    dimensionText: 'Ölçü metnini girin',
    textAngle: 'Ölçü metninin açısını belirtin',
    keywords: {
      mtext: {
        display: 'Çok satırlı metin(M)',
        local: 'Çok satırlı metin',
        global: 'Mtext'
      },
      text: {
        display: 'Metin(T)',
        local: 'Metin',
        global: 'Text'
      },
      angle: {
        display: 'Açı(A)',
        local: 'Açı',
        global: 'Angle'
      }
    }
  },
  dimangular: {
    vertexOrSelect: 'Açı köşesini belirtin veya <çizgi seç>',
    xLine1Point: 'Birinci açı uç noktasını belirtin',
    xLine2Point: 'İkinci açı uç noktasını belirtin',
    arcPoint: 'Ölçü yayı çizgisi konumunu belirtin',
    selectFirstLine: 'Birinci çizgiyi seçin',
    selectSecondLine: 'İkinci çizgiyi seçin',
    rejectObject: 'Bir çizgi seçilmelidir.',
    linesParallel: 'Çizgiler paralel — açı kesişimi yok.',
    dimensionText: 'Ölçü metnini girin',
    textAngle: 'Ölçü metninin açısını belirtin',
    keywords: {
      mtext: {
        display: 'Çok satırlı metin(M)',
        local: 'Çok satırlı metin',
        global: 'Mtext'
      },
      text: {
        display: 'Metin(T)',
        local: 'Metin',
        global: 'Text'
      },
      angle: {
        display: 'Açı(A)',
        local: 'Açı',
        global: 'Angle'
      }
    }
  },
  dimarc: {
    selectArc: 'Yay seçin',
    rejectObject: 'Bir yay seçilmelidir.',
    arcPoint: 'Yay uzunluğu ölçüsünün konumunu belirtin',
    dimensionText: 'Ölçü metnini girin',
    textAngle: 'Ölçü metninin açısını belirtin',
    keywords: {
      mtext: {
        display: 'Çok satırlı metin(M)',
        local: 'Çok satırlı metin',
        global: 'Mtext'
      },
      text: {
        display: 'Metin(T)',
        local: 'Metin',
        global: 'Text'
      },
      angle: {
        display: 'Açı(A)',
        local: 'Açı',
        global: 'Angle'
      }
    }
  },
  dimordinate: {
    featurePoint: 'Öğe konumunu belirtin',
    leaderEndpoint: 'Kılavuz uç noktasını belirtin',
    dimensionText: 'Ölçü metnini girin',
    textAngle: 'Ölçü metninin açısını belirtin',
    keywords: {
      mtext: {
        display: 'Çok satırlı metin(M)',
        local: 'Çok satırlı metin',
        global: 'Mtext'
      },
      text: {
        display: 'Metin(T)',
        local: 'Metin',
        global: 'Text'
      },
      angle: {
        display: 'Açı(A)',
        local: 'Açı',
        global: 'Angle'
      },
      xdatum: {
        display: 'X referansı(X)',
        local: 'X referansı',
        global: 'Xdatum'
      },
      ydatum: {
        display: 'Y referansı(Y)',
        local: 'Y referansı',
        global: 'Ydatum'
      }
    }
  },
  dimcontinue: {
    nextPoint: 'İkinci uzatma çizgisi orijinini belirtin veya',
    selectDimension: 'Devam edilecek ölçüyü seçin',
    rejectObject: 'Doğrusal veya açısal bir ölçü seçilmelidir.',
    keywords: {
      select: {
        display: 'Seç(S)',
        local: 'Seç',
        global: 'Select'
      }
    }
  },
  dimbaseline: {
    nextPoint: 'İkinci uzatma çizgisi orijinini belirtin veya',
    selectDimension: 'Taban ölçüyü seçin',
    rejectObject: 'Doğrusal veya açısal bir ölçü seçilmelidir.',
    keywords: {
      select: {
        display: 'Seç(S)',
        local: 'Seç',
        global: 'Select'
      }
    }
  },
  ellipse: {
    axisEndpointOrOptions: 'Elipsin eksen uç noktasını belirtin veya',
    arcAxisEndpointOrCenter: 'Eliptik yayın eksen uç noktasını belirtin veya',
    center: 'Elipsin merkezini belirtin',
    firstAxisEndpoint: 'Eksenin uç noktasını belirtin',
    secondAxisEndpoint: 'Eksenin diğer uç noktasını belirtin',
    otherAxisOrRotation: 'Diğer eksene olan mesafeyi belirtin veya',
    rotationAngle: 'Ana eksen etrafındaki döndürme açısını belirtin',
    arcStartAngle: 'Eliptik yayın başlangıç açısını belirtin',
    arcEndAngle: 'Eliptik yayın bitiş açısını belirtin',
    keywords: {
      arc: {
        display: 'Yay(Y)',
        local: 'Yay',
        global: 'Arc'
      },
      center: {
        display: 'Merkez(M)',
        local: 'Merkez',
        global: 'Center'
      },
      rotation: {
        display: 'Döndürme(D)',
        local: 'Döndürme',
        global: 'Rotation'
      }
    },
    invalid: {
      axis: 'Geçersiz eksen girişi: eksen uzunluğu 0\'dan büyük olmalıdır.',
      otherAxis: 'Geçersiz diğer eksen girişi: mesafe 0\'dan büyük olmalıdır.',
      rotation:
        'Geçersiz döndürme girişi: elde edilen küçük eksen 0\'dan büyük olmalıdır.'
    }
  },
  hatch: {
    prompt: 'Sınır nesnesini seçin veya',
    pickPoint: 'İç noktayı belirtin (bitirmek için Enter\'a basın)',
    select: 'Tarama yapılacak nesneleri seçin',
    patternName: 'Tarama deseni adını girin',
    scale: 'Tarama deseni ölçeğini belirtin',
    angle: 'Tarama deseni açısını belirtin',
    style: 'Tarama stilini girin',
    associative: 'İlişkiselliği belirtin',
    invalidBoundary: 'Seçilen nesneler kapalı bir sınır oluşturmuyor.',
    keywords: {
      pick: {
        display: 'Nokta seç(N)',
        local: 'Nokta seç',
        global: 'PickPoints'
      },
      select: {
        display: 'Nesne seç(S)',
        local: 'Nesne seç',
        global: 'SelectObjects'
      },
      cancel: {
        display: 'İptal(İ)',
        local: 'İptal',
        global: 'Cancel'
      },
      pattern: {
        display: 'Desen(D)',
        local: 'Desen',
        global: 'Pattern'
      },
      scale: {
        display: 'Ölçek(Ö)',
        local: 'Ölçek',
        global: 'Scale'
      },
      angle: {
        display: 'Açı(A)',
        local: 'Açı',
        global: 'Angle'
      },
      style: {
        display: 'Stil(T)',
        local: 'Stil',
        global: 'HatchStyle'
      },
      associative: {
        display: 'İlişkisel(İL)',
        local: 'İlişkisel',
        global: 'AssociativeMode'
      },
      normal: {
        display: 'Normal(N)',
        local: 'Normal',
        global: 'Normal'
      },
      outer: {
        display: 'Dış(D)',
        local: 'Dış',
        global: 'Outer'
      },
      ignore: {
        display: 'Yoksay(Y)',
        local: 'Yoksay',
        global: 'Ignore'
      },
      yes: {
        display: 'Evet(E)',
        local: 'Evet',
        global: 'Yes'
      },
      no: {
        display: 'Hayır(H)',
        local: 'Hayır',
        global: 'No'
      }
    }
  },
  hideobjects: {
    hidden: 'nesne gizlendi',
    restored: 'nesne geri yüklendi',
    nothingToRestore: 'Geri yüklenecek gizli nesne yok'
  },
  entout: {
    longSidePrompt: 'Önizleme uzun kenar boyutunu piksel olarak girin',
    exported: 'nesne önizlemesi dışa aktarıldı',
    skipped: 'nesne atlandı',
    failed: {
      'no-preview-root': 'Seçim için önizleme geometrisi oluşturulamadı',
      'no-bounds': 'Seçim için önizleme sınırları hesaplanamadı',
      'capture-failed': 'Nesne önizleme görüntüsü oluşturulamadı',
      'download-failed':
        'Önizleme oluşturuldu ancak PNG indirmesi başarısız oldu'
    }
  },
  layer: {
    main: 'Seçenek girin',
    listSummary: 'Katman listesi tarayıcı konsoluna yazdırıldı',
    emptyInput: 'Katman adı girilmedi.',
    newPrompt: 'Yeni katman(lar) için ad girin',
    makePrompt: 'Geçerli yapılacak katmanın adını girin',
    setPrompt: 'Geçerli olarak ayarlanacak katmanın adını girin',
    onPrompt: 'Açılacak katman ad(lar)ını girin',
    offPrompt: 'Kapatılacak katman ad(lar)ını girin',
    freezePrompt: 'Dondurulacak katman ad(lar)ını girin',
    thawPrompt: 'Çözülecek katman ad(lar)ını girin',
    lockPrompt: 'Kilitlenecek katman ad(lar)ını girin',
    unlockPrompt: 'Kilidi açılacak katman ad(lar)ını girin',
    colorLayerPrompt: 'Rengi değiştirilecek katman ad(lar)ını girin',
    colorValuePrompt:
      'Renk girin (ACI 1-255, 255,0,0 gibi RGB veya CSS renk adı)',
    invalidColor: 'Geçersiz renk girişi.',
    descriptionLayerPrompt: 'Açıklaması düzenlenecek katman adını girin',
    descriptionValuePrompt: 'Yeni katman açıklamasını girin',
    created: 'Oluşturulan katman sayısı',
    alreadyExists: 'Katman zaten mevcut',
    notFound: 'Katman bulunamadı',
    cannotChangeCurrent: 'Geçerli katman kapatılamaz veya dondurulamaz.',
    keywords: {
      list: {
        display: '?(?)',
        local: '?',
        global: '?'
      },
      make: {
        display: 'Yap(Y)',
        local: 'Yap',
        global: 'Make'
      },
      set: {
        display: 'Ayarla(A)',
        local: 'Ayarla',
        global: 'Set'
      },
      new: {
        display: 'Yeni(Y)',
        local: 'Yeni',
        global: 'New'
      },
      on: {
        display: 'Aç(A)',
        local: 'Aç',
        global: 'On'
      },
      off: {
        display: 'Kapat(K)',
        local: 'Kapat',
        global: 'Off'
      },
      color: {
        display: 'Renk(R)',
        local: 'Renk',
        global: 'Color'
      },
      freeze: {
        display: 'Dondur(D)',
        local: 'Dondur',
        global: 'Freeze'
      },
      thaw: {
        display: 'Çöz(Ç)',
        local: 'Çöz',
        global: 'Thaw'
      },
      lock: {
        display: 'Kilitle(K)',
        local: 'Kilitle',
        global: 'Lock'
      },
      unlock: {
        display: 'Kilidi aç(A)',
        local: 'Kilidi aç',
        global: 'Unlock'
      },
      description: {
        display: 'Açıklama(A)',
        local: 'Açıklama',
        global: 'Description'
      }
    }
  },
  layon: {
    alreadyOn: 'Tüm katmanlar zaten açık.',
    turnedOn: 'Açılan katmanlar'
  },
  laycur: {
    prompt: 'Geçerli katmana değiştirilecek nesneleri seçin',
    currentLayerNotFound: 'Geçerli katman bulunamadı.',
    noObjects: 'Geçerli nesne seçilmedi.',
    alreadyCurrent: 'Seçilen nesneler zaten geçerli katmanda.',
    changed: 'Geçerli katmana değiştirilen nesneler'
  },
  layfrz: {
    prompt: 'Dondurulacak katmandaki nesneyi seçin veya',
    invalidSelection: 'Geçersiz nesne seçildi.',
    settingsPrompt: 'Değiştirilecek LAYFRZ ayarını girin',
    viewportPrompt: 'Görüntü penceresi dondurma davranışını belirtin',
    blockSelectionPrompt: 'İç içe blok seçim davranışını belirtin',
    vpfreezeFallback:
      'Mevcut görüntüleyici, görüntü penceresi başına katman dondurmayı desteklemiyor; bunun yerine Dondur davranışı kullanılıyor.',
    nestedSelectionLimited:
      'İç içe blok seçim ayarları kaydedildi, ancak mevcut seçim işlemi yine de üst düzey nesnenin katmanını çözümlüyor.',
    layerNotFound: 'Katman bulunamadı',
    cannotFreezeCurrent: 'Geçerli katman dondurulamaz.',
    alreadyFrozen: 'Katman zaten donuk',
    frozen: 'Dondurulan katman',
    restored: 'Geri yüklenen katman',
    nothingToUndo: 'Geri alınacak bir LAYFRZ işlemi yok.',
    keywords: {
      settings: {
        display: 'Ayarlar(A)',
        local: 'Ayarlar',
        global: 'Settings'
      },
      undo: {
        display: 'Geri al(G)',
        local: 'Geri al',
        global: 'Undo'
      },
      viewports: {
        display: 'Görüntü pencereleri(G)',
        local: 'Görüntü pencereleri',
        global: 'Viewports'
      },
      blockSelection: {
        display: 'Blok seçimi(B)',
        local: 'Blok seçimi',
        global: 'BlockSelection'
      },
      freeze: {
        display: 'Dondur(D)',
        local: 'Dondur',
        global: 'Freeze'
      },
      vpfreeze: {
        display: 'Görüntü dondur(V)',
        local: 'Görüntü dondur',
        global: 'Vpfreeze'
      },
      block: {
        display: 'Blok(B)',
        local: 'Blok',
        global: 'Block'
      },
      entity: {
        display: 'Nesne(N)',
        local: 'Nesne',
        global: 'Entity'
      },
      none: {
        display: 'Hiçbiri(H)',
        local: 'Hiçbiri',
        global: 'None'
      }
    }
  },
  layiso: {
    prompt: 'İzole edilecek katman(lar)daki nesneleri seçin veya',
    settingsPrompt: 'İzole edilmeyen katmanlar için ayarı girin',
    offModePrompt: 'İzole edilmeyen katmanlar için kapatma davranışını girin',
    noLayers: 'Geçerli katman seçilmedi.',
    layerNotFound: 'Katman bulunamadı',
    isolated: 'İzole edilen katman(lar)',
    affectedLayers: 'etkilenen katmanlar',
    vpfreezeFallback:
      'Mevcut görüntüleyici, görüntü penceresi başına katman dondurmayı desteklemiyor; bunun yerine Kapat davranışı kullanılıyor.',
    lockFadeFallback:
      'Mevcut görüntüleyici katman solma görüntüsünü desteklemiyor; izole edilmeyen katmanlar solma olmadan kilitlenecek.',
    keywords: {
      settings: {
        display: 'Ayarlar(A)',
        local: 'Ayarlar',
        global: 'Settings'
      },
      off: {
        display: 'Kapat(K)',
        local: 'Kapat',
        global: 'Off'
      },
      lockAndFade: {
        display: 'Kilitle ve soldur(K)',
        local: 'Kilitle ve soldur',
        global: 'LockAndFade'
      },
      vpfreeze: {
        display: 'Görüntü dondur(V)',
        local: 'Görüntü dondur',
        global: 'Vpfreeze'
      }
    }
  },
  layuniso: {
    noPrevious: 'Geri yüklenecek önceki LAYISO katman durumu yok.',
    layerNotFound: 'Katman bulunamadı',
    nothingRestored: 'Hiçbir LAYISO katman değişikliği geri yüklenmedi.',
    restored: 'Geri yüklenen katmanlar'
  },
  laythw: {
    alreadyThawed: 'Tüm katmanlar zaten çözülmüş.',
    thawed: 'Çözülen katmanlar'
  },
  laylck: {
    prompt: 'Kilitlenecek katmandaki bir nesneyi seçin',
    invalidSelection: 'Geçersiz nesne seçildi.',
    layerNotFound: 'Katman bulunamadı',
    alreadyLocked: 'Katman zaten kilitli',
    locked: 'Kilitlenen katman'
  },
  layulk: {
    prompt: 'Kilidi açılacak katmandaki bir nesneyi seçin',
    invalidSelection: 'Geçersiz nesne seçildi.',
    layerNotFound: 'Katman bulunamadı',
    alreadyUnlocked: 'Katmanın kilidi zaten açık',
    unlocked: 'Kilidi açılan katman'
  },
  layoff: {
    prompt: 'Kapatılacak katmandaki nesneyi seçin veya',
    invalidSelection: 'Geçersiz nesne seçildi.',
    settingsPrompt: 'Değiştirilecek LAYOFF ayarını girin',
    viewportPrompt: 'Görüntü penceresi davranışını belirtin',
    blockSelectionPrompt: 'İç içe blok seçim davranışını belirtin',
    vpfreezeFallback:
      'Mevcut görüntüleyici, görüntü penceresi başına katman kapatmayı desteklemiyor; bunun yerine Kapat davranışı kullanılıyor.',
    nestedSelectionLimited:
      'İç içe blok seçim ayarları kaydedildi, ancak mevcut seçim işlemi yine de üst düzey nesnenin katmanını çözümlüyor.',
    layerNotFound: 'Katman bulunamadı',
    cannotTurnOffCurrent: 'Geçerli katman kapatılamaz.',
    alreadyOff: 'Katman zaten kapalı',
    turnedOff: 'Kapatılan katman',
    restored: 'Geri yüklenen katman',
    nothingToUndo: 'Geri alınacak bir LAYOFF işlemi yok.',
    keywords: {
      settings: {
        display: 'Ayarlar(A)',
        local: 'Ayarlar',
        global: 'Settings'
      },
      undo: {
        display: 'Geri al(G)',
        local: 'Geri al',
        global: 'Undo'
      },
      viewports: {
        display: 'Görüntü pencereleri(G)',
        local: 'Görüntü pencereleri',
        global: 'Viewports'
      },
      blockSelection: {
        display: 'Blok seçimi(B)',
        local: 'Blok seçimi',
        global: 'BlockSelection'
      },
      off: {
        display: 'Kapat(K)',
        local: 'Kapat',
        global: 'Off'
      },
      vpfreeze: {
        display: 'Görüntü dondur(V)',
        local: 'Görüntü dondur',
        global: 'Vpfreeze'
      },
      block: {
        display: 'Blok(B)',
        local: 'Blok',
        global: 'Block'
      },
      entity: {
        display: 'Nesne(N)',
        local: 'Nesne',
        global: 'Entity'
      },
      none: {
        display: 'Hiçbiri(H)',
        local: 'Hiçbiri',
        global: 'None'
      }
    }
  },
  layerp: {
    restored: 'Önceki katman durumu geri yüklendi.',
    noPreviousState: 'Geri yüklenecek önceki bir katman durumu yok.'
  },
  line: {
    firstPoint: 'İlk noktayı belirtin',
    firstPointOrContinue: 'İlk noktayı belirtin veya',
    nextPoint: 'Sonraki noktayı belirtin',
    nextPointWithOptions: 'Sonraki noktayı belirtin veya',
    keywords: {
      continue: {
        display: 'Devam et(D)',
        local: 'Devam et',
        global: 'Continue'
      },
      undo: {
        display: 'Geri al(G)',
        local: 'Geri al',
        global: 'Undo'
      },
      close: {
        display: 'Kapat(K)',
        local: 'Kapat',
        global: 'Close'
      }
    }
  },
  xline: {
    firstPointOrOptions: 'Bir nokta belirtin veya',
    secondPoint: 'İkinci noktayı belirtin',
    throughPoint: 'Geçiş noktasını belirtin',
    angle: 'Sonsuz doğru açısını girin',
    invalidDirection: 'XLINE için geçersiz yön.',
    keywords: {
      hor: {
        display: 'Yatay(Y)',
        local: 'Yatay',
        global: 'Hor'
      },
      ver: {
        display: 'Dikey(D)',
        local: 'Dikey',
        global: 'Ver'
      },
      ang: {
        display: 'Açı(A)',
        local: 'Açı',
        global: 'Ang'
      }
    }
  },
  ray: {
    startPoint: 'Başlangıç noktasını belirtin',
    throughPoint: 'Geçiş noktasını belirtin'
  },
  mline: {
    startPointWithOptions: 'Başlangıç noktasını belirtin veya',
    nextPointWithOptions: 'Sonraki noktayı belirtin veya',
    justificationPrompt: 'Hizalama türünü girin',
    scalePrompt: 'Çoklu çizgi ölçeğini belirtin',
    stylePrompt: 'Çoklu çizgi stil adını girin veya liste için [?]',
    styleNotFound: 'Çoklu çizgi stili bulunamadı',
    styleListHeader: 'Yüklenen çoklu çizgi stilleri',
    styleListEmpty: 'Mevcut çizimde yüklü çoklu çizgi stili yok.',
    keywords: {
      justification: {
        display: 'Hizalama(H)',
        local: 'Hizalama',
        global: 'Justification'
      },
      scale: {
        display: 'Ölçek(Ö)',
        local: 'Ölçek',
        global: 'Scale'
      },
      style: {
        display: 'Stil(ST)',
        local: 'Stil',
        global: 'Style'
      },
      undo: {
        display: 'Geri al(G)',
        local: 'Geri al',
        global: 'Undo'
      },
      close: {
        display: 'Kapat(K)',
        local: 'Kapat',
        global: 'Close'
      },
      top: {
        display: 'Üst(Ü)',
        local: 'Üst',
        global: 'Top'
      },
      zero: {
        display: 'Sıfır(S)',
        local: 'Sıfır',
        global: 'Zero'
      },
      bottom: {
        display: 'Alt(A)',
        local: 'Alt',
        global: 'Bottom'
      }
    }
  },
  measureAngle: {
    vertex: 'Köşe noktasını belirtin',
    arm1: 'Birinci kol üzerindeki noktayı belirtin',
    arm2: 'İkinci kol üzerindeki noktayı belirtin'
  },
  measureArc: {
    startPoint: 'Yayın başlangıç noktasını belirtin',
    throughPoint: 'Yay üzerinde bir nokta belirtin',
    endPoint: 'Yayın bitiş noktasını belirtin',
    lockedEndPoint:
      'Yayın bitiş noktasını belirtin (Ctrl ile büyük/küçük yay arasında geçiş)',
    invalidPoints: 'Üç nokta doğrusal ve bir yay tanımlamıyor.'
  },
  measureArea: {
    firstPoint: 'İlk noktayı belirtin',
    nextPoint: 'Sonraki noktayı belirtin (bitirmek için Enter\'a basın)'
  },
  measureDistance: {
    firstPoint: 'İlk noktayı belirtin',
    secondPoint: 'İkinci noktayı belirtin'
  },
  measureContinuous: {
    firstPoint: 'İlk noktayı belirtin',
    nextPoint: 'Sonraki noktayı belirtin (bitirmek için Enter\'a basın)'
  },
  measurePoint: {
    point: 'Noktayı belirtin'
  },
  measurement: {
    import: {
      chooseFile: 'Bir ölçüm sidecar JSON dosyası seçin'
    }
  },
  markup: {
    author: 'İnceleme yazarını belirtin (sonraki kullanımlar için kaydedilir)',
    text: {
      point: 'Metin işaretinin noktasını belirtin',
      content: 'İşaret metnini girin'
    },
    line: {
      firstPoint: 'Çizgi işaretinin ilk noktasını belirtin',
      secondPoint: 'Çizgi işaretinin ikinci noktasını belirtin'
    },
    arrow: {
      firstPoint: 'Okun başlangıç noktasını belirtin',
      secondPoint: 'Ok ucunu belirtin'
    },
    cloud: {
      firstCorner: 'Bulutun ilk köşesini belirtin',
      secondCorner: 'Bulutun karşı köşesini belirtin'
    },
    rect: {
      firstCorner: 'Dikdörtgenin ilk köşesini belirtin',
      secondCorner: 'Dikdörtgenin karşı köşesini belirtin'
    },
    circle: {
      center: 'Dairenin merkezini belirtin',
      radius: 'Dairenin yarıçapını belirtin'
    },
    shape: {
      calloutOn: '[Çağrı açık]',
      calloutOff: '[Çağrı kapalı]',
      calloutAnchor: 'Çağrı metninin konumunu belirtin',
      keywords: {
        callout: {
          display: 'Çağrı(C)',
          local: 'Çağrı',
          global: 'Callout'
        },
        noCallout: {
          display: 'ÇağrıYok(N)',
          local: 'ÇağrıYok',
          global: 'NoCallout'
        }
      }
    },
    highlight: {
      firstCorner: 'Vurgu dikdörtgeninin ilk köşesini belirtin',
      secondCorner: 'Vurgu dikdörtgeninin karşı köşesini belirtin'
    },
    callout: {
      tip: 'Lider ucunu veya çağrısı olmayan bulut/dikdörtgen/daire dış çerçevesini belirtin',
      anchor: 'Çağrı metninin konumunu belirtin',
      content: 'Çağrı metnini girin'
    },
    stamp: {
      kind: 'Damga kimliğini girin [approved/rejected/revised/for-review/custom]',
      imageUrl: 'Özel damga görüntüsü URL’sini girin (isteğe bağlı)',
      caption: 'Damga açıklamasını girin (isteğe bağlı)',
      point: 'Damga ekleme noktasını belirtin'
    },
    import: {
      chooseFile: 'Bir işaret sidecar JSON dosyası seçin'
    }
  },
  move: {
    basePointOrDisplacement: 'Temel noktayı belirtin veya',
    secondPointOrDisplacement: 'İkinci noktayı belirtin veya',
    displacement: 'Yer değiştirmeyi belirtin',
    keywords: {
      displacement: {
        display: 'Yer değiştirme(Y)',
        local: 'Yer değiştirme',
        global: 'Displacement'
      }
    }
  },
  offset: {
    distance: 'Öteleme mesafesini belirtin',
    selectObject: 'Ötelenecek nesneyi seçin veya bitirmek için Enter\'a basın',
    sidePoint: 'Ötelenecek tarafta bir nokta belirtin',
    invalidDistance: 'Öteleme mesafesi 0\'dan büyük olmalıdır.',
    invalidSelection: 'Seçilen nesne ötelenemez.',
    offsetFailed: 'Belirtilen taraf için bir öteleme eğrisi oluşturulamadı.'
  },
  leader: {
    startPoint: 'Kılavuz başlangıç noktasını belirtin',
    nextPoint: 'Sonraki noktayı belirtin',
    nextPointOrOptions:
      'Sonraki noktayı belirtin veya [Açıklama/Biçim/Geri al]',
    formatPrompt: 'Kılavuz biçimi seçeneğini girin [Spline/Düz/Ok/Hiçbiri]',
    annotationText: 'Açıklama metninin ilk satırını girin veya <seçenekler>',
    nextAnnotationLine: 'Açıklama metninin sonraki satırını girin',
    annotationOptions:
      'Bir açıklama seçeneği girin [Tolerans/Kopyala/Blok/Hiçbiri/Çok satırlı metin]',
    selectAnnotation: 'Kopyalanacak bir açıklama nesnesi seçin',
    rejectAnnotation: 'Nesne kılavuz açıklaması olarak kullanılamaz.',
    toleranceUnavailable:
      'Geometrik Tolerans iletişim kutusu bu derlemede kullanılamıyor.',
    keywords: {
      annotation: {
        display: 'Açıklama(A)',
        local: 'Açıklama',
        global: 'Annotation'
      },
      format: {
        display: 'Biçim(F)',
        local: 'Biçim',
        global: 'Format'
      },
      undo: {
        display: 'Geri al(U)',
        local: 'Geri al',
        global: 'Undo'
      },
      spline: {
        display: 'Spline(S)',
        local: 'Spline',
        global: 'Spline'
      },
      straight: {
        display: 'Düz(T)',
        local: 'Düz',
        global: 'STraight'
      },
      arrow: {
        display: 'Ok(A)',
        local: 'Ok',
        global: 'Arrow'
      },
      none: {
        display: 'Hiçbiri(N)',
        local: 'Hiçbiri',
        global: 'None'
      },
      tolerance: {
        display: 'Tolerans',
        local: 'Tolerans',
        global: 'Tolerance'
      },
      copy: {
        display: 'Kopyala(C)',
        local: 'Kopyala',
        global: 'Copy'
      },
      block: {
        display: 'Blok(B)',
        local: 'Blok',
        global: 'Block'
      },
      mtext: {
        display: 'Çok satırlı metin(M)',
        local: 'Çok satırlı metin',
        global: 'Mtext'
      }
    }
  },
  mleader: {
    arrowheadOrOptions:
      'Kılavuz ok ucu konumunu belirtin veya [önce kılavuz İnişi/önce İçerik/Seçenekler]',
    landingLocation: 'Kılavuz iniş konumunu belirtin',
    landingFirstPoint: 'Kılavuz iniş konumunu belirtin',
    arrowheadLocation: 'Kılavuz ok ucu konumunu belirtin',
    contentLocation: 'İçerik konumunu belirtin',
    nextPoint: 'Sonraki noktayı belirtin',
    optionsPrompt:
      'Bir seçenek girin [Kılavuz türü/iniş/İçerik türü/Maks. nokta/Birinci açı/İkinci açı/seçeneklerden Çık]',
    leaderTypePrompt: 'Bir kılavuz türü seçin [Düz/Spline/Hiçbiri]',
    landingPrompt: 'İniş kullanılsın mı [Evet/Hayır]',
    landingLength: 'İniş mesafesini belirtin',
    contentTypePrompt: 'Bir içerik türü seçin [Blok/Çok satırlı metin/Hiçbiri]',
    maxPoints: 'Kılavuz çizgisi için maksimum nokta sayısını girin',
    firstAngle: 'Birinci açı kısıtlamasını girin',
    secondAngle: 'İkinci açı kısıtlamasını girin',
    keywords: {
      landingFirst: {
        display: 'Önce iniş(L)',
        local: 'Önce iniş',
        global: 'Landing first'
      },
      contentFirst: {
        display: 'Önce içerik(C)',
        local: 'Önce içerik',
        global: 'Content first'
      },
      options: {
        display: 'Seçenekler(O)',
        local: 'Seçenekler',
        global: 'Options'
      },
      leaderType: {
        display: 'Kılavuz türü(T)',
        local: 'Kılavuz türü',
        global: 'Leader type'
      },
      landing: {
        display: 'İniş(A)',
        local: 'İniş',
        global: 'lAnding'
      },
      contentType: {
        display: 'İçerik türü(C)',
        local: 'İçerik türü',
        global: 'Content type'
      },
      maxpoints: {
        display: 'Maks. nokta(M)',
        local: 'Maks. nokta',
        global: 'Maxpoints'
      },
      firstAngle: {
        display: 'Birinci açı(F)',
        local: 'Birinci açı',
        global: 'First angle'
      },
      secondAngle: {
        display: 'İkinci açı(S)',
        local: 'İkinci açı',
        global: 'Second angle'
      },
      exitOptions: {
        display: 'Seçeneklerden çık(X)',
        local: 'Seçeneklerden çık',
        global: 'eXit options'
      },
      straight: {
        display: 'Düz(S)',
        local: 'Düz',
        global: 'Straight'
      },
      spline: {
        display: 'Spline(P)',
        local: 'Spline',
        global: 'sPline'
      },
      noneLeader: {
        display: 'Hiçbiri(N)',
        local: 'Hiçbiri',
        global: 'None'
      },
      yes: {
        display: 'Evet(Y)',
        local: 'Evet',
        global: 'Yes'
      },
      no: {
        display: 'Hayır(N)',
        local: 'Hayır',
        global: 'No'
      },
      block: {
        display: 'Blok(B)',
        local: 'Blok',
        global: 'Block'
      },
      mtext: {
        display: 'Çok satırlı metin(M)',
        local: 'Çok satırlı metin',
        global: 'Mtext'
      },
      none: {
        display: 'Hiçbiri(N)',
        local: 'Hiçbiri',
        global: 'None'
      }
    }
  },
  mleaderedit: {
    selectMLeader: 'Bir çoklu kılavuz seçin',
    rejectMLeader: 'Bir çoklu kılavuz seçilmelidir.',
    arrowheadOrRemove:
      'Kılavuz ok ucu konumunu belirtin veya [Kılavuzları kaldır]',
    selectLeaderToRemove:
      'Kaldırılacak bir kılavuz belirtin veya bitirmek için Enter\'a basın',
    cannotRemoveLast: 'Bu çoklu kılavuzdan son kılavuz kaldırılamaz.',
    keywords: {
      remove: {
        display: 'Kılavuzları kaldır(R)',
        local: 'Kaldır',
        global: 'Remove'
      }
    }
  },
  mtext: {
    point: 'Çok satırlı metin ekleme noktasını belirtin'
  },
  bmpout: {
    boundsFirstCorner: 'Sınırların ilk köşesini belirtin',
    boundsSecondCorner: 'Karşı köşeyi belirtin',
    longSidePrompt: 'Uzun kenar boyutunu piksel olarak girin'
  },
  jpgout: {
    boundsFirstCorner: 'Sınırların ilk köşesini belirtin',
    boundsSecondCorner: 'Karşı köşeyi belirtin',
    longSidePrompt: 'Uzun kenar boyutunu piksel olarak girin'
  },
  pngout: {
    boundsFirstCorner: 'Sınırların ilk köşesini belirtin',
    boundsSecondCorner: 'Karşı köşeyi belirtin',
    longSidePrompt: 'Uzun kenar boyutunu piksel olarak girin'
  },
  imageattach: {
    insertionPoint: 'Ekleme noktasını belirtin:',
    scale: 'Ölçek faktörünü belirtin:',
    rotation: 'Döndürme açısını belirtin:',
    invalidScale: 'Ölçek faktörü 0 dan büyük olmalıdır.',
    decodeFailed: 'Seçilen görüntü dosyası okunamadı.'
  },
  insert: {
    blockName: 'Blok adını girin:',
    insertionPoint: 'Ekleme noktasını belirtin:',
    scale: 'Ölçek faktörünü belirtin:',
    rotation: 'Döndürme açısını belirtin:',
    invalidScale: 'Ölçek faktörü 0 dan büyük olmalıdır.',
    invalidBlockName: 'Geçersiz blok adı.',
    blockNotFound: 'Blok bulunamadı',
    xrefNotAllowed: 'Harici referans -INSERT ile eklenemez.'
  },
  xattach: {
    insertionPoint: 'Ekleme noktasını belirtin:',
    scale: 'Ölçek faktörünü belirtin:',
    rotation: 'Döndürme açısını belirtin:',
    invalidScale: 'Ölçek faktörü 0 dan büyük olmalıdır.',
    unsupportedFile: 'Lütfen bir DWG veya DXF dosyası seçin.',
    loading: 'Harici referans yükleniyor...',
    loadFailed: 'Seçilen çizim dosyası okunamadı.'
  },
  point: {
    point: 'Bir nokta belirtin'
  },
  polygon: {
    numberOfSides: 'Kenar sayısını girin',
    centerOrEdge: 'Çokgenin merkezini belirtin veya',
    radiusOrType: 'Seçenekleri girin',
    edgeStart: 'Kenarın ilk uç noktasını belirtin',
    edgeEnd: 'Kenarın ikinci uç noktasını belirtin',
    keywords: {
      edge: {
        display: 'Kenar(K)',
        local: 'Kenar',
        global: 'Edge'
      },
      inscribed: {
        display: 'Çembere iç teğet(İ)',
        local: 'Çembere iç teğet',
        global: 'Inscribed'
      },
      circumscribed: {
        display: 'Çembere dış teğet(D)',
        local: 'Çembere dış teğet',
        global: 'Circumscribed'
      }
    },
    invalid: {
      sides: 'Geçersiz kenar sayısı. 3 ile 1024 arasında bir tam sayı girin.',
      radius: 'Geçersiz yarıçap. Yarıçap 0\'dan büyük olmalıdır.',
      edge: 'Geçersiz kenar. Kenar uzunluğu 0\'dan büyük olmalıdır.'
    }
  },
  polyline: {
    firstPoint: 'İlk noktayı belirtin',
    nextPoint: 'Sonraki noktayı belirtin (bitirmek için Enter\'a basın)',
    nextPointWithOptions: 'Sonraki noktayı belirtin veya',
    nextPointWithArcOptions: 'Sonraki noktayı belirtin veya',
    keywords: {
      arc: {
        display: 'Yay(Y)',
        local: 'Yay',
        global: 'Arc'
      },
      undo: {
        display: 'Geri al(G)',
        local: 'Geri al',
        global: 'Undo'
      },
      close: {
        display: 'Kapat(K)',
        local: 'Kapat',
        global: 'Close'
      },
      line: {
        display: 'Doğru(D)',
        local: 'Doğru',
        global: 'Line'
      },
      angle: {
        display: 'Açı(A)',
        local: 'Açı',
        global: 'Angle'
      },
      center: {
        display: 'Merkez(M)',
        local: 'Merkez',
        global: 'Center'
      },
      secondPoint: {
        display: 'İkinci nokta(İ)',
        local: 'İkinci nokta',
        global: 'SecondPoint'
      },
      radius: {
        display: 'Yarıçap(R)',
        local: 'Yarıçap',
        global: 'Radius'
      }
    },
    arcAngle: 'Yay açısını belirtin',
    arcCenter: 'Merkez noktasını belirtin',
    arcSecondPoint: 'Yay üzerinde ikinci noktayı belirtin',
    arcEndPoint: 'Yayın bitiş noktasını belirtin',
    arcRadius: 'Yay yarıçapını belirtin'
  },
  rect: {
    firstPoint: 'İlk köşe noktasını belirtin',
    nextPoint: 'Diğer köşe noktasını belirtin',
    firstPointWithOptions: 'İlk köşe noktasını belirtin veya',
    otherCornerWithOptions: 'Diğer köşe noktasını belirtin veya',
    chamferFirst: 'İlk pah mesafesini belirtin',
    chamferSecond: 'İkinci pah mesafesini belirtin',
    filletRadius: 'Yuvarlatma yarıçapını belirtin',
    segmentWidth: 'Dikdörtgen çizgi genişliğini belirtin',
    elevationValue: 'Kotu belirtin',
    thicknessValue: 'Kalınlığı belirtin',
    rotationAngle: 'Dikdörtgen döndürme açısını belirtin',
    dimensionLength: 'Dikdörtgen uzunluğunu belirtin',
    dimensionWidth: 'Dikdörtgen genişliğini belirtin',
    areaValue: 'Dikdörtgen alanını belirtin',
    areaLengthOrWidth: 'Dikdörtgen uzunluğunu belirtin',
    areaSpecifyWidth: 'Dikdörtgen genişliğini belirtin',
    invalidPositive: 'Geçersiz giriş. Lütfen 0\'dan büyük bir değer girin.',
    invalidRect:
      'Dikdörtgen oluşturulamadı. Lütfen geçerli köşeler veya boyutlar belirtin.',
    thicknessNotSupported:
      'Dikdörtgen kalınlığı şu anda nesne verisine yazılmıyor. Kalınlık ayarı yok sayılıyor.',
    keywords: {
      chamfer: {
        display: 'Pah(P)',
        local: 'Pah',
        global: 'Chamfer'
      },
      elevation: {
        display: 'Kot(K)',
        local: 'Kot',
        global: 'Elevation'
      },
      fillet: {
        display: 'Yuvarlatma(Y)',
        local: 'Yuvarlatma',
        global: 'Fillet'
      },
      thickness: {
        display: 'Kalınlık(K)',
        local: 'Kalınlık',
        global: 'Thickness'
      },
      width: {
        display: 'Genişlik(G)',
        local: 'Genişlik',
        global: 'Width'
      },
      area: {
        display: 'Alan(A)',
        local: 'Alan',
        global: 'Area'
      },
      dimensions: {
        display: 'Boyutlar(B)',
        local: 'Boyutlar',
        global: 'Dimensions'
      },
      rotation: {
        display: 'Döndürme(D)',
        local: 'Döndürme',
        global: 'Rotation'
      },
      length: {
        display: 'Uzunluk(U)',
        local: 'Uzunluk',
        global: 'Length'
      },
      rectWidth: {
        display: 'Genişlik(G)',
        local: 'Genişlik',
        global: 'Width'
      }
    }
  },
  rotate: {
    basePoint: 'Temel noktayı belirtin',
    rotationAngleOrOptions: 'Döndürme açısını belirtin veya',
    referenceAngleOrPoints: 'Referans açısını belirtin veya',
    firstReferencePoint: 'Referans açısının ilk noktasını belirtin',
    secondReferencePoint: 'İkinci noktayı belirtin',
    newAngle: 'Yeni açıyı belirtin',
    keywords: {
      copy: {
        display: 'Kopyala(K)',
        local: 'Kopyala',
        global: 'Copy'
      },
      reference: {
        display: 'Referans(R)',
        local: 'Referans',
        global: 'Reference'
      },
      points: {
        display: 'Noktalar(N)',
        local: 'Noktalar',
        global: 'Points'
      }
    },
    invalid: {
      referencePoints: 'Geçersiz referans noktaları: noktalar farklı olmalıdır.'
    }
  },
  revcloud: {
    firstCornerOrOptions: 'İlk köşe noktasını belirtin veya',
    firstCorner: 'İlk köşe noktasını belirtin',
    oppositeCorner: 'Karşı köşeyi belirtin',
    startPoint: 'Başlangıç noktasını belirtin',
    nextPoint: 'Sonraki noktayı belirtin',
    nextPointOrUndo: 'Sonraki noktayı belirtin veya',
    firstPoint: 'İlk noktayı belirtin',
    guideCursor: 'İmleci bulut yolu boyunca götürün (bitirmek için Enter)',
    arcLength: 'Yay uzunluğunu belirtin',
    selectObject: 'Nesne seçin',
    style: 'Revizyon bulutu yay stilini girin',
    reverseDirection: 'Yönü ters çevir',
    invalidArcLength: 'Yay uzunluğu 0\'dan büyük olmalıdır.',
    invalidObject: 'Seçilen nesne revizyon bulutuna dönüştürülemez.',
    keywords: {
      arcLength: {
        display: 'Yay uzunluğu(A)',
        local: 'Yay uzunluğu',
        global: 'ArcLength'
      },
      object: {
        display: 'Nesne(O)',
        local: 'Nesne',
        global: 'Object'
      },
      rectangular: {
        display: 'Dikdörtgen(R)',
        local: 'Dikdörtgen',
        global: 'Rectangular'
      },
      polygonal: {
        display: 'Çokgen(P)',
        local: 'Çokgen',
        global: 'Polygonal'
      },
      freehand: {
        display: 'Serbest(F)',
        local: 'Serbest',
        global: 'Freehand'
      },
      style: {
        display: 'Stil(S)',
        local: 'Stil',
        global: 'Style'
      },
      normal: {
        display: 'Normal(N)',
        local: 'Normal',
        global: 'Normal'
      },
      calligraphy: {
        display: 'Kaligrafi(C)',
        local: 'Kaligrafi',
        global: 'Calligraphy'
      },
      undo: {
        display: 'Geri al(U)',
        local: 'Geri al',
        global: 'Undo'
      },
      yes: {
        display: 'Evet(Y)',
        local: 'Evet',
        global: 'Yes'
      },
      no: {
        display: 'Hayır(N)',
        local: 'Hayır',
        global: 'No'
      }
    }
  },
  sketch: {
    specifySketch: 'Eskizi belirtin veya',
    sketching:
      'Eskiz için işaretçiyi hareket ettirin (durdurmak için tıklayın veya Enter)',
    type: 'Eskiz türünü girin',
    increment: 'Eskiz artışını belirtin',
    tolerance: 'Spline toleransını belirtin',
    firstPoint: 'İlk noktayı belirtin',
    nextPoint: 'Bitiş noktasını belirtin',
    keywords: {
      type: {
        display: 'Tür(T)',
        local: 'Tür',
        global: 'Type'
      },
      increment: {
        display: 'Artış(I)',
        local: 'Artış',
        global: 'Increment'
      },
      tolerance: {
        display: 'Tolerans(L)',
        local: 'Tolerans',
        global: 'Tolerance'
      },
      line: {
        display: 'Çizgiler(L)',
        local: 'Çizgiler',
        global: 'Lines'
      },
      polyline: {
        display: 'Çoklu çizgi(P)',
        local: 'Çoklu çizgi',
        global: 'Polyline'
      },
      spline: {
        display: 'Spline(S)',
        local: 'Spline',
        global: 'Spline'
      }
    }
  },
  spline: {
    firstPoint: 'İlk noktayı belirtin',
    nextPoint: 'Sonraki noktayı belirtin (bitirmek için Enter\'a basın)',
    firstPointWithOptions: 'İlk noktayı belirtin veya',
    nextPointWithFitOptions: 'Sonraki noktayı belirtin veya',
    nextPointWithCvOptions: 'Sonraki kontrol noktasını belirtin veya',
    methodPrompt: 'Spline oluşturma yöntemini girin',
    knotsPrompt: 'Düğüm parametrelemesini girin',
    degreePrompt: 'Spline derecesini belirtin',
    keywords: {
      method: {
        display: 'Yöntem(Y)',
        local: 'Yöntem',
        global: 'Method'
      },
      fit: {
        display: 'Uydur(U)',
        local: 'Uydur',
        global: 'Fit'
      },
      cv: {
        display: 'KN(K)',
        local: 'KN',
        global: 'CV'
      },
      knots: {
        display: 'Düğümler(D)',
        local: 'Düğümler',
        global: 'Knots'
      },
      degree: {
        display: 'Derece(D)',
        local: 'Derece',
        global: 'Degree'
      },
      undo: {
        display: 'Geri al(G)',
        local: 'Geri al',
        global: 'Undo'
      },
      close: {
        display: 'Kapat(K)',
        local: 'Kapat',
        global: 'Close'
      },
      chord: {
        display: 'Kiriş(K)',
        local: 'Kiriş',
        global: 'Chord'
      },
      sqrtChord: {
        display: 'Karekök kiriş(K)',
        local: 'Karekök kiriş',
        global: 'SqrtChord'
      },
      uniform: {
        display: 'Düzgün(D)',
        local: 'Düzgün',
        global: 'Uniform'
      }
    }
  },
  objectscale: {
    action: 'Bir seçenek girin',
    scaleName: 'Açıklama ölçeği adını girin',
    done: 'Güncellenen nesneler',
    none: '(yok)',
    keywords: {
      add: {
        display: 'Ekle(A)',
        local: 'Ekle',
        global: 'Add'
      },
      delete: {
        display: 'Sil(D)',
        local: 'Sil',
        global: 'Delete'
      },
      list: {
        display: 'Listele(L)',
        local: 'Listele',
        global: 'List'
      }
    }
  },
  sysvar: {
    prompt: 'Lütfen yeni değeri girin'
  },
  view: {
    enterName: 'Geri yüklenecek görünümün adını girin',
    notFound: '"{name}" görünümü bulunamadı.'
  },
  zoom: {
    mainPrompt: 'Pencerenin köşesini belirtin veya',
    firstCorner: 'İlk köşeyi belirtin',
    secondCorner: 'Karşı köşeyi belirtin',
    centerPoint: 'Merkez noktasını belirtin',
    heightOrScale: 'Yükseklik veya ölçek faktörünü girin (nX veya nXP)',
    scaleFactor: 'Ölçek faktörünü girin (nX veya nXP)',
    keywords: {
      all: {
        display: 'Tümü(T)',
        local: 'Tümü',
        global: 'All'
      },
      center: {
        display: 'Merkez(M)',
        local: 'Merkez',
        global: 'Center'
      },
      extents: {
        display: 'Kapsam(K)',
        local: 'Kapsam',
        global: 'Extents'
      },
      previous: {
        display: 'Önceki(Ö)',
        local: 'Önceki',
        global: 'Previous'
      },
      original: {
        display: 'Orijinal(O)',
        local: 'Orijinal',
        global: 'Original'
      },
      saved: {
        display: 'Kayıtlı(V)',
        local: 'Kayıtlı',
        global: 'Saved'
      },
      smart: {
        display: 'Akıllı(I)',
        local: 'Akıllı',
        global: 'Smart'
      },
      scale: {
        display: 'Ölçek(Ö)',
        local: 'Ölçek',
        global: 'Scale'
      },
      window: {
        display: 'Pencere(P)',
        local: 'Pencere',
        global: 'Window'
      }
    }
  },
  chtml: {
    exportFormat: 'Dışa aktarma biçimi',
    exportInvisibleLayers: 'Görünmez katmanları dışa aktar',
    exportLayouts: 'Yerleşimleri dışa aktar',
    background: 'Arka plan rengi',
    initialView: 'HTML açılırken başlangıç görünümü',
    viewerMode: 'Çevrimdışı görüntüleyici modu',
    chunkSizeMiB: 'Parça boyutu (MiB, çok dosyalı paket)',
    compressChunks: 'Parçaları sıkıştır (çok dosyalı paket)',
    keywords: {
      single: {
        display: 'Tek dosya(S)',
        local: 'Tek dosya',
        global: 'Single'
      },
      multi: {
        display: 'Çok dosyalı paket(M)',
        local: 'Çok dosyalı paket',
        global: 'Multi'
      },
      yes: {
        display: 'Evet(E)',
        local: 'Evet',
        global: 'Yes'
      },
      no: {
        display: 'Hayır(H)',
        local: 'Hayır',
        global: 'No'
      },
      extents: {
        display: 'Kapsam(K)',
        local: 'Kapsam',
        global: 'Extents'
      },
      current: {
        display: 'Geçerli(G)',
        local: 'Geçerli',
        global: 'Current'
      },
      view: {
        display: 'Görünüm(G)',
        local: 'Görünüm',
        global: 'View'
      },
      measure: {
        display: 'Ölçüm ve İnceleme(Ö)',
        local: 'Ölçüm ve İnceleme',
        global: 'Measure'
      },
      black: {
        display: 'Siyah(B)',
        local: 'Siyah',
        global: 'Black'
      },
      white: {
        display: 'Beyaz(W)',
        local: 'Beyaz',
        global: 'White'
      },
      space: {
        display: 'Alan(S)',
        local: 'Alan',
        global: 'Space'
      }
    }
  },
  cpdf: {
    modelSpaceFit: 'Model alanı çerçevesi',
    exportLayouts: 'Yerleşimleri dışa aktar',
    textMode: 'Metin işleme',
    colorMode: 'Renk modu',
    keywords: {
      extents: {
        display: 'Kapsam(K)',
        local: 'Kapsam',
        global: 'Extents'
      },
      display: {
        display: 'Görüntü(G)',
        local: 'Görüntü',
        global: 'Display'
      },
      text: {
        display: 'Metin(M)',
        local: 'Metin',
        global: 'Text'
      },
      vector: {
        display: 'Vektör(V)',
        local: 'Vektör',
        global: 'Vector'
      },
      yes: {
        display: 'Evet(E)',
        local: 'Evet',
        global: 'Yes'
      },
      no: {
        display: 'Hayır(H)',
        local: 'Hayır',
        global: 'No'
      },
      color: {
        display: 'Renkli(R)',
        local: 'Renkli',
        global: 'Color'
      },
      monochrome: {
        display: 'Siyah-beyaz(S)',
        local: 'Siyah-beyaz',
        global: 'Monochrome'
      }
    }
  },
  ucs: {
    originOrOptions: 'UCS orijinini belirtin veya',
    pointOnXAxis: 'X ekseni üzerinde nokta belirtin veya',
    pointOnXyPlane: 'XY düzlemi üzerinde nokta belirtin veya',
    rotationAngle: '{axis} ekseni etrafındaki döndürme açısını belirtin',
    zAxisOrigin: 'Yeni orijin noktasını belirtin',
    pointOnZAxis: 'Z ekseninin pozitif kısmında nokta belirtin',
    selectObject: 'UCS\'nin hizalanacağı nesneyi seçin',
    namedOption: 'Bir seçenek girin',
    enterName: 'Geri yüklenecek UCS\'nin adını girin veya [?]',
    saveName: 'Geçerli UCS\'yi kaydetmek için ad girin',
    deleteName: 'Silinecek UCS ad(lar)ını girin',
    noPrevious: 'Bu oturumda önceki UCS yok.',
    noNamed: 'Adlı UCS tanımı yok.',
    notFound: '"{name}" UCS\'si bulunamadı.',
    invalidName: 'Geçersiz UCS adı.',
    invalidObject: 'UCS seçilen nesneye hizalanamıyor.',
    keywords: {
      named: {
        display: 'Adlı(A)',
        local: 'Adlı',
        global: 'Named'
      },
      object: {
        display: 'Nesne(B)',
        local: 'Nesne',
        global: 'Object'
      },
      previous: {
        display: 'Önceki(P)',
        local: 'Önceki',
        global: 'Previous'
      },
      view: {
        display: 'Görünüm(V)',
        local: 'Görünüm',
        global: 'View'
      },
      world: {
        display: 'Dünya(W)',
        local: 'Dünya',
        global: 'World'
      },
      x: {
        display: 'X',
        local: 'X',
        global: 'X'
      },
      y: {
        display: 'Y',
        local: 'Y',
        global: 'Y'
      },
      z: {
        display: 'Z',
        local: 'Z',
        global: 'Z'
      },
      zAxis: {
        display: 'Z Ekseni(N)',
        local: 'Z Ekseni',
        global: 'ZAxis'
      },
      apply: {
        display: 'Uygula(L)',
        local: 'Uygula',
        global: 'Apply'
      },
      restore: {
        display: 'Geri yükle(R)',
        local: 'Geri yükle',
        global: 'Restore'
      },
      save: {
        display: 'Kaydet(S)',
        local: 'Kaydet',
        global: 'Save'
      },
      delete: {
        display: 'Sil(D)',
        local: 'Sil',
        global: 'Delete'
      },
      list: {
        display: '?(?)',
        local: '?',
        global: '?'
      }
    }
  },
  group: {
    selectOrOption: 'Nesneleri seçin veya',
    createOrOption: 'Grup oluştur veya',
    selectObjects: 'Grup için nesneleri seçin',
    enterName: 'Grup adını girin',
    enterDescription: 'Grup açıklamasını girin',
    invalidName: 'Geçersiz grup adı',
    nameExists: 'Grup adı zaten var',
    created: 'Grup {name} oluşturuldu',
    keywords: {
      name: {
        display: 'Ad(N)',
        local: 'Ad',
        global: 'Name'
      },
      description: {
        display: 'Açıklama(D)',
        local: 'Açıklama',
        global: 'Description'
      }
    }
  },
  ungroup: {
    selectOrOption: 'Grup seçin veya',
    selectGroup: 'Grup seçin',
    enterName: 'Grup adını girin',
    notFound: 'Grup bulunamadı',
    notInGroup: 'Nesne bir grubun üyesi değil',
    multiGroup: 'Nesne birden fazla grubun üyesi [{name}]',
    exploded: 'Grup {name} patlatıldı',
    explodedCount: '{count} grup patlatıldı',
    keywords: {
      name: {
        display: 'Ad(N)',
        local: 'Ad',
        global: 'Name'
      },
      all: {
        display: 'Tümü(A)',
        local: 'Tümü',
        global: 'All'
      },
      accept: {
        display: 'Kabul(A)',
        local: 'Kabul',
        global: 'Accept'
      },
      next: {
        display: 'Sonraki(N)',
        local: 'Sonraki',
        global: 'Next'
      }
    }
  },
  groupedit: {
    selectGroup: 'Bir grup seçin',
    enterName: 'Grup adını girin',
    notFound: 'Grup bulunamadı',
    multiGroup: 'Nesne birden fazla grubun üyesi [{name}]',
    action: '{name} grubu için bir seçenek girin',
    selectToAdd: 'Gruba eklenecek nesneleri seçin',
    selectToRemove: 'Gruptan kaldırılacak nesneleri seçin',
    newName: 'Yeni grup adını girin',
    keywords: {
      add: {
        display: 'Nesne ekle(A)',
        local: 'Ekle',
        global: 'Add'
      },
      remove: {
        display: 'Nesne kaldır(R)',
        local: 'Kaldır',
        global: 'Remove'
      },
      rename: {
        display: 'Yeniden adlandır(N)',
        local: 'Yeniden adlandır',
        global: 'Rename'
      },
      accept: {
        display: 'Kabul(A)',
        local: 'Kabul',
        global: 'Accept'
      },
      next: {
        display: 'Sonraki(N)',
        local: 'Sonraki',
        global: 'Next'
      }
    }
  },
  dashgroup: {
    option: 'Bir seçenek girin',
    empty: 'Tanımlı grup yok',
    listEntry: '{name}  {description}  [{selectable}]  ({count})',
    yes: 'Evet',
    no: 'Hayır',
    enterNameOrBlank: 'Grup adını girin veya adsız için Enter tuşuna basın',
    enterGroupName: 'Grup adını girin',
    selectableSet: 'Grup {name} seçilebilir = {value}',
    orderOption: 'Sıralama seçeneğini girin',
    fromPosition:
      'Yeniden sıralanacak nesnenin konum numarasını girin (0 tabanlı)',
    toPosition: 'Nesne için yeni konum numarasını girin (0 tabanlı)',
    keywords: {
      list: {
        display: '?(?)',
        local: '?',
        global: '?'
      },
      create: {
        display: 'Oluştur(C)',
        local: 'Oluştur',
        global: 'Create'
      },
      add: {
        display: 'Ekle(A)',
        local: 'Ekle',
        global: 'Add'
      },
      remove: {
        display: 'Kaldır(R)',
        local: 'Kaldır',
        global: 'Remove'
      },
      explode: {
        display: 'Patlat(X)',
        local: 'Patlat',
        global: 'Explode'
      },
      rename: {
        display: 'Yeniden adlandır(N)',
        local: 'Yeniden adlandır',
        global: 'Rename'
      },
      selectable: {
        display: 'Seçilebilir(S)',
        local: 'Seçilebilir',
        global: 'Selectable'
      },
      order: {
        display: 'Sıra(O)',
        local: 'Sıra',
        global: 'Order'
      },
      reverse: {
        display: 'Ters(R)',
        local: 'Ters',
        global: 'Reverse'
      },
      position: {
        display: 'Konum(P)',
        local: 'Konum',
        global: 'Position'
      }
    }
  },
  pdfimport: {
    pageNumber: 'Sayfa numarasını girin (1-{count})',
    insertionPoint:
      'Ekleme noktasını belirtin (ölçek {scale}, mod {mode}) veya',
    modePrompt: 'İçe aktarma yöntemini seçin',
    modeRecover: 'çizimi kurtar',
    modeVisual: 'PDF görünümünü koru',
    scaleFactor: 'Ölçek faktörünü girin',
    keywords: {
      scale: {
        display: 'Ölçek(S)',
        local: 'Ölçek',
        global: 'Scale'
      },
      mode: {
        display: 'Mod(M)',
        local: 'Mod',
        global: 'Mode'
      },
      recover: {
        display: 'Kurtar(R)',
        local: 'Kurtar',
        global: 'Recover'
      },
      visual: {
        display: 'Görünüm(V)',
        local: 'Görünüm',
        global: 'Visual'
      }
    },
    pickInsertionPoint: 'Ekleme noktasını belirtin',
    dialog: {
      title: 'PDF İçe Aktar',
      close: 'Kapat',
      fileName: 'Dosya adı:',
      browse: 'Gözat...',
      pagesGroup: 'İçe aktarılacak sayfa',
      page: 'Sayfa:',
      total: 'Toplam: {count}',
      singleView: 'Sayfa önizlemesini göster',
      gridView: 'Sayfa küçük resimlerini göster',
      pageLabel: 'Sayfa {page}',
      pageSize:
        'Sayfa boyutu: {width} × {height} mm ({widthIn} × {heightIn} inç)',
      previewError: 'Önizleme kullanılamıyor',
      positionGroup: 'Konum',
      onScreen: 'Ekleme noktasını ekranda belirt',
      x: 'X:',
      y: 'Y:',
      scale: 'Ölçek:',
      modeGroup: 'İçe aktarma modu',
      modeRecover: 'Çizimi kurtar',
      recoverHint:
        'Daireleri, yayları, eğrileri, metni, taramaları ve blokları yeniden oluşturur',
      modeVisual: 'PDF görünümünü koru',
      visualHint: 'Yolları ve metni PDF’te çizildiği gibi içe aktarır',
      ok: 'Tamam',
      cancel: 'İptal'
    }
  },
  pdfdim: {
    noDimensions:
      'Seçimde ölçü bulunamadı (oklar veya işaretler, ölçü çizgileri ve değer metinleri gerekir).',
    convertAll:
      '{count} ölçü bulundu (çizim ölçeği 1:{scale}). Dönüştürülsün mü?',
    convertOne: 'Ölçü {index}/{count} "{text}": dönüştürülsün mü?',
    summary:
      '{count} ölçü dönüştürüldü; PDF_DIM stili {scale} doğrusal ölçek faktörünü kullanır.'
  },
  pdfhatch: {
    cancelled: 'Tarama kurtarma iptal edildi; hiçbir şey değiştirilmedi.',
    pickPoint: 'Taranacak alanın içinde bir nokta seçin',
    panel: {
      title: 'Taramaları Kurtar',
      hatches: 'Taramalar',
      addArea: 'Alan ekle',
      addAreaTip: 'Tanımanın kaçırdığı bir alanın içinde bir nokta seçin; içindeki çizgilere en uygun desen uydurulur.',
      picking: 'Çizimde alanın içinde bir nokta seçin…',
      noBoundary: 'Bu noktanın çevresinde kapalı alan bulunamadı.',
      noStrokes: 'Bu alanda düzenli bir desen bulunamadı.',
      empty: 'Tarama bulunamadı. Bir alan seçmek için "Alan ekle" düğmesini kullanın.',
      include: 'Bu taramayı dönüştür',
      addedTag: 'eklendi',
      entities: '{count} nesne',
      selectHint: 'Desenini, ölçeğini veya açısını değiştirmek için bir tarama seçin.',
      ownGroup: 'Ölçülen / kullanıcı tanımlı',
      libraryGroup: 'Önceden tanımlı',
      pattern: 'Desen',
      scale: 'Ölçek',
      spacing: 'Aralık',
      angle: 'Açı',
      autoFit: 'Otomatik uydur',
      autoFitTip: 'Bu desenin ölçeğini, açısını ve başlangıç noktasını çizgilerden yeniden ölç.',
      match: 'Çizgiler üzerindeki desen: {precision} · yeniden çizilen çizgiler: {recall}',
      noEntities: 'Bu desen hiçbir nesneyi tamamen yeniden çizmiyor; hiçbir şey değiştirilmez.',
      guessed: 'Çizgilerde bu desenin izi yok; ölçek ve açı tahminidir.',
      poorMatch: 'Zayıf eşleşme: taramanın yeniden çizmediği çizgiler korunur.',
      userSingle: 'Kullanıcı tanımlı',
      userDouble: 'Kullanıcı tanımlı, çift',
      measured: 'Ölçülen desen',
      hideStrokes: 'Özgün çizgileri gizle',
      ready: '{count} taramadan {ready} tanesi hazır',
      cancel: 'İptal',
      apply: 'Uygula'
    },
    noHatches:
      'Seçimde tarama bulunamadı (düzenli paralel çizgiler ve onları sınırlayan çizgiler gerekir).',
    summary:
      '{count} tarama dönüştürüldü ({patterns}); {strokes} nesne değiştirildi.'
  },
  bsearch: {
    unsupported:
      'Seçili nesnelerin hiçbiri eşleştirilemiyor (çizgi, yay, daire, çoklu çizgi, elips, spline, metin, çok satırlı metin ve blok referansları desteklenir).',
    skipped: 'Seçili {count} nesne eşleştirilemiyor ve yok sayılıyor.',
    found:
      '{count} eşleşen örnek bulundu, {included} tanesi dönüştürülecek. Seçin',
    noMatches: 'Başka örnek bulunamadı.',
    reviewOne: 'Örnek {index}/{count} ({state})',
    included: 'dahil',
    excluded: 'hariç',
    options:
      'Döndürme {rotation}, ayna {mirror}, ölçek {scale}, aynı katman {layer}, mevcut bloklar {blocks}, metin farkları {text}. Değiştir',
    on: 'açık',
    off: 'kapalı',
    target: 'Şuna dönüştür',
    name: 'Yeni blok adını girin',
    nameExists: '"{name}" adlı bir blok zaten var.',
    nameInvalid: '"{name}" geçerli bir blok adı değil.',
    basePoint: 'Ekleme noktasını belirtin',
    attributeTag: '"{text}" metni için öznitelik etiketini girin',
    existingName: 'Mevcut blok adını girin',
    blockNotFound: '"{name}" bloğu bulunamadı.',
    rotation: 'Bloğun döndürme açısını belirtin',
    scale: 'Bloğun ölçek faktörünü belirtin',
    scope:
      'Bulunan {count} örnek de dönüştürülsün mü, yoksa yalnızca kaynak nesneler mi?',
    summary: '"{name}" bloğuna dönüştürüldü: {count} referans.',
    keywords: {
      convert: {
        display: 'Dönüştür(C)',
        local: 'Dönüştür',
        global: 'Convert'
      },
      review: {
        display: 'İncele(R)',
        local: 'İncele',
        global: 'Review'
      },
      options: {
        display: 'Seçenekler(O)',
        local: 'Seçenekler',
        global: 'Options'
      },
      exit: {
        display: 'Çıkış(X)',
        local: 'Çıkış',
        global: 'eXit'
      },
      include: {
        display: 'Dahil et(I)',
        local: 'Dahil et',
        global: 'Include'
      },
      exclude: {
        display: 'Hariç tut(E)',
        local: 'Hariç tut',
        global: 'Exclude'
      },
      next: {
        display: 'Sonraki(N)',
        local: 'Sonraki',
        global: 'Next'
      },
      previous: {
        display: 'Önceki(P)',
        local: 'Önceki',
        global: 'Previous'
      },
      done: {
        display: 'Bitti(D)',
        local: 'Bitti',
        global: 'Done'
      },
      rotation: {
        display: 'Döndürme(R)',
        local: 'Döndürme',
        global: 'Rotation'
      },
      mirror: {
        display: 'Ayna(M)',
        local: 'Ayna',
        global: 'Mirror'
      },
      scale: {
        display: 'Ölçek(S)',
        local: 'Ölçek',
        global: 'Scale'
      },
      layer: {
        display: 'Katman(L)',
        local: 'Katman',
        global: 'Layer'
      },
      blocks: {
        display: 'Bloklar(B)',
        local: 'Bloklar',
        global: 'Blocks'
      },
      text: {
        display: 'Metin(T)',
        local: 'Metin',
        global: 'Text'
      },
      new: {
        display: 'Yeni(N)',
        local: 'Yeni',
        global: 'New'
      },
      existing: {
        display: 'Mevcut(E)',
        local: 'Mevcut',
        global: 'Existing'
      },
      instances: {
        display: 'Örnekler(I)',
        local: 'Örnekler',
        global: 'Instances'
      },
      source: {
        display: 'Kaynak(S)',
        local: 'Kaynak',
        global: 'Source'
      }
    }
  },
  pdfblock: {
    keywords: {
      yes: {
        display: 'Evet(Y)',
        local: 'Evet',
        global: 'Yes'
      },
      no: {
        display: 'Hayır(N)',
        local: 'Hayır',
        global: 'No'
      },
      review: {
        display: 'İncele(R)',
        local: 'İncele',
        global: 'Review'
      },
      all: {
        display: 'Tümü(A)',
        local: 'Tümü',
        global: 'All'
      },
      exit: {
        display: 'Çıkış(X)',
        local: 'Çıkış',
        global: 'eXit'
      }
    }
  },
  pdftext: {
    panel: {
      title: 'Metni Kurtar',
      shxGroup: 'SHX metin (çizgi yazı tipleri)',
      meshGroup: 'TrueType metin (anahat yazı tipleri)',
      style: 'Metin stili',
      newStyle: 'Yeni metin stili…',
      newTag: 'yeni',
      newStyleName: 'Yeni metin stilinin adı',
      create: 'Oluştur',
      cancel: 'İptal',
      apply: 'Uygula',
      nameError: {
        empty: 'Bir ad girin.',
        invalid: 'Ad, izin verilmeyen karakterler içeriyor.',
        exists: 'Bu ada sahip bir metin stili zaten var.'
      },
      font: 'Yazı tipi',
      bigFont: 'Büyük yazı tipi',
      noBigFont: '(Yok)',
      shxFonts: 'SHX yazı tipleri',
      ttfFonts: 'TrueType yazı tipleri',
      fontsUsed: 'Kullanılan: {fonts}',
      fontMissing:
        '"{font}" yazı tipi kullanılamıyor; "{fallback}" ile çizilir.',
      fontNotShx:
        'Bu bir TrueType yazı tipi: metin SHX çizgi metni gibi görünmez.',
      fontNotTtf:
        'Bu bir SHX yazı tipi: metin TrueType anahat metni gibi görünmez.',
      styleChanges:
        '"{style}" metin stilinin yazı tipleri değişir: bu stili kullanan mevcut metinler de değişir.',
      heightScale: 'Yükseklik ölçeği',
      widthFactor: 'Genişlik faktörü',
      autoWidth: 'Özgün genişliğe sığdır',
      lines: 'Metin satırları',
      include: 'Bu satırı dönüştür',
      textPlaceholder: 'Metni yazın; atlamak için boş bırakın',
      switchKind: 'SHX ve TrueType metin arasında geçiş yap',
      kind: {
        shx: 'SHX',
        mesh: 'TrueType'
      },
      source: {
        dictionary: 'Öğrenildi',
        ocr: 'OCR',
        typed: 'Düzenlendi',
        unread: 'Okunamadı'
      },
      hideStrokes: 'Özgün çizgileri gizle',
      ready: '{count} satırdan {ready} tanesi hazır',
      merge: 'MText olarak birleştir',
      mergeTip:
        'Seçili satırları tek bir çok satırlı metinde (MText) birleştirir',
      split: 'Ayır',
      splitTip: 'Seçili birleştirilmiş metni yeniden satırlarına ayırır',
      mergeAdjacent: 'Bitişikleri birleştir',
      mergeAdjacentTip:
        'Aynı taban çizgisinde yan yana duran karakterleri ve sözcükleri çok satırlı metinde birleştirir',
      mergedCount: '{count} çok satırlı metinde birleştirildi.',
      selectHint:
        'Birden fazla satır seçmek için Ctrl+tıklama veya Shift+tıklama kullanın.',
      mtextTag: 'MText'
    },
    cancelled: 'Metin kurtarma iptal edildi; hiçbir şey değiştirilmedi.',
    ocrNotConfigured:
      'Metin tanıma (OCR) kapalı: görüntü destekli bir yapay zekâ modeli yapılandırılmamış. Ayarlamak için LLMSETTINGS komutunu çalıştırın.',
    recognizing: '{count} metin satırı tanınıyor…',
    ocrFailed:
      'Metin tanıma (OCR) başarısız oldu: {message}. Metni kendiniz yazın veya yapay zekâ modelini kontrol etmek için LLMSETTINGS komutunu çalıştırın.',
    noCandidates: 'Seçimde metne benzer çizgi bulunamadı.',
    summary:
      '{converted} metin satırı dönüştürüldü, {automatic} tanesi otomatik tanındı; {skipped} atlandı.'
  },
  pdfscale: {
    firstPoint: 'Bilinen mesafenin ilk noktasını belirtin',
    secondPoint: 'İkinci noktayı belirtin',
    realLength: 'Gerçek uzunluğu girin (ölçülen {measured})',
    realLengthFromDimensions:
      'Gerçek uzunluğu girin (ölçülen {measured}; ölçü metinleri 1:{scale} gösteriyor)',
    zeroDistance: 'İki nokta aynı.',
    applied: '{count} nesne {factor} faktörüyle ölçeklendi.'
  }
}

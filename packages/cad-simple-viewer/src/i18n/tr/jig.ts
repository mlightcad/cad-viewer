import enJig from '../en/jig'

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
  dimlinear: {
    ...enJig.dimlinear,
    xLine1Point: 'İlk uzatma çizgisinin başlangıç noktasını belirtin',
    xLine2Point: 'İkinci uzatma çizgisinin başlangıç noktasını belirtin',
    dimLinePoint: 'Ölçü çizgisi konumunu belirtin'
  },
  dimaligned: { ...enJig.dimaligned },
  dimradius: { ...enJig.dimradius },
  dimdiameter: { ...enJig.dimdiameter },
  dimangular: { ...enJig.dimangular },
  dimarc: { ...enJig.dimarc },
  dimordinate: { ...enJig.dimordinate },
  dimcontinue: { ...enJig.dimcontinue },
  dimbaseline: { ...enJig.dimbaseline },
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
    startPoint: 'Specify leader start point',
    nextPoint: 'Specify next point',
    nextPointOrOptions:
      'Specify next point or [Annotation/Format/Undo]',
    formatPrompt: 'Enter leader format option [Spline/STraight/Arrow/None]',
    annotationText: 'Enter first line of annotation text or <options>',
    nextAnnotationLine: 'Enter next line of annotation text',
    annotationOptions:
      'Enter an annotation option [Tolerance/Copy/Block/None/Mtext]',
    selectAnnotation: 'Select an annotation object to copy',
    rejectAnnotation: 'Object cannot be used as a leader annotation.',
    toleranceUnavailable:
      'Geometric Tolerance dialog is not available in this build.',
    keywords: {
      annotation: {
        display: 'Annotation(A)',
        local: 'Annotation',
        global: 'Annotation'
      },
      format: {
        display: 'Format(F)',
        local: 'Format',
        global: 'Format'
      },
      undo: { display: 'Undo(U)', local: 'Undo', global: 'Undo' },
      spline: {
        display: 'Spline(S)',
        local: 'Spline',
        global: 'Spline'
      },
      straight: {
        display: 'STraight(T)',
        local: 'STraight',
        global: 'STraight'
      },
      arrow: { display: 'Arrow(A)', local: 'Arrow', global: 'Arrow' },
      none: { display: 'None(N)', local: 'None', global: 'None' },
      tolerance: {
        display: 'Tolerance',
        local: 'Tolerance',
        global: 'Tolerance'
      },
      copy: { display: 'Copy(C)', local: 'Copy', global: 'Copy' },
      block: { display: 'Block(B)', local: 'Block', global: 'Block' },
      mtext: { display: 'Mtext(M)', local: 'Mtext', global: 'Mtext' }
    }
  },
  mleader: {
    arrowheadOrOptions:
      'Specify leader arrowhead location or [leader Landing first/Content first/Options]',
    landingLocation: 'Specify leader landing location',
    landingFirstPoint: 'Specify leader landing location',
    arrowheadLocation: 'Specify leader arrowhead location',
    contentLocation: 'Specify content location',
    nextPoint: 'Specify next point',
    optionsPrompt:
      'Enter an option [Leader type/landing/Content type/Maxpoints/First angle/Second angle/eXit options]',
    leaderTypePrompt: 'Select a leader type [Straight/sPline/None]',
    landingPrompt: 'Use landing [Yes/No]',
    landingLength: 'Specify landing distance',
    contentTypePrompt: 'Select a content type [Block/Mtext/None]',
    maxPoints: 'Enter the maximum points for leader line',
    firstAngle: 'Enter first angle constraint',
    secondAngle: 'Enter second angle constraint',
    keywords: {
      landingFirst: {
        display: 'Landing first(L)',
        local: 'Landing first',
        global: 'Landing first'
      },
      contentFirst: {
        display: 'Content first(C)',
        local: 'Content first',
        global: 'Content first'
      },
      options: {
        display: 'Options(O)',
        local: 'Options',
        global: 'Options'
      },
      leaderType: {
        display: 'Leader type(T)',
        local: 'Leader type',
        global: 'Leader type'
      },
      landing: {
        display: 'lAnding(A)',
        local: 'lAnding',
        global: 'lAnding'
      },
      contentType: {
        display: 'Content type(C)',
        local: 'Content type',
        global: 'Content type'
      },
      maxpoints: {
        display: 'Maxpoints(M)',
        local: 'Maxpoints',
        global: 'Maxpoints'
      },
      firstAngle: {
        display: 'First angle(F)',
        local: 'First angle',
        global: 'First angle'
      },
      secondAngle: {
        display: 'Second angle(S)',
        local: 'Second angle',
        global: 'Second angle'
      },
      exitOptions: {
        display: 'eXit options(X)',
        local: 'eXit options',
        global: 'eXit options'
      },
      straight: {
        display: 'Straight(S)',
        local: 'Straight',
        global: 'Straight'
      },
      spline: {
        display: 'sPline(P)',
        local: 'sPline',
        global: 'sPline'
      },
      noneLeader: {
        display: 'None(N)',
        local: 'None',
        global: 'None'
      },
      yes: { display: 'Yes(Y)', local: 'Yes', global: 'Yes' },
      no: { display: 'No(N)', local: 'No', global: 'No' },
      block: { display: 'Block(B)', local: 'Block', global: 'Block' },
      mtext: { display: 'Mtext(M)', local: 'Mtext', global: 'Mtext' },
      none: { display: 'None(N)', local: 'None', global: 'None' }
    }
  },
  mleaderedit: {
    selectMLeader: 'Select a multileader',
    rejectMLeader: 'Must select a multileader.',
    arrowheadOrRemove:
      'Specify leader arrowhead location or [Remove leaders]',
    selectLeaderToRemove: 'Specify a leader to remove or press Enter to finish',
    cannotRemoveLast: 'Cannot remove the last leader from this multileader.',
    keywords: {
      remove: {
        display: 'Remove leaders(R)',
        local: 'Remove',
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
        display: 'toLerance(L)',
        local: 'toLerance',
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
  sysvar: {
    prompt: 'Lütfen yeni değeri girin'
  },
  view: {
    enterName: 'Enter view name to restore',
    notFound: 'View "{name}" was not found.'
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
    originOrOptions: 'Specify origin of UCS or',
    pointOnXAxis: 'Specify point on X-axis or',
    pointOnXyPlane: 'Specify point on XY plane or',
    rotationAngle: 'Specify rotation angle about {axis} axis',
    zAxisOrigin: 'Specify new origin point',
    pointOnZAxis: 'Specify point on positive portion of Z-axis',
    selectObject: 'Select object to align UCS',
    namedOption: 'Enter an option',
    enterName: 'Enter name of UCS to restore or [?]',
    saveName: 'Enter name to save current UCS',
    deleteName: 'Enter UCS name(s) to delete',
    noPrevious: 'No previous UCS in this session.',
    noNamed: 'No named UCS definitions.',
    notFound: 'UCS "{name}" not found.',
    invalidName: 'Invalid UCS name.',
    invalidObject: 'Cannot align UCS to the selected object.',
    keywords: {
      named: {
        display: 'NAmed(A)',
        local: 'Named',
        global: 'Named'
      },
      object: {
        display: 'OBject(B)',
        local: 'Object',
        global: 'Object'
      },
      previous: {
        display: 'Previous(P)',
        local: 'Previous',
        global: 'Previous'
      },
      view: {
        display: 'View(V)',
        local: 'View',
        global: 'View'
      },
      world: {
        display: 'World(W)',
        local: 'World',
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
        display: 'ZAxis(N)',
        local: 'ZAxis',
        global: 'ZAxis'
      },
      apply: {
        display: 'Apply(L)',
        local: 'Apply',
        global: 'Apply'
      },
      restore: {
        display: 'Restore(R)',
        local: 'Restore',
        global: 'Restore'
      },
      save: {
        display: 'Save(S)',
        local: 'Save',
        global: 'Save'
      },
      delete: {
        display: 'Delete(D)',
        local: 'Delete',
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
    enterNameOrBlank:
      'Grup adını girin veya adsız için Enter tuşuna basın',
    enterGroupName: 'Grup adını girin',
    selectableSet: 'Grup {name} seçilebilir = {value}',
    orderOption: 'Sıralama seçeneğini girin',
    fromPosition: 'Yeniden sıralanacak nesnenin konum numarasını girin (0 tabanlı)',
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
  }
}

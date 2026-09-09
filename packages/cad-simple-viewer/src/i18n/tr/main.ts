export default {
  document: {
    untitled: 'Adsız'
  },
  commandLine: {
    noLast: '(önceki komut yok)',
    unknownCommand: 'Bilinmeyen komut',
    executed: 'Komut çalıştırıldı',
    showHistory: 'Komut geçmişini göster',
    placeholder: 'Komut girin',
    showMessages: 'Mesaj geçmişini göster',
    canceled: '*İptal edildi*',
    noHistory: '(geçmiş yok)',
    invalidInput: 'Geçersiz giriş.',
    close: 'Komut satırını kapat'
  },
  mobileCommand: {
    length: 'Uzunluk',
    angle: 'Açı',
    dx: 'ΔX',
    dy: 'ΔY',
    x: 'X',
    y: 'Y',
    confirm: 'Onayla',
    cancel: 'İptal',
    help: 'Yardım',
    back: 'Geri',
    collapse: 'Daralt',
    expand: 'Genişlet'
  },
  inputManager: {
    firstCorner: 'İlk köşeyi belirtin veya',
    secondCorner: 'İkinci köşeyi belirtin veya'
  },
  message: {
    fetchingDrawingFile: 'Dosya alınıyor ...',
    exportingDxf: 'DXF dışa aktarılıyor ...',
    exportingEntityPreview: 'Görüntü dışa aktarılıyor ...',
    collectingMemoryProfile: 'Bellek analiz ediliyor ...',
    fontCached: 'Yazı tipi başarıyla önbelleğe alındı',
    fontCacheFailed: 'Yazı tipi önbelleğe alınamadı',
    fontsNotFound: 'Yazı tipi deposunda bulunamadı: {fonts}.',
    fontsNotLoaded: 'Yazı tipleri yüklenemedi: {fonts}.',
    fontMissedInDrawing:
      '"{font}" yazı tipi {count} metin nesnesi tarafından gerekli, ancak kullanılamıyor. "{replacementFont}" ile gösteriliyor.',
    fontMissedReplacement: '"{font}" ("{replacement}" ile gösteriliyor)',
    failedToGetAvaiableFonts: '"{url}" adresinden yazı tipleri alınamadı!',
    failedToOpenFile: '"{fileName}" dosyası açılamadı!',
    failedToOpenFileWorkerOom:
      '"{fileName}" açılamadı. Çizim mevcut bellek için çok büyük.',
    failedToOpenFileWorkerTimeout:
      '"{fileName}" açılamadı. Çizim ayrıştırılırken işlem zaman aşımına uğradı.',
    failedToOpenFileFontLoadFailed:
      '"{fileName}" açılamadı. Gerekli yazı tipleri yüklenemedi.',
    failedToOpenFileLicenseExpired:
      '"{fileName}" açılamadı. DWG dönüştürücü lisansı süresi dolmuş.',
    failedToOpenFileLicenseInvalid:
      '"{fileName}" açılamadı. DWG dönüştürücü lisansı eksik veya geçersiz.',
    unknownEntities:
      'Bu çizim {count} bilinmeyen veya desteklenmeyen varlık içeriyor! Bu varlıklar gösterilmeyecek.',
    tianzhengEntities:
      'Bu çizim TArch / Tianzheng (veya benzeri üçüncü taraf) özel varlıklar içeriyor (yaklaşık {count}). Bu ortamda tam olarak ayrıştırılamazlar, bu nedenle bazı içerikler görüntülenmeyebilir.',
    emptyProxyEntities:
      'Bu çizim proxy grafiği olmayan {count} özel varlık içeriyor! Bu varlıklar gösterilmeyecek.'
  },
  notification: {
    center: {
      title: 'Bildirimler',
      clearAll: 'Tümünü Temizle',
      noNotifications: 'Bildirim yok'
    },
    group: {
      fontMissed: 'Eksik Yazı Tipleri',
      fontMissedSummary:
        '{count} yazı tipi ile ilgili mesaj. Ayrıntılar için tıklayın.',
      unsupportedEntities: 'Desteklenmeyen Varlıklar',
      unsupportedEntitiesSummary:
        '{count} ayrıştırma ile ilgili mesaj. Ayrıntılar için tıklayın.',
      genericSummary: '{count} mesaj. Ayrıntılar için tıklayın.'
    },
    title: {
      failedToOpenFile: 'Dosya Açılamadı',
      failedToOpenFileWorkerOom: 'Çizim Çok Büyük',
      failedToOpenFileWorkerTimeout: 'Açma Zaman Aşımı',
      failedToOpenFileFontLoadFailed: 'Yazı Tipi Yüklenemedi',
      failedToOpenFileLicenseExpired: 'Lisans Süresi Doldu',
      failedToOpenFileLicenseInvalid: 'Geçersiz Lisans',
      fontNotFound: 'Yazı Tipi Bulunamadı',
      fontNotLoaded: 'Yazı Tipi Yüklenemedi',
      parsingWarning: 'Çizim Ayrıştırma Sorunları',
      systemMessage: 'Sistem Mesajı',
      systemWarning: 'Sistem Uyarısı',
      systemError: 'Sistem Hatası',
      systemInfo: 'Sistem Bilgisi'
    }
  },
  progress: {
    start: 'Dosya ayrıştırma başlatılıyor ...',
    parse: 'Dosya ayrıştırılıyor ...',
    font: 'Bu çizim için gerekli yazı tipleri indiriliyor ...',
    ltype: 'Çizgi tipleri ayrıştırılıyor ...',
    style: 'Metin stilleri ayrıştırılıyor ...',
    dimstyle: 'Ölçülendirme stilleri ayrıştırılıyor ...',
    layer: 'Katmanlar ayrıştırılıyor ...',
    vport: 'Görüntü portları ayrıştırılıyor ...',
    blockrecord: 'Blok kaydı ayrıştırılıyor ...',
    header: 'Başlık ayrıştırılıyor ...',
    block: 'Bloklar ayrıştırılıyor ...',
    entity: 'Nesneler ayrıştırılıyor ...',
    object: 'Adlandırılmış sözlükler ayrıştırılıyor ...',
    rendering: 'Çizim render ediliyor ...',
    end: 'Tamamlandı!'
  },
  about: {
    title: 'Hakkında',
    close: 'Kapat',
    product: 'CAD Viewer',
    tagline: 'DWG ve DXF çizimleri için yüksek performanslı web CAD görüntüleyici.',
    website: 'Web sitesi',
    docs: 'Belgeler',
    repository: 'GitHub',
    copyright: '© {year} mlightcad. Tüm hakları saklıdır.',
    ok: 'Tamam'
  },
  drawStyle: {
    color: 'Renk',
    fontSize: 'Yazı yüksekliği'
  },
  shortCutToolbar: {
    more: 'Daha fazla',
    undo: 'Geri al',
    redo: 'Yinele',
    erase: 'Sil',
    collapse: 'Araç çubuğunu daralt',
    expand: 'Araç çubuğunu genişlet'
  },
  textHeight: {
    title: 'Yazı Yüksekliği',
    close: 'Kapat',
    ok: 'Tamam',
    cancel: 'İptal',
    adaptive: 'Ekrana uyarla',
    custom: 'Özel yazı yüksekliği',
    customPlaceholder: 'Dünya yüksekliği',
    fromScreen: 'Ekran boyutundan',
    fromScreenHint:
      'Geçerli yakınlaştırmada ekranda istediğiniz yazı boyutunu girin. Sabit bir dünya yüksekliğine dönüştürülür; sonra yakınlaştırınca bu yükseklik değişmez.',
    screenPxPlaceholder: 'Yazı boyutu',
    screenUnit: 'px',
    convert: 'Dönüştür'
  },
  entityPick: {
    cancel: 'Seçimi iptal et'
  },
  colorPicker: {
    title: 'Renk Seç',
    close: 'Kapat',
    ok: 'Tamam',
    cancel: 'İptal',
    index: 'Renk İndeksi: ',
    rgb: 'RGB: ',
    input: 'Renk',
    inputPlaceholder: '1-255 veya #RRGGBB'
  },
  touchPointTutorial: {
    title: 'Noktalar nasıl hassas seçilir?',
    description:
      'Ekranda yaklaşık 1 saniye basılı tutun. Parmağınızın üstünde bir artı belirir ve hareket ederken geometriye yapışarak daha doğru seçim yapmanızı sağlar.',
    snoozeToday: 'Bugün tekrar hatırlatma',
    hideForever: 'Bir daha hatırlatma',
    ok: 'Anladım'
  }
}

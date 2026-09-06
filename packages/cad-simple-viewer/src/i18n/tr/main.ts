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
      '"{fileName}" açılamadı. DWG dönüştürücü lisansı eksik veya geçersiz.'
  },
  notification: {
    title: {
      failedToOpenFile: 'Dosya Açılamadı',
      failedToOpenFileWorkerOom: 'Çizim Çok Büyük',
      failedToOpenFileWorkerTimeout: 'Açma Zaman Aşımı',
      failedToOpenFileFontLoadFailed: 'Yazı Tipi Yüklenemedi',
      failedToOpenFileLicenseExpired: 'Lisans Süresi Doldu',
      failedToOpenFileLicenseInvalid: 'Geçersiz Lisans'
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

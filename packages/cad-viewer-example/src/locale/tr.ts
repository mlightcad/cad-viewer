export default {
  command: {
    ACAD: {
      quit: {
        description: 'Uygulamadan çıkar ve tüm açık çizimleri kapatır'
      },
      exit: {
        description: 'Uygulamadan çıkar ve tüm açık çizimleri kapatır'
      }
    }
  },

  example: {
    fileUpload: {
      title: 'Görüntülenecek CAD Dosyasını Seçin',
      subtitle: 'DWG veya DXF çizimlerini görüntüleyiciye aktarın',
      newDrawing: 'Yeni Çizim',
      or: 'veya',
      dropFile: 'Dosyayı bırakın veya',
      browse: 'göz atın',

      openOptions: 'Açma seçenekleri',

      initialView: 'İlk görünüm',
      auto: 'Otomatik',
      autoHint: 'Erişim moduna göre',
      extents: 'Kapsam',
      extentsHint: 'Çizimi sığdır',
      saved: 'Kayıtlı',
      savedHint: 'AutoCAD kayıtlı görünümü',

      accessMode: 'Erişim modu',
      read: 'Oku',
      readHint: 'Yalnızca görüntüle',
      review: 'İnceleme',
      reviewHint: 'Görüntüle ve incele',
      write: 'Yaz',
      writeHint: 'Tam erişim',

      textRendering: 'Metin oluşturma',
      worker: 'İşçi',
      workerHint: 'Daha hızlı, daha fazla bellek',
      mainThread: 'Ana iş parçacığı',
      mainThreadHint: 'Daha yavaş, daha az bellek',

      progressive: 'Aşamalı',
      progressiveRendering: 'Aşamalı oluşturma',
      on: 'Açık',
      progressiveOnHint: 'Yükleme sırasında geometriyi göster',
      off: 'Kapalı',
      progressiveOffHint: 'Dönüşüm tamamlanana kadar bekle',

      nonPlottable: 'Yazdırılamayan',
      nonPlottableLayers: 'Yazdırılamayan katmanlar',
      hide: 'Gizle',
      hideHint: 'Web görüntüleyici varsayılanı',
      show: 'Göster',
      showHint: 'AutoCAD düzenleyici semantiği',

      curveQuality: 'Eğri kalitesi',
      curveDraft: 'Bellek',
      curveDraftHint: 'Daha az tepe noktası, daha küçük dosyalar',
      curveStandard: 'Standart',
      curveStandardHint: 'Dengeli (daire başına 100 kenar)',
      curveHigh: 'Kalite',
      curveHighHint: 'Daha pürüzsüz eğriler, daha fazla bellek',

      paperSpaceBackground: 'Kağıt alanı arka planı',
      paperSpaceWhite: 'Beyaz',
      paperSpaceWhiteHint: 'Masaüstü CAD / yazdırma önizlemesi',
      paperSpaceBlack: 'Siyah',
      paperSpaceBlackHint: 'Web görüntüleyici tercihi',

      invalidFileType:
        'Geçersiz dosya türü. Lütfen DWG veya DXF dosyaları yükleyin.'
    }
  }
}

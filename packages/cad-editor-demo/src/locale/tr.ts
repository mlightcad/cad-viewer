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
      fontCdnNotice:
        'Ağ erişimi kısıtlı bir ülke veya bölgedeyseniz lütfen bir VPN açın. Varsayılan yazı tipi dosyaları GitHub üzerinde barındırılır; erişim kısıtlıyken çok yavaş yüklenirler, bu da çizimlerin geç açılmasına veya metinlerin doğru görüntülenmemesine neden olabilir.',
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
      progressiveOnHint:
        'Ayrıştırma/dönüşüm bitene kadar arayüzü kilitle; sonra sahne yüklenirken pan/zoom',
      off: 'Kapalı',
      progressiveOffHint: 'Varlık ve metin geometrisi dönüşene kadar bekle',

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

      paperSpaceBackground: 'Kağıt arka planı',
      paperSpaceWhite: 'Beyaz',
      paperSpaceWhiteHint: 'Masaüstü CAD / yazdırma önizlemesi',
      paperSpaceBlack: 'Siyah',
      paperSpaceBlackHint: 'Web görüntüleyici tercihi',

      export: 'Dışa aktarma',
      exportEnable: 'Etkin',
      exportEnableHint: 'DXF/HTML/PDF/SVG/PNG dışa aktarmaya izin ver',
      exportDisable: 'Devre dışı',
      exportDisableHint:
        'Dışa aktarma komutlarını ve File menü öğelerini gizle',

      invalidFileType:
        'Geçersiz dosya türü. Lütfen DWG veya DXF dosyaları yükleyin.'
    }
  }
}

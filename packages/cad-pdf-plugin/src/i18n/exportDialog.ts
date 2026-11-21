import type { AcApLocale } from '@mlightcad/cad-simple-viewer'

/** Dialog copy for the pdf export dialog, one record per locale. */
export const pdfExportDialogCopy: Record<AcApLocale, Record<string, string>> = {
  en: {
    title: 'Export to PDF',
    modelSpaceSection: 'Model space',
    modelSpaceDisplay: 'Display',
    modelSpaceDisplayHint: 'Export what is currently shown in the viewport',
    modelSpaceExtents: 'Extents',
    modelSpaceExtentsHint:
      'Export the extents of all objects in the current space',
    paperSpaceSection: 'Paper space',
    exportLayouts: 'Export layouts',
    exportLayoutsHint: 'Include paper-space layouts as additional PDF pages',
    exportEmptyLayouts: 'Export empty layouts',
    exportEmptyLayoutsHint:
      'Include paper-space layouts that have no drawing content as blank PDF pages',
    textModeSection: 'Text',
    textMode: 'Text rendering',
    textModeText: 'Text objects',
    textModeTextHint:
      'Keep text selectable/searchable and shrink the file (SHX text stays vector)',
    textModeVector: 'Vector outlines',
    textModeVectorHint:
      'Convert text to lines and fills, matching the screen, but the file is larger',
    colorModeSection: 'Color',
    colorModeColor: 'Color',
    colorModeColorHint: 'Keep the drawing colors as shown on screen',
    colorModeMonochrome: 'Monochrome',
    colorModeMonochromeHint:
      'White paper with black lines and text; filled areas print in grey',
    yes: 'Yes',
    no: 'No'
  },
  zh: {
    title: '导出为 PDF',
    modelSpaceSection: '模型空间',
    modelSpaceDisplay: '显示',
    modelSpaceDisplayHint: '导出当前视口中显示的内容',
    modelSpaceExtents: '范围',
    modelSpaceExtentsHint: '导出当前空间中所有对象的范围',
    paperSpaceSection: '图纸空间',
    exportLayouts: '导出布局',
    exportLayoutsHint: '将图纸空间布局作为额外的 PDF 页面导出',
    exportEmptyLayouts: '导出空布局',
    exportEmptyLayoutsHint:
      '将没有任何图形内容的图纸空间布局导出为空白 PDF 页面',
    textModeSection: '文字',
    textMode: '文字渲染方式',
    textModeText: '文字对象',
    textModeTextHint:
      '文字保留为可选中/可搜索的文字对象，文件显著减小（SHX 文字仍按矢量输出）',
    textModeVector: '矢量轮廓',
    textModeVectorHint: '文字转换为线条和填充，与屏幕显示一致，但文件较大',
    colorModeSection: '颜色',
    colorModeColor: '彩色',
    colorModeColorHint: '保留图纸中的实体颜色',
    colorModeMonochrome: '黑白',
    colorModeMonochromeHint:
      '白色底纸，线条和文字为黑色，填充区域为灰色，适合打印',
    yes: '是',
    no: '否'
  },
  ja: {
    title: 'PDF に書き出し',
    modelSpaceSection: 'モデル空間',
    modelSpaceDisplay: '表示',
    modelSpaceDisplayHint: 'ビューポートに現在表示されている内容を書き出します',
    modelSpaceExtents: 'オブジェクト範囲',
    modelSpaceExtentsHint:
      '現在の空間にあるすべてのオブジェクトの範囲を書き出します',
    paperSpaceSection: 'ペーパー空間',
    exportLayouts: 'レイアウトを書き出す',
    exportLayoutsHint:
      'ペーパー空間のレイアウトを追加の PDF ページとして含めます',
    exportEmptyLayouts: '空のレイアウトを書き出す',
    exportEmptyLayoutsHint:
      '図形のないペーパー空間レイアウトを空白の PDF ページとして含めます',
    textModeSection: '文字',
    textMode: '文字の描画',
    textModeText: '文字オブジェクト',
    textModeTextHint:
      '文字を選択・検索可能なまま保持し、ファイルを小さくします (SHX 文字はベクトルのまま)',
    textModeVector: 'ベクトル輪郭',
    textModeVectorHint:
      '文字を線と塗り潰しに変換して画面表示と一致させますが、ファイルが大きくなります',
    colorModeSection: '色',
    colorModeColor: 'カラー',
    colorModeColorHint: '画面に表示されている図面の色を保持します',
    colorModeMonochrome: 'モノクロ',
    colorModeMonochromeHint:
      '白い用紙に黒い線と文字。塗り潰し領域はグレーで印刷されます',
    yes: 'はい',
    no: 'いいえ'
  },
  ko: {
    title: 'PDF로 내보내기',
    modelSpaceSection: '모형 공간',
    modelSpaceDisplay: '화면표시',
    modelSpaceDisplayHint: '현재 뷰포트에 표시된 내용 내보내기',
    modelSpaceExtents: '범위',
    modelSpaceExtentsHint: '현재 공간에 있는 모든 객체의 범위 내보내기',
    paperSpaceSection: '도면 공간',
    exportLayouts: '배치 내보내기',
    exportLayoutsHint: '도면 공간 배치를 추가 PDF 페이지로 포함',
    exportEmptyLayouts: '빈 배치 내보내기',
    exportEmptyLayoutsHint:
      '도면 내용이 없는 도면 공간 배치를 빈 PDF 페이지로 포함',
    textModeSection: '문자',
    textMode: '문자 렌더링',
    textModeText: '문자 객체',
    textModeTextHint:
      '문자를 선택/검색 가능하게 유지하고 파일 크기를 줄입니다(SHX 문자는 벡터로 유지)',
    textModeVector: '벡터 윤곽선',
    textModeVectorHint:
      '문자를 선과 채우기로 변환하여 화면과 일치시키지만 파일이 커집니다',
    colorModeSection: '색상',
    colorModeColor: '색상',
    colorModeColorHint: '화면에 표시된 도면 색상 유지',
    colorModeMonochrome: '단색',
    colorModeMonochromeHint:
      '흰색 용지에 검은색 선과 문자로 출력하며 채워진 영역은 회색으로 출력합니다',
    yes: '예',
    no: '아니요'
  },
  tr: {
    title: 'PDF\'e Dışa Aktar',
    modelSpaceSection: 'Model alanı',
    modelSpaceDisplay: 'Görüntü',
    modelSpaceDisplayHint:
      'Görünüm alanında şu an gösterilen içeriği dışa aktar',
    modelSpaceExtents: 'Kapsam',
    modelSpaceExtentsHint:
      'Geçerli alandaki tüm nesnelerin kapsamını dışa aktar',
    paperSpaceSection: 'Kağıt alanı',
    exportLayouts: 'Yerleşimleri dışa aktar',
    exportLayoutsHint:
      'Kağıt alanı yerleşimlerini ek PDF sayfaları olarak dahil et',
    exportEmptyLayouts: 'Boş yerleşimleri dışa aktar',
    exportEmptyLayoutsHint:
      'Çizim içeriği olmayan kağıt alanı yerleşimlerini boş PDF sayfaları olarak dahil et',
    textModeSection: 'Metin',
    textMode: 'Metin işleme',
    textModeText: 'Metin nesneleri',
    textModeTextHint:
      'Metni seçilebilir/aranabilir tutar ve dosyayı küçültür (SHX metin vektör kalır)',
    textModeVector: 'Vektör konturlar',
    textModeVectorHint:
      'Metni çizgi ve dolguya dönüştürür, ekrana uygun, ancak dosya daha büyük',
    colorModeSection: 'Renk',
    colorModeColor: 'Renkli',
    colorModeColorHint: 'Çizim renklerini ekrandaki gibi korur',
    colorModeMonochrome: 'Siyah-beyaz',
    colorModeMonochromeHint:
      'Beyaz kâğıt, siyah çizgi ve metin; dolu alanlar gri basılır',
    yes: 'Evet',
    no: 'Hayır'
  },
  cs: {
    title: 'Exportovat do PDF',
    modelSpaceSection: 'Modelový prostor',
    modelSpaceDisplay: 'Zobrazení',
    modelSpaceDisplayHint: 'Exportovat obsah aktuálně zobrazený ve výřezu',
    modelSpaceExtents: 'Rozsah',
    modelSpaceExtentsHint:
      'Exportovat rozsah všech objektů v aktuálním prostoru',
    paperSpaceSection: 'Výkresový prostor',
    exportLayouts: 'Exportovat rozvržení',
    exportLayoutsHint:
      'Zahrnout rozvržení výkresového prostoru jako další stránky PDF',
    exportEmptyLayouts: 'Exportovat prázdná rozvržení',
    exportEmptyLayoutsHint:
      'Zahrnout rozvržení výkresového prostoru bez kreslicího obsahu jako prázdné stránky PDF',
    textModeSection: 'Text',
    textMode: 'Vykreslení textu',
    textModeText: 'Textové objekty',
    textModeTextHint:
      'Text zůstane volitelný/vyhledatelný a soubor se zmenší (SHX text zůstane vektorový)',
    textModeVector: 'Vektorové obrysy',
    textModeVectorHint:
      'Převede text na čáry a výplně podle obrazovky, ale soubor je větší',
    colorModeSection: 'Barvy',
    colorModeColor: 'Barevně',
    colorModeColorHint: 'Zachová barvy výkresu jako na obrazovce',
    colorModeMonochrome: 'Černobíle',
    colorModeMonochromeHint:
      'Bílý papír, čáry a text černě, vyplněné plochy šedě',
    yes: 'Ano',
    no: 'Ne'
  },
  ar: {
    title: 'تصدير إلى PDF',
    modelSpaceSection: 'مساحة النموذج',
    modelSpaceDisplay: 'العرض',
    modelSpaceDisplayHint: 'تصدير المحتوى المعروض حاليًا في نافذة العرض',
    modelSpaceExtents: 'الامتدادات',
    modelSpaceExtentsHint: 'تصدير امتدادات جميع الكائنات في المساحة الحالية',
    paperSpaceSection: 'مساحة الورق',
    exportLayouts: 'تصدير المخططات',
    exportLayoutsHint: 'تضمين مخططات مساحة الورق كصفحات PDF إضافية',
    exportEmptyLayouts: 'تصدير المخططات الفارغة',
    exportEmptyLayoutsHint:
      'تضمين مخططات مساحة الورق بلا محتوى رسم كصفحات PDF فارغة',
    textModeSection: 'النص',
    textMode: 'عرض النص',
    textModeText: 'كائنات نصية',
    textModeTextHint:
      'يبقي النص قابلاً للتحديد/البحث ويصغر الملف (نص SHX يبقى متجهًا)',
    textModeVector: 'مخططات متجهة',
    textModeVectorHint:
      'يحوّل النص إلى خطوط وتعبئة مطابقة للشاشة، لكن الملف أكبر',
    colorModeSection: 'الألوان',
    colorModeColor: 'ملون',
    colorModeColorHint: 'يحتفظ بألوان الرسم كما تظهر على الشاشة',
    colorModeMonochrome: 'أحادي اللون',
    colorModeMonochromeHint:
      'ورق أبيض مع خطوط ونصوص سوداء؛ تُطبع المساحات المعبأة بالرمادي',
    yes: 'نعم',
    no: 'لا'
  }
}

import {
  type AcApLocale,
  type AcApLocaleMessage
} from '@mlightcad/cad-simple-viewer'

import { pdfExportDialogCopy } from './exportDialog.js'

/** Ribbon and File → Export copy for the PDF plugin. */
export interface PdfChromeStrings {
  group: string
  auto: string
  importLabel: string
  scaleLabel: string
  dimLabel: string
  hatchLabel: string
  textLabel: string
  txt2mtxtLabel: string
  importTip: string
  scaleTip: string
  dimTip: string
  hatchTip: string
  textTip: string
  txt2mtxtTip: string
  autoTip: string
  exportPdf: string
}

/** Ribbon and export-menu copy for every locale. */
export const pdfChrome: Record<AcApLocale, PdfChromeStrings> = {
  en: {
    group: 'PDF',
    auto: 'Auto',
    importLabel: 'Import\nPDF',
    scaleLabel: 'Calibrate\nScale',
    dimLabel: 'Recover\nDims',
    hatchLabel: 'Recover\nHatch',
    textLabel: 'Recover\nText',
    txt2mtxtLabel: 'Combine\nText',
    importTip:
      'Import vector geometry from a PDF file, rebuilding circles, arcs and curves (PDFIMPORT).',
    scaleTip:
      'Rescale imported PDF geometry from two points of a known distance (PDFSCALE).',
    dimTip:
      'Turn exploded PDF dimensions (arrows or ticks, lines, extension lines and texts) back into dimension objects (PDFDIM).',
    hatchTip:
      'Turn the loose strokes of a PDF hatch back into a hatch with its pattern, scale and angle (PDFHATCH).',
    textTip:
      'Convert exploded PDF text strokes back into text objects (PDFTEXT).',
    txt2mtxtTip:
      'Combine selected text and mtext entities into one mtext entity (TXT2MTXT).',
    autoTip:
      'Try every available OCR provider in order after the glyph dictionary (PDFTEXT).',
    exportPdf: 'Export to PDF'
  },
  zh: {
    group: 'PDF',
    auto: '自动',
    importLabel: '导入\nPDF',
    scaleLabel: '校准\n比例',
    dimLabel: '识别\n标注',
    hatchLabel: '识别\n填充',
    textLabel: '识别\n文字',
    txt2mtxtLabel: '合并\n文字',
    importTip: '从 PDF 文件导入矢量图形，并还原圆、圆弧和曲线（PDFIMPORT）。',
    scaleTip: '根据两点之间的已知距离缩放导入的 PDF 图形（PDFSCALE）。',
    dimTip:
      '将 PDF 中被打散的标注（箭头或斜线、尺寸线、尺寸界线和文字）恢复为标注对象（PDFDIM）。',
    hatchTip:
      '将 PDF 中被打散成线段的图案填充恢复为带图案、比例和角度的图案填充（PDFHATCH）。',
    textTip: '将 PDF 中被打散的文字笔画转换回文字对象（PDFTEXT）。',
    txt2mtxtTip: '将选定的单行文字和多行文字合并为一个多行文字（TXT2MTXT）。',
    autoTip: '在字形词典之后按顺序尝试所有可用的 OCR 服务（PDFTEXT）。',
    exportPdf: '导出为PDF'
  },
  ja: {
    group: 'PDF',
    auto: '自動',
    importLabel: 'PDF\n読み込み',
    scaleLabel: '尺度\n校正',
    dimLabel: '寸法\n認識',
    hatchLabel: 'ハッチング\n認識',
    textLabel: '文字\n認識',
    txt2mtxtLabel: '文字\n結合',
    importTip:
      'PDF ファイルからベクトル図形を読み込み、円・円弧・曲線を復元します (PDFIMPORT)。',
    scaleTip:
      '既知の距離の 2 点から読み込んだ PDF 図形の尺度を変更します (PDFSCALE)。',
    dimTip:
      'PDF で分解された寸法（矢印または斜線、寸法線、寸法補助線、文字）を寸法オブジェクトに戻します (PDFDIM)。',
    hatchTip:
      'PDF で線分に分解されたハッチングを、パターン・尺度・角度付きのハッチングに戻します (PDFHATCH)。',
    textTip:
      'PDF で分解された文字のストロークを文字オブジェクトに戻します (PDFTEXT)。',
    txt2mtxtTip:
      '選択した文字およびマルチ テキストを 1 つのマルチ テキストに結合します (TXT2MTXT)。',
    autoTip: '字形辞書の後、利用可能な OCR を順に試します (PDFTEXT)。',
    exportPdf: 'PDF に書き出し'
  },
  ko: {
    group: 'PDF',
    auto: '자동',
    importLabel: 'PDF\n가져오기',
    scaleLabel: '축척\n보정',
    dimLabel: '치수\n인식',
    hatchLabel: '해치\n인식',
    textLabel: '문자\n인식',
    txt2mtxtLabel: '문자\n결합',
    importTip:
      'PDF 파일에서 벡터 형상을 가져오고 원, 호, 곡선을 복원합니다 (PDFIMPORT).',
    scaleTip:
      '알려진 거리의 두 점으로 가져온 PDF 형상의 축척을 조정합니다 (PDFSCALE).',
    dimTip:
      'PDF에서 분해된 치수(화살표 또는 사선, 치수선, 치수 보조선, 문자)를 치수 객체로 되돌립니다 (PDFDIM).',
    hatchTip:
      'PDF에서 선분으로 분해된 해치를 패턴, 축척, 각도를 가진 해치로 되돌립니다 (PDFHATCH).',
    textTip: 'PDF에서 분해된 문자 획을 문자 객체로 되돌립니다 (PDFTEXT).',
    txt2mtxtTip:
      '선택한 문자와 여러 줄 문자를 하나의 여러 줄 문자로 결합합니다 (TXT2MTXT).',
    autoTip:
      '글리프 사전 다음에 사용 가능한 OCR을 순서대로 시도합니다 (PDFTEXT).',
    exportPdf: 'PDF로 내보내기'
  },
  tr: {
    group: 'PDF',
    auto: 'Otomatik',
    importLabel: 'PDF\nİçe Aktar',
    scaleLabel: 'Ölçeği\nKalibre Et',
    dimLabel: 'Ölçüleri\nKurtar',
    hatchLabel: 'Taramaları\nKurtar',
    textLabel: 'Metni\nKurtar',
    txt2mtxtLabel: 'Metni\nBirleştir',
    importTip:
      'PDF dosyasından vektör geometriyi içe aktarır; daireleri, yayları ve eğrileri yeniden oluşturur (PDFIMPORT).',
    scaleTip:
      'İçe aktarılan PDF geometrisini bilinen bir mesafenin iki noktasına göre ölçekler (PDFSCALE).',
    dimTip:
      'Patlatılmış PDF ölçülerini (oklar veya işaretler, çizgiler, uzatma çizgileri ve metinler) ölçü nesnelerine geri dönüştürür (PDFDIM).',
    hatchTip:
      'PDF taramasının dağınık çizgilerini deseni, ölçeği ve açısıyla birlikte taramaya geri dönüştürür (PDFHATCH).',
    textTip:
      'Patlatılmış PDF metin çizgilerini metin nesnelerine geri dönüştürür (PDFTEXT).',
    txt2mtxtTip:
      'Seçili metin ve çoklu metin nesnelerini tek bir çoklu metin nesnesinde birleştirir (TXT2MTXT).',
    autoTip:
      'Glif sözlüğünden sonra kullanılabilir OCR sağlayıcılarını sırayla dener (PDFTEXT).',
    exportPdf: 'PDF\'e Dışa Aktar'
  },
  cs: {
    group: 'PDF',
    auto: 'Automaticky',
    importLabel: 'Importovat\nPDF',
    scaleLabel: 'Kalibrovat\nměřítko',
    dimLabel: 'Obnovit\nkóty',
    hatchLabel: 'Obnovit\nšrafy',
    textLabel: 'Obnovit\ntext',
    txt2mtxtLabel: 'Sloučit\ntext',
    importTip:
      'Importuje vektorovou geometrii ze souboru PDF a obnoví kružnice, oblouky a křivky (PDFIMPORT).',
    scaleTip:
      'Změní měřítko importované geometrie PDF podle dvou bodů známé vzdálenosti (PDFSCALE).',
    dimTip:
      'Převede rozložené kóty z PDF (šipky nebo značky, čáry, vynášecí čáry a texty) zpět na kótovací objekty (PDFDIM).',
    hatchTip:
      'Převede rozložené čáry šrafy z PDF zpět na šrafu se vzorem, měřítkem a úhlem (PDFHATCH).',
    textTip:
      'Převede rozložené tahy textu z PDF zpět na textové objekty (PDFTEXT).',
    txt2mtxtTip:
      'Sloučí vybrané texty a víceřádkové texty do jednoho víceřádkového textu (TXT2MTXT).',
    autoTip:
      'Po slovníku znaků zkusí postupně všechny dostupné OCR služby (PDFTEXT).',
    exportPdf: 'Exportovat do PDF'
  },
  ar: {
    group: 'PDF',
    auto: 'تلقائي',
    importLabel: 'استيراد\nPDF',
    scaleLabel: 'معايرة\nالمقياس',
    dimLabel: 'استعادة\nالأبعاد',
    hatchLabel: 'استعادة\nالتهشير',
    textLabel: 'استعادة\nالنص',
    txt2mtxtLabel: 'دمج\nالنص',
    importTip:
      'استيراد الهندسة المتجهية من ملف PDF مع إعادة بناء الدوائر والأقواس والمنحنيات (PDFIMPORT).',
    scaleTip:
      'تغيير مقياس هندسة PDF المستوردة من نقطتين لمسافة معروفة (PDFSCALE).',
    dimTip:
      'تحويل أبعاد PDF المفككة (الأسهم أو العلامات والخطوط وخطوط الامتداد والنصوص) إلى كائنات أبعاد (PDFDIM).',
    hatchTip:
      'تحويل الخطوط المتفرقة لتهشير PDF إلى تهشير بنمطه ومقياسه وزاويته (PDFHATCH).',
    textTip: 'تحويل خطوط نص PDF المفككة إلى كائنات نصية (PDFTEXT).',
    txt2mtxtTip:
      'دمج كيانات النص والنص متعدد الأسطر المحددة في كيان نص متعدد الأسطر واحد (TXT2MTXT).',
    autoTip: 'بعد قاموس الحروف يجرّب كل خدمات OCR المتاحة بالترتيب (PDFTEXT).',
    exportPdf: 'تصدير إلى PDF'
  }
}

const LOCALES = Object.keys(pdfChrome) as AcApLocale[]

/**
 * Nested message trees for {@link AcApUiRegistry}, one per locale.
 */
export function pdfUiMessages(): Partial<
  Record<AcApLocale, AcApLocaleMessage>
> {
  const messages: Partial<Record<AcApLocale, AcApLocaleMessage>> = {}
  for (const locale of LOCALES) {
    const text = pdfChrome[locale]
    messages[locale] = {
      main: {
        mainMenu: { exportPdf: text.exportPdf },
        ribbon: {
          group: { pdf: text.group },
          pdfText: { auto: text.auto },
          tooltip: {
            importPdf: text.importTip,
            pdfScale: text.scaleTip,
            pdfDim: text.dimTip,
            pdfHatch: text.hatchTip,
            pdfText: text.textTip,
            txt2mtxt: text.txt2mtxtTip,
            pdfTextAuto: text.autoTip
          },
          command: {
            importPdf: text.importLabel,
            pdfScale: text.scaleLabel,
            pdfDim: text.dimLabel,
            pdfHatch: text.hatchLabel,
            pdfText: text.textLabel,
            txt2mtxt: text.txt2mtxtLabel
          }
        }
      },
      dialog: { exportPdfDlg: pdfExportDialogCopy[locale] }
    }
  }
  return messages
}

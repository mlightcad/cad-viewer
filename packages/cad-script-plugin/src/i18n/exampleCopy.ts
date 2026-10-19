import type { AcApLocale } from '@mlightcad/cad-simple-viewer'

import type { ScriptExampleCopyTable } from '../examples/scriptExamples'

/**
 * Localized titles and descriptions for the built-in scripts.
 *
 * Search matches these strings, so each locale describes the same example.
 */
export const scriptExampleCopyByLocale = {
  en: {
    countByType: {
      title: 'Count entities by type',
      description:
        'Walk every entity and return how many of each type are in the drawing, plus the title and current layer.'
    },
    circlesByLayer: {
      title: 'Highlight the layer with the most circles',
      description:
        'Count circles on each layer, then select every entity on the busiest layer.'
    },
    drawingOverview: {
      title: 'Drawing summary',
      description:
        'Return the title, units, current layer, extents, and whether each layer is on, frozen, or locked.'
    },
    textContents: {
      title: 'List text',
      description:
        'Collect Text, MText, and Attribute strings with their layer and entity id.'
    },
    selectCurrentLayer: {
      title: 'Select the current layer',
      description:
        'Select every entity that sits on the current layer of the drawing.'
    },
    longestLines: {
      title: 'Longest lines',
      description: 'Measure each line and select the ten longest ones.'
    },
    extentsBox: {
      title: 'Entities in part of the extents',
      description:
        'Select entities whose bounds meet the lower-left half of the drawing extents.'
    },
    blockSummary: {
      title: 'Block definitions',
      description:
        'List each block name and how many entities that block contains.'
    },
    layerTable: {
      title: 'Layer table',
      description:
        'Read cad.tables.layerTable and return each layer name and id.'
    },
    circleGrid: {
      title: 'Draw a circle grid',
      description:
        'In one undo group, create a GRID layer, draw a 4 by 3 grid of circles, and zoom to the extents.'
    },
    stampTitle: {
      title: 'Stamp the drawing title',
      description:
        'Create a NOTES layer and place the drawing title as text at the origin.'
    },
    moveSelection: {
      title: 'Move the selection',
      description:
        'Move the currently selected entities 10 units to the right. Select entities first.'
    }
  },
  zh: {
    countByType: {
      title: '按类型统计实体',
      description:
        '遍历图纸中的全部实体，返回每种类型的数量，以及图纸标题和当前图层。'
    },
    circlesByLayer: {
      title: '高亮圆最多的图层',
      description: '统计每个图层上的圆，然后选中圆数量最多的图层上的全部实体。'
    },
    drawingOverview: {
      title: '图纸概要',
      description:
        '返回标题、单位、当前图层、范围，以及每个图层的开、冻结和锁定状态。'
    },
    textContents: {
      title: '列出文字',
      description:
        '收集单行文字、多行文字和属性的字符串，以及所在图层和对象 id。'
    },
    selectCurrentLayer: {
      title: '选择当前图层',
      description: '选中位于图纸当前图层上的全部实体。'
    },
    longestLines: {
      title: '最长的直线',
      description: '测量每条直线的长度，并选中最长的十条。'
    },
    extentsBox: {
      title: '范围内的实体',
      description: '选中包围盒与图纸范围左下半区相交的实体。'
    },
    blockSummary: {
      title: '块定义',
      description: '列出每个块的名称，以及块里包含的实体数量。'
    },
    layerTable: {
      title: '图层表',
      description: '读取 cad.tables.layerTable，返回每个图层的名称和 id。'
    },
    circleGrid: {
      title: '绘制圆阵列',
      description:
        '在一次撤销组中创建 GRID 图层，绘制 4×3 的圆，然后缩放到全图。'
    },
    stampTitle: {
      title: '标注图纸标题',
      description: '创建 NOTES 图层，并在原点写入图纸标题文字。'
    },
    moveSelection: {
      title: '移动选中实体',
      description: '把当前选中的实体向右移动 10 个单位。请先选择实体。'
    }
  },
  tr: {
    countByType: {
      title: 'Türlere göre varlık sayısı',
      description:
        'Çizimdeki her varlığı dolaşır; tür sayılarını, başlığı ve geçerli katmanı döndürür.'
    },
    circlesByLayer: {
      title: 'En çok daire içeren katmanı vurgula',
      description:
        'Her katmandaki daireleri sayar, sonra en yoğun katmandaki tüm varlıkları seçer.'
    },
    drawingOverview: {
      title: 'Çizim özeti',
      description:
        'Başlık, birimler, geçerli katman, sınırlar ve her katmanın açık, donmuş ve kilitli durumunu döndürür.'
    },
    textContents: {
      title: 'Metinleri listele',
      description:
        'Text, MText ve Attribute dizelerini katman ve kimlikleriyle toplar.'
    },
    selectCurrentLayer: {
      title: 'Geçerli katmanı seç',
      description: 'Çizimin geçerli katmanındaki tüm varlıkları seçer.'
    },
    longestLines: {
      title: 'En uzun çizgiler',
      description: 'Her çizginin uzunluğunu ölçer ve en uzun on çizgiyi seçer.'
    },
    extentsBox: {
      title: 'Sınırların bir bölümündeki varlıklar',
      description: 'Sınırların sol alt yarısıyla kesişen varlıkları seçer.'
    },
    blockSummary: {
      title: 'Blok tanımları',
      description: 'Her bloğun adını ve içerdiği varlık sayısını listeler.'
    },
    layerTable: {
      title: 'Katman tablosu',
      description:
        'cad.tables.layerTable içeriğini okur; her katmanın adını ve kimliğini döndürür.'
    },
    circleGrid: {
      title: 'Daire ızgarası çiz',
      description:
        'Tek bir geri alma grubunda GRID katmanı oluşturur, 4×3 daire çizer ve görünüme sığdırır.'
    },
    stampTitle: {
      title: 'Çizim başlığını yaz',
      description:
        'NOTES katmanı oluşturur ve başlığı orijine metin olarak yerleştirir.'
    },
    moveSelection: {
      title: 'Seçimi taşı',
      description: 'Seçili varlıkları 10 birim sağa taşır. Önce varlık seçin.'
    }
  },
  cs: {
    countByType: {
      title: 'Počet entit podle typu',
      description:
        'Projde všechny entity a vrátí počty podle typu, název výkresu a aktuální hladinu.'
    },
    circlesByLayer: {
      title: 'Zvýraznit hladinu s nejvíce kružnicemi',
      description:
        'Spočítá kružnice na každé hladině a vybere všechny entity na nejvytíženější hladině.'
    },
    drawingOverview: {
      title: 'Přehled výkresu',
      description:
        'Vrátí název, jednotky, aktuální hladinu, rozsah a stav zapnuto, zmrazeno a uzamčeno u každé hladiny.'
    },
    textContents: {
      title: 'Vypsat texty',
      description:
        'Shromáždí řetězce Text, MText a Attribute spolu s hladinou a id.'
    },
    selectCurrentLayer: {
      title: 'Vybrat aktuální hladinu',
      description: 'Vybere všechny entity na aktuální hladině výkresu.'
    },
    longestLines: {
      title: 'Nejdelší úsečky',
      description: 'Změří každou úsečku a vybere deset nejdelších.'
    },
    extentsBox: {
      title: 'Entity v části rozsahu',
      description:
        'Vybere entity, jejichž rozsah protíná levou dolní polovinu rozsahu výkresu.'
    },
    blockSummary: {
      title: 'Definice bloků',
      description: 'Vypíše název každého bloku a počet entit v něm.'
    },
    layerTable: {
      title: 'Tabulka hladin',
      description:
        'Přečte cad.tables.layerTable a vrátí název a id každé hladiny.'
    },
    circleGrid: {
      title: 'Nakreslit mřížku kružnic',
      description:
        'V jedné skupině zpět vytvoří hladinu GRID, nakreslí mřížku 4×3 a přizpůsobí pohled.'
    },
    stampTitle: {
      title: 'Vložit název výkresu',
      description:
        'Vytvoří hladinu NOTES a umístí název výkresu jako text do počátku.'
    },
    moveSelection: {
      title: 'Posunout výběr',
      description:
        'Posune vybrané entity o 10 jednotek doprava. Nejprve něco vyberte.'
    }
  },
  ar: {
    countByType: {
      title: 'عد الكيانات حسب النوع',
      description:
        'يمر على كل الكيانات ويعيد عدد كل نوع مع عنوان الرسم والطبقة الحالية.'
    },
    circlesByLayer: {
      title: 'تمييز الطبقة الأكثر دوائر',
      description:
        'يحسب الدوائر في كل طبقة ثم يحدد كل الكيانات في الطبقة الأكثر ازدحامًا.'
    },
    drawingOverview: {
      title: 'ملخص الرسم',
      description:
        'يعيد العنوان والوحدات والطبقة الحالية والمدى وحالة التشغيل والتجميد والقفل لكل طبقة.'
    },
    textContents: {
      title: 'سرد النصوص',
      description: 'يجمع نصوص Text وMText وAttribute مع الطبقة والمعرف.'
    },
    selectCurrentLayer: {
      title: 'تحديد الطبقة الحالية',
      description: 'يحدد كل الكيانات الموجودة على الطبقة الحالية للرسم.'
    },
    longestLines: {
      title: 'أطول الخطوط',
      description: 'يقيس كل خط ويحدد أطول عشرة خطوط.'
    },
    extentsBox: {
      title: 'كيانات في جزء من المدى',
      description:
        'يحدد الكيانات التي يتقاطع مداها مع النصف السفلي الأيسر من مدى الرسم.'
    },
    blockSummary: {
      title: 'تعريفات الكتل',
      description: 'يسرد اسم كل كتلة وعدد الكيانات داخلها.'
    },
    layerTable: {
      title: 'جدول الطبقات',
      description: 'يقرأ cad.tables.layerTable ويعيد اسم كل طبقة ومعرفها.'
    },
    circleGrid: {
      title: 'رسم شبكة دوائر',
      description:
        'في مجموعة تراجع واحدة ينشئ طبقة GRID ويرسم شبكة 4×3 ثم يكبّر إلى المدى.'
    },
    stampTitle: {
      title: 'ختم عنوان الرسم',
      description: 'ينشئ طبقة NOTES ويضع عنوان الرسم كنص عند الأصل.'
    },
    moveSelection: {
      title: 'تحريك التحديد',
      description:
        'يحرّك الكيانات المحددة 10 وحدات إلى اليمين. حدد كيانات أولًا.'
    }
  }
} as const satisfies Record<AcApLocale, ScriptExampleCopyTable>

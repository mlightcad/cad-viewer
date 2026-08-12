export default {
  arc: {
    startPointOrCenter: 'Zadejte počáteční bod oblouku nebo',
    secondPointOrOptions: 'Zadejte druhý bod oblouku nebo',
    secondPoint: 'Zadejte druhý bod oblouku',
    startPoint: 'Zadejte počáteční bod oblouku',
    centerPoint: 'Zadejte středový bod oblouku',
    endPoint: 'Zadejte koncový bod oblouku',
    endPointOrOptions: 'Zadejte koncový bod oblouku nebo',
    centerPointOrOptions: 'Zadejte středový bod oblouku',
    includedAngle: 'Zadejte středový úhel',
    chordLength: 'Zadejte délku tětivy',
    tangentDirection: 'Zadejte směr tečny v počátečním bodě oblouku',
    radius: 'Zadejte poloměr oblouku',
    keywords: {
      center: {
        display: 'Střed(C)',
        local: 'Střed',
        global: 'Center'
      },
      end: {
        display: 'Konec(E)',
        local: 'Konec',
        global: 'End'
      },
      angle: {
        display: 'Úhel(A)',
        local: 'Úhel',
        global: 'Angle'
      },
      chordLength: {
        display: 'délka Tětivy(L)',
        local: 'Délka tětivy',
        global: 'ChordLength'
      },
      direction: {
        display: 'Směr(D)',
        local: 'Směr',
        global: 'Direction'
      },
      radius: {
        display: 'Poloměr(R)',
        local: 'Poloměr',
        global: 'Radius'
      }
    },
    invalid: {
      threePoint:
        'Neplatný 3bodový oblouk: body jsou kolineární nebo nelze definovat oblouk.',
      center:
        'Neplatný vstup středu: počáteční a koncový bod musí ležet na stejné kružnici.',
      angle:
        'Neplatný vstup úhlu: středový úhel musí být větší než 0 a menší než 360 stupňů.',
      chordLength:
        'Neplatná délka tětivy: hodnota je mimo rozsah pro aktuální poloměr.',
      direction:
        'Neplatný směr: z tohoto směru tečny nelze sestrojit oblouk.',
      radius:
        'Neplatný poloměr: zadaný poloměr nemůže spojit počáteční a koncový bod.'
    }
  },
  circle: {
    center: 'Zadejte střed kružnice',
    centerOrOptions: 'Zadejte středový bod kružnice nebo',
    radius: 'Zadejte poloměr kružnice',
    radiusOrDiameter: 'Zadejte poloměr kružnice nebo',
    diameter: 'Zadejte průměr kružnice',
    twoPointFirst: 'Zadejte první koncový bod průměru kružnice',
    twoPointSecond: 'Zadejte druhý koncový bod průměru kružnice',
    threePointFirst: 'Zadejte první bod na kružnici',
    threePointSecond: 'Zadejte druhý bod na kružnici',
    threePointThird: 'Zadejte třetí bod na kružnici',
    keywords: {
      threeP: {
        display: '3B(3P)',
        local: '3B',
        global: '3P'
      },
      twoP: {
        display: '2B(2P)',
        local: '2B',
        global: '2P'
      },
      diameter: {
        display: 'Průměr(D)',
        local: 'Průměr',
        global: 'Diameter'
      }
    }
  },
  copy: {
    basePointOrOptions: 'Zadejte základní bod nebo',
    displacementOrArray: 'Zadejte přemístění nebo',
    secondPointOrArray: 'Zadejte druhý bod nebo',
    modePrompt: 'Zadejte volbu režimu kopírování',
    arrayItemCount:
      'Zadejte počet položek v poli včetně originálu',
    arraySecondPointOrFit: 'Zadejte druhý bod nebo',
    arrayFitSecondPoint: 'Zadejte druhý bod',
    keywords: {
      displacement: {
        display: 'Přemístění(D)',
        local: 'Přemístění',
        global: 'Displacement'
      },
      mode: {
        display: 'Režim(O)',
        local: 'Režim',
        global: 'Mode'
      },
      multiple: {
        display: 'Vícenásobné(M)',
        local: 'Vícenásobné',
        global: 'Multiple'
      },
      single: {
        display: 'Jednoduché(S)',
        local: 'Jednoduché',
        global: 'Single'
      },
      array: {
        display: 'Pole(A)',
        local: 'Pole',
        global: 'Array'
      },
      fit: {
        display: 'Přizpůsobit(F)',
        local: 'Přizpůsobit',
        global: 'Fit'
      }
    }
  },
  dimlinear: {
    xLine1Point: 'Zadejte počátek první pomocné čáry',
    xLine2Point: 'Zadejte počátek druhé pomocné čáry',
    dimLinePoint: 'Zadejte umístění kótovací čáry'
  },
  ellipse: {
    axisEndpointOrOptions: 'Zadejte koncový bod osy elipsy nebo',
    arcAxisEndpointOrCenter: 'Zadejte koncový bod osy eliptického oblouku nebo',
    center: 'Zadejte střed elipsy',
    firstAxisEndpoint: 'Zadejte koncový bod osy',
    secondAxisEndpoint: 'Zadejte druhý koncový bod osy',
    otherAxisOrRotation: 'Zadejte vzdálenost k druhé ose nebo',
    rotationAngle: 'Zadejte úhel otočení kolem hlavní osy',
    arcStartAngle: 'Zadejte počáteční úhel eliptického oblouku',
    arcEndAngle: 'Zadejte koncový úhel eliptického oblouku',
    keywords: {
      arc: {
        display: 'Oblouk(A)',
        local: 'Oblouk',
        global: 'Arc'
      },
      center: {
        display: 'Střed(C)',
        local: 'Střed',
        global: 'Center'
      },
      rotation: {
        display: 'Otočení(R)',
        local: 'Otočení',
        global: 'Rotation'
      }
    },
    invalid: {
      axis: 'Neplatný vstup osy: délka osy musí být větší než 0.',
      otherAxis: 'Neplatný vstup druhé osy: vzdálenost musí být větší než 0.',
      rotation:
        'Neplatný vstup otočení: výsledná vedlejší osa musí být větší než 0.'
    }
  },
  hatch: {
    prompt: 'Vyberte objekt hranice nebo',
    pickPoint: 'Zadejte vnitřní bod (nebo stiskněte Enter pro dokončení)',
    select: 'Vyberte objekty k šrafování',
    patternName: 'Zadejte název vzoru šrafování',
    scale: 'Zadejte měřítko vzoru šrafování',
    angle: 'Zadejte úhel vzoru šrafování',
    style: 'Zadejte styl šrafování',
    associative: 'Zadejte asociativitu',
    invalidBoundary: 'Vybrané objekty netvoří uzavřenou hranici.',
    keywords: {
      pick: {
        display: 'Vybrat body(P)',
        local: 'Vybrat body',
        global: 'PickPoints'
      },
      select: {
        display: 'Vybrat objekty(S)',
        local: 'Vybrat objekty',
        global: 'SelectObjects'
      },
      cancel: {
        display: 'Zrušit(C)',
        local: 'Zrušit',
        global: 'Cancel'
      },
      pattern: {
        display: 'Vzor(P)',
        local: 'Vzor',
        global: 'Pattern'
      },
      scale: {
        display: 'Měřítko(S)',
        local: 'Měřítko',
        global: 'Scale'
      },
      angle: {
        display: 'Úhel(A)',
        local: 'Úhel',
        global: 'Angle'
      },
      style: {
        display: 'Styl(T)',
        local: 'Styl',
        global: 'HatchStyle'
      },
      associative: {
        display: 'Asociativní(AS)',
        local: 'Asociativní',
        global: 'AssociativeMode'
      },
      normal: {
        display: 'Normální(N)',
        local: 'Normální',
        global: 'Normal'
      },
      outer: {
        display: 'Vnější(O)',
        local: 'Vnější',
        global: 'Outer'
      },
      ignore: {
        display: 'Ignorovat(I)',
        local: 'Ignorovat',
        global: 'Ignore'
      },
      yes: {
        display: 'Ano(Y)',
        local: 'Ano',
        global: 'Yes'
      },
      no: {
        display: 'Ne(N)',
        local: 'Ne',
        global: 'No'
      }
    }
  },
  hideobjects: {
    hidden: 'objekt(ů) skryto',
    restored: 'objekt(ů) obnoveno',
    nothingToRestore: 'Žádné skryté objekty k obnovení'
  },
  entout: {
    longSidePrompt: 'Zadejte velikost delší strany náhledu v pixelech',
    exported: 'náhled(ů) objektů exportováno',
    skipped: 'objekt(ů) přeskočeno',
    failed: {
      'no-preview-root': 'Nelze sestavit geometrii náhledu pro výběr',
      'no-bounds': 'Nelze vypočítat rozsah náhledu pro výběr',
      'capture-failed': 'Nelze vykreslit náhledový obrázek entity',
      'download-failed': 'Náhled byl vykreslen, ale stažení PNG selhalo'
    }
  },
  layer: {
    main: 'Zadejte volbu',
    listSummary: 'Seznam hladin byl vypsán do konzole prohlížeče',
    emptyInput: 'Nebyl zadán žádný název hladiny.',
    newPrompt: 'Zadejte název nové hladiny (nebo hladin)',
    makePrompt: 'Zadejte název hladiny, která se má stát aktuální',
    setPrompt: 'Zadejte název hladiny, která se má nastavit jako aktuální',
    onPrompt: 'Zadejte název (názvy) hladiny k zapnutí',
    offPrompt: 'Zadejte název (názvy) hladiny k vypnutí',
    freezePrompt: 'Zadejte název (názvy) hladiny ke zmrazení',
    thawPrompt: 'Zadejte název (názvy) hladiny k rozmrazení',
    lockPrompt: 'Zadejte název (názvy) hladiny k uzamčení',
    unlockPrompt: 'Zadejte název (názvy) hladiny k odemčení',
    colorLayerPrompt: 'Zadejte název (názvy) hladiny ke změně barvy',
    colorValuePrompt:
      'Zadejte barvu (ACI 1-255, RGB např. 255,0,0, nebo CSS název barvy)',
    invalidColor: 'Neplatný vstup barvy.',
    descriptionLayerPrompt: 'Zadejte název hladiny k úpravě popisu',
    descriptionValuePrompt: 'Zadejte nový popis hladiny',
    created: 'Počet vytvořených hladin',
    alreadyExists: 'Hladina již existuje',
    notFound: 'Hladina nenalezena',
    cannotChangeCurrent: 'Nelze vypnout ani zmrazit aktuální hladinu.',
    keywords: {
      list: {
        display: '?(?)',
        local: '?',
        global: '?'
      },
      make: {
        display: 'Vytvořit(M)',
        local: 'Vytvořit',
        global: 'Make'
      },
      set: {
        display: 'Nastavit(S)',
        local: 'Nastavit',
        global: 'Set'
      },
      new: {
        display: 'Nová(N)',
        local: 'Nová',
        global: 'New'
      },
      on: {
        display: 'Zapnout(ON)',
        local: 'Zapnout',
        global: 'On'
      },
      off: {
        display: 'Vypnout(OF)',
        local: 'Vypnout',
        global: 'Off'
      },
      color: {
        display: 'Barva(C)',
        local: 'Barva',
        global: 'Color'
      },
      freeze: {
        display: 'Zmrazit(F)',
        local: 'Zmrazit',
        global: 'Freeze'
      },
      thaw: {
        display: 'Rozmrazit(T)',
        local: 'Rozmrazit',
        global: 'Thaw'
      },
      lock: {
        display: 'Uzamknout(L)',
        local: 'Uzamknout',
        global: 'Lock'
      },
      unlock: {
        display: 'Odemknout(U)',
        local: 'Odemknout',
        global: 'Unlock'
      },
      description: {
        display: 'Popis(D)',
        local: 'Popis',
        global: 'Description'
      }
    }
  },
  layon: {
    alreadyOn: 'Všechny hladiny jsou již zapnuté.',
    turnedOn: 'Zapnuté hladiny'
  },
  laycur: {
    prompt: 'Vyberte objekty ke změně na aktuální hladinu',
    currentLayerNotFound: 'Aktuální hladina nenalezena.',
    noObjects: 'Nebyly vybrány žádné platné objekty.',
    alreadyCurrent: 'Vybrané objekty jsou již na aktuální hladině.',
    changed: 'Objekty změněny na aktuální hladinu'
  },
  layfrz: {
    prompt: 'Vyberte objekt na hladině ke zmrazení nebo',
    invalidSelection: 'Vybrán neplatný objekt.',
    settingsPrompt: 'Zadejte nastavení LAYFRZ ke změně',
    viewportPrompt: 'Zadejte chování zmrazení ve výřezu',
    blockSelectionPrompt: 'Zadejte chování výběru vnořeného bloku',
    vpfreezeFallback:
      'Aktuální prohlížeč nepodporuje zmrazení hladiny podle výřezu; místo toho se použije chování Zmrazit.',
    nestedSelectionLimited:
      'Nastavení výběru vnořeného bloku se uloží, ale aktuální výběr stále vyhodnocuje hladinu entity nejvyšší úrovně.',
    layerNotFound: 'Hladina nenalezena',
    cannotFreezeCurrent: 'Nelze zmrazit aktuální hladinu.',
    alreadyFrozen: 'Hladina je již zmrazená',
    frozen: 'Zmrazená hladina',
    restored: 'Obnovená hladina',
    nothingToUndo: 'Neexistuje žádná akce LAYFRZ k vrácení zpět.',
    keywords: {
      settings: {
        display: 'Nastavení(S)',
        local: 'Nastavení',
        global: 'Settings'
      },
      undo: {
        display: 'Zpět(U)',
        local: 'Zpět',
        global: 'Undo'
      },
      viewports: {
        display: 'Výřezy(V)',
        local: 'Výřezy',
        global: 'Viewports'
      },
      blockSelection: {
        display: 'Výběr bloku(B)',
        local: 'Výběr bloku',
        global: 'BlockSelection'
      },
      freeze: {
        display: 'Zmrazit(F)',
        local: 'Zmrazit',
        global: 'Freeze'
      },
      vpfreeze: {
        display: 'Zmrazit ve výřezu(V)',
        local: 'Zmrazit ve výřezu',
        global: 'Vpfreeze'
      },
      block: {
        display: 'Blok(B)',
        local: 'Blok',
        global: 'Block'
      },
      entity: {
        display: 'Entita(E)',
        local: 'Entita',
        global: 'Entity'
      },
      none: {
        display: 'Žádný(N)',
        local: 'Žádný',
        global: 'None'
      }
    }
  },
  layiso: {
    prompt: 'Vyberte objekty na hladině (hladinách) k izolaci nebo',
    settingsPrompt: 'Zadejte nastavení pro neizolované hladiny',
    offModePrompt: 'Zadejte chování vypnutí pro neizolované hladiny',
    noLayers: 'Nebyly vybrány žádné platné hladiny.',
    layerNotFound: 'Hladina nenalezena',
    isolated: 'Izolovaná hladina (hladiny)',
    affectedLayers: 'ovlivněné hladiny',
    vpfreezeFallback:
      'Aktuální prohlížeč nepodporuje zmrazení hladiny podle výřezu; místo toho se použije chování Vypnout.',
    lockFadeFallback:
      'Aktuální prohlížeč nepodporuje ztlumení zobrazení hladiny; neizolované hladiny budou uzamčeny bez ztlumení.',
    keywords: {
      settings: {
        display: 'Nastavení(S)',
        local: 'Nastavení',
        global: 'Settings'
      },
      off: {
        display: 'Vypnout(O)',
        local: 'Vypnout',
        global: 'Off'
      },
      lockAndFade: {
        display: 'Uzamknout a ztlumit(L)',
        local: 'Uzamknout a ztlumit',
        global: 'LockAndFade'
      },
      vpfreeze: {
        display: 'Zmrazit ve výřezu(V)',
        local: 'Zmrazit ve výřezu',
        global: 'Vpfreeze'
      }
    }
  },
  layuniso: {
    noPrevious: 'Neexistuje žádný předchozí stav hladin LAYISO k obnovení.',
    layerNotFound: 'Hladina nenalezena',
    nothingRestored: 'Nebyly obnoveny žádné změny hladin LAYISO.',
    restored: 'Obnovené hladiny'
  },
  laythw: {
    alreadyThawed: 'Všechny hladiny jsou již rozmrazené.',
    thawed: 'Rozmrazené hladiny'
  },
  laylck: {
    prompt: 'Vyberte objekt na hladině k uzamčení',
    invalidSelection: 'Vybrán neplatný objekt.',
    layerNotFound: 'Hladina nenalezena',
    alreadyLocked: 'Hladina je již uzamčená',
    locked: 'Uzamčená hladina'
  },
  layulk: {
    prompt: 'Vyberte objekt na hladině k odemčení',
    invalidSelection: 'Vybrán neplatný objekt.',
    layerNotFound: 'Hladina nenalezena',
    alreadyUnlocked: 'Hladina je již odemčená',
    unlocked: 'Odemčená hladina'
  },
  layoff: {
    prompt: 'Vyberte objekt na hladině k vypnutí nebo',
    invalidSelection: 'Vybrán neplatný objekt.',
    settingsPrompt: 'Zadejte nastavení LAYOFF ke změně',
    viewportPrompt: 'Zadejte chování výřezu',
    blockSelectionPrompt: 'Zadejte chování výběru vnořeného bloku',
    vpfreezeFallback:
      'Aktuální prohlížeč nepodporuje vypnutí hladiny podle výřezu; místo toho se použije chování Vypnout.',
    nestedSelectionLimited:
      'Nastavení výběru vnořeného bloku se uloží, ale aktuální výběr stále vyhodnocuje hladinu entity nejvyšší úrovně.',
    layerNotFound: 'Hladina nenalezena',
    cannotTurnOffCurrent: 'Nelze vypnout aktuální hladinu.',
    alreadyOff: 'Hladina je již vypnutá',
    turnedOff: 'Vypnutá hladina',
    restored: 'Obnovená hladina',
    nothingToUndo: 'Neexistuje žádná akce LAYOFF k vrácení zpět.',
    keywords: {
      settings: {
        display: 'Nastavení(S)',
        local: 'Nastavení',
        global: 'Settings'
      },
      undo: {
        display: 'Zpět(U)',
        local: 'Zpět',
        global: 'Undo'
      },
      viewports: {
        display: 'Výřezy(V)',
        local: 'Výřezy',
        global: 'Viewports'
      },
      blockSelection: {
        display: 'Výběr bloku(B)',
        local: 'Výběr bloku',
        global: 'BlockSelection'
      },
      off: {
        display: 'Vypnout(O)',
        local: 'Vypnout',
        global: 'Off'
      },
      vpfreeze: {
        display: 'Zmrazit ve výřezu(V)',
        local: 'Zmrazit ve výřezu',
        global: 'Vpfreeze'
      },
      block: {
        display: 'Blok(B)',
        local: 'Blok',
        global: 'Block'
      },
      entity: {
        display: 'Entita(E)',
        local: 'Entita',
        global: 'Entity'
      },
      none: {
        display: 'Žádný(N)',
        local: 'Žádný',
        global: 'None'
      }
    }
  },
  layerp: {
    restored: 'Obnoven předchozí stav hladin.',
    noPreviousState: 'Neexistuje žádný předchozí stav hladin k obnovení.'
  },
  line: {
    firstPoint: 'Zadejte první bod',
    firstPointOrContinue: 'Zadejte první bod nebo',
    nextPoint: 'Zadejte další bod',
    nextPointWithOptions: 'Zadejte další bod nebo',
    keywords: {
      continue: {
        display: 'Pokračovat(C)',
        local: 'Pokračovat',
        global: 'Continue'
      },
      undo: {
        display: 'Zpět(U)',
        local: 'Zpět',
        global: 'Undo'
      },
      close: {
        display: 'Uzavřít(C)',
        local: 'Uzavřít',
        global: 'Close'
      }
    }
  },
  xline: {
    firstPointOrOptions: 'Zadejte bod nebo',
    secondPoint: 'Zadejte druhý bod',
    throughPoint: 'Zadejte bod, kterým má přímka procházet',
    angle: 'Zadejte úhel konstrukční přímky',
    invalidDirection: 'Neplatný směr pro XLINE.',
    keywords: {
      hor: {
        display: 'Vodorovně(H)',
        local: 'Vodorovně',
        global: 'Hor'
      },
      ver: {
        display: 'Svisle(V)',
        local: 'Svisle',
        global: 'Ver'
      },
      ang: {
        display: 'Úhel(A)',
        local: 'Úhel',
        global: 'Ang'
      }
    }
  },
  ray: {
    startPoint: 'Zadejte počáteční bod',
    throughPoint: 'Zadejte bod, kterým má polopřímka procházet'
  },
  mline: {
    startPointWithOptions: 'Zadejte počáteční bod nebo',
    nextPointWithOptions: 'Zadejte další bod nebo',
    justificationPrompt: 'Zadejte typ zarovnání',
    scalePrompt: 'Zadejte měřítko multičáry',
    stylePrompt: 'Zadejte název stylu multičáry nebo [?] pro seznam',
    styleNotFound: 'Styl multičáry nenalezen',
    styleListHeader: 'Načtené styly multičáry',
    styleListEmpty: 'V aktuálním výkresu není načten žádný styl multičáry.',
    keywords: {
      justification: {
        display: 'Zarovnání(J)',
        local: 'Zarovnání',
        global: 'Justification'
      },
      scale: {
        display: 'Měřítko(S)',
        local: 'Měřítko',
        global: 'Scale'
      },
      style: {
        display: 'Styl(ST)',
        local: 'Styl',
        global: 'Style'
      },
      undo: {
        display: 'Zpět(U)',
        local: 'Zpět',
        global: 'Undo'
      },
      close: {
        display: 'Uzavřít(C)',
        local: 'Uzavřít',
        global: 'Close'
      },
      top: {
        display: 'Nahoře(T)',
        local: 'Nahoře',
        global: 'Top'
      },
      zero: {
        display: 'Nula(Z)',
        local: 'Nula',
        global: 'Zero'
      },
      bottom: {
        display: 'Dole(B)',
        local: 'Dole',
        global: 'Bottom'
      }
    }
  },
  measureAngle: {
    vertex: 'Zadejte vrchol',
    arm1: 'Zadejte bod na prvním rameni',
    arm2: 'Zadejte bod na druhém rameni'
  },
  measureArc: {
    startPoint: 'Zadejte počáteční bod oblouku',
    throughPoint: 'Zadejte bod na oblouku',
    endPoint: 'Zadejte koncový bod oblouku'
  },
  measureArea: {
    firstPoint: 'Zadejte první bod',
    nextPoint: 'Zadejte další bod (nebo stiskněte Enter pro dokončení)'
  },
  measureDistance: {
    firstPoint: 'Zadejte první bod',
    secondPoint: 'Zadejte druhý bod'
  },
  measurePoint: {
    point: 'Zadejte bod'
  },
  move: {
    basePointOrDisplacement: 'Zadejte základní bod nebo',
    secondPointOrDisplacement: 'Zadejte druhý bod nebo',
    displacement: 'Zadejte přemístění',
    keywords: {
      displacement: {
        display: 'Přemístění(D)',
        local: 'Přemístění',
        global: 'Displacement'
      }
    }
  },
  offset: {
    distance: 'Zadejte vzdálenost offsetu',
    selectObject: 'Vyberte objekt k offsetu nebo stiskněte Enter pro dokončení',
    sidePoint: 'Zadejte bod na straně pro offset',
    invalidDistance: 'Vzdálenost offsetu musí být větší než 0.',
    invalidSelection: 'Vybraný objekt nelze offsetovat.',
    offsetFailed: 'Nelze vytvořit offsetovou křivku na zadané straně.'
  },
  mtext: {
    point: 'Zadejte bod vložení víceřádkového textu'
  },
  pngout: {
    boundsFirstCorner: 'Zadejte první roh rozsahu',
    boundsSecondCorner: 'Zadejte protilehlý roh',
    longSidePrompt: 'Zadejte velikost delší strany v pixelech'
  },
  imageattach: {
    insertionPoint: 'Zadejte bod vložení:',
    scale: 'Zadejte faktor měřítka:',
    rotation: 'Zadejte úhel otočení:',
    invalidScale: 'Faktor měřítka musí být větší než 0.',
    decodeFailed: 'Nepodařilo se načíst vybraný soubor obrázku.'
  },
  insert: {
    blockName: 'Zadejte název bloku:',
    insertionPoint: 'Zadejte bod vložení:',
    scale: 'Zadejte faktor měřítka:',
    rotation: 'Zadejte úhel otočení:',
    invalidScale: 'Faktor měřítka musí být větší než 0.',
    invalidBlockName: 'Neplatný název bloku.',
    blockNotFound: 'Blok nenalezen',
    xrefNotAllowed: 'Nelze vložit externí referenci pomocí -INSERT.'
  },
  xattach: {
    insertionPoint: 'Zadejte bod vložení:',
    scale: 'Zadejte faktor měřítka:',
    rotation: 'Zadejte úhel otočení:',
    invalidScale: 'Faktor měřítka musí být větší než 0.',
    unsupportedFile: 'Vyberte soubor DWG nebo DXF.',
    loading: 'Načítám externí referenci...',
    loadFailed: 'Nepodařilo se načíst vybraný soubor výkresu.'
  },
  point: {
    point: 'Zadejte bod'
  },
  polygon: {
    numberOfSides: 'Zadejte počet stran',
    centerOrEdge: 'Zadejte střed mnohoúhelníku nebo',
    radiusOrType: 'Zadejte volby',
    edgeStart: 'Zadejte první koncový bod hrany',
    edgeEnd: 'Zadejte druhý koncový bod hrany',
    keywords: {
      edge: {
        display: 'Hrana(E)',
        local: 'Hrana',
        global: 'Edge'
      },
      inscribed: {
        display: 'Vepsaný do kružnice(I)',
        local: 'Vepsaný do kružnice',
        global: 'Inscribed'
      },
      circumscribed: {
        display: 'Opsaný kolem kružnice(C)',
        local: 'Opsaný kolem kružnice',
        global: 'Circumscribed'
      }
    },
    invalid: {
      sides: 'Neplatný počet stran. Zadejte celé číslo mezi 3 a 1024.',
      radius: 'Neplatný poloměr. Poloměr musí být větší než 0.',
      edge: 'Neplatná hrana. Délka hrany musí být větší než 0.'
    }
  },
  polyline: {
    firstPoint: 'Zadejte první bod',
    nextPoint: 'Zadejte další bod (nebo stiskněte Enter pro dokončení)',
    nextPointWithOptions: 'Zadejte další bod nebo',
    nextPointWithArcOptions: 'Zadejte další bod nebo',
    keywords: {
      arc: {
        display: 'Oblouk(A)',
        local: 'Oblouk',
        global: 'Arc'
      },
      undo: {
        display: 'Zpět(U)',
        local: 'Zpět',
        global: 'Undo'
      },
      close: {
        display: 'Uzavřít(C)',
        local: 'Uzavřít',
        global: 'Close'
      },
      line: {
        display: 'Úsečka(L)',
        local: 'Úsečka',
        global: 'Line'
      },
      angle: {
        display: 'Úhel(A)',
        local: 'Úhel',
        global: 'Angle'
      },
      center: {
        display: 'Střed(C)',
        local: 'Střed',
        global: 'Center'
      },
      secondPoint: {
        display: 'Druhý bod(P)',
        local: 'Druhý bod',
        global: 'SecondPoint'
      },
      radius: {
        display: 'Poloměr(R)',
        local: 'Poloměr',
        global: 'Radius'
      }
    },
    arcAngle: 'Zadejte úhel oblouku',
    arcCenter: 'Zadejte středový bod',
    arcSecondPoint: 'Zadejte druhý bod na oblouku',
    arcEndPoint: 'Zadejte koncový bod oblouku',
    arcRadius: 'Zadejte poloměr oblouku'
  },
  rect: {
    firstPoint: 'Zadejte první roh',
    nextPoint: 'Zadejte druhý roh',
    firstPointWithOptions: 'Zadejte první roh nebo',
    otherCornerWithOptions: 'Zadejte druhý roh nebo',
    chamferFirst: 'Zadejte první vzdálenost zkosení',
    chamferSecond: 'Zadejte druhou vzdálenost zkosení',
    filletRadius: 'Zadejte poloměr zaoblení',
    segmentWidth: 'Zadejte šířku čáry obdélníku',
    elevationValue: 'Zadejte výšku',
    thicknessValue: 'Zadejte tloušťku',
    rotationAngle: 'Zadejte úhel otočení obdélníku',
    dimensionLength: 'Zadejte délku obdélníku',
    dimensionWidth: 'Zadejte šířku obdélníku',
    areaValue: 'Zadejte plochu obdélníku',
    areaLengthOrWidth: 'Zadejte délku obdélníku',
    areaSpecifyWidth: 'Zadejte šířku obdélníku',
    invalidPositive: 'Neplatný vstup. Zadejte hodnotu větší než 0.',
    invalidRect:
      'Nelze vytvořit obdélník. Zadejte platné rohy nebo rozměry.',
    thicknessNotSupported:
      'Tloušťka obdélníku se aktuálně nezapisuje do dat entity. Nastavení tloušťky se ignoruje.',
    keywords: {
      chamfer: {
        display: 'Zkosení(C)',
        local: 'Zkosení',
        global: 'Chamfer'
      },
      elevation: {
        display: 'Výška(E)',
        local: 'Výška',
        global: 'Elevation'
      },
      fillet: {
        display: 'Zaoblení(F)',
        local: 'Zaoblení',
        global: 'Fillet'
      },
      thickness: {
        display: 'Tloušťka(T)',
        local: 'Tloušťka',
        global: 'Thickness'
      },
      width: {
        display: 'Šířka(W)',
        local: 'Šířka',
        global: 'Width'
      },
      area: {
        display: 'Plocha(A)',
        local: 'Plocha',
        global: 'Area'
      },
      dimensions: {
        display: 'Rozměry(D)',
        local: 'Rozměry',
        global: 'Dimensions'
      },
      rotation: {
        display: 'Otočení(R)',
        local: 'Otočení',
        global: 'Rotation'
      },
      length: {
        display: 'Délka(L)',
        local: 'Délka',
        global: 'Length'
      },
      rectWidth: {
        display: 'Šířka(W)',
        local: 'Šířka',
        global: 'Width'
      }
    }
  },
  rotate: {
    basePoint: 'Zadejte základní bod',
    rotationAngleOrOptions: 'Zadejte úhel otočení nebo',
    referenceAngleOrPoints: 'Zadejte referenční úhel nebo',
    firstReferencePoint: 'Zadejte první bod referenčního úhlu',
    secondReferencePoint: 'Zadejte druhý bod',
    newAngle: 'Zadejte nový úhel',
    keywords: {
      copy: {
        display: 'Kopírovat(C)',
        local: 'Kopírovat',
        global: 'Copy'
      },
      reference: {
        display: 'Reference(R)',
        local: 'Reference',
        global: 'Reference'
      },
      points: {
        display: 'Body(P)',
        local: 'Body',
        global: 'Points'
      }
    },
    invalid: {
      referencePoints: 'Neplatné referenční body: body musí být různé.'
    }
  },
  sketch: {
    firstPoint: 'Zadejte první bod',
    nextPoint: 'Zadejte koncový bod'
  },
  spline: {
    firstPoint: 'Zadejte první bod',
    nextPoint: 'Zadejte další bod (nebo stiskněte Enter pro dokončení)',
    firstPointWithOptions: 'Zadejte první bod nebo',
    nextPointWithFitOptions: 'Zadejte další bod nebo',
    nextPointWithCvOptions: 'Zadejte další řídicí bod nebo',
    methodPrompt: 'Zadejte metodu vytvoření splajnu',
    knotsPrompt: 'Zadejte parametrizaci uzlů',
    degreePrompt: 'Zadejte stupeň splajnu',
    keywords: {
      method: {
        display: 'Metoda(M)',
        local: 'Metoda',
        global: 'Method'
      },
      fit: {
        display: 'Přizpůsobit(F)',
        local: 'Přizpůsobit',
        global: 'Fit'
      },
      cv: {
        display: 'ŘB(C)',
        local: 'ŘB',
        global: 'CV'
      },
      knots: {
        display: 'Uzly(K)',
        local: 'Uzly',
        global: 'Knots'
      },
      degree: {
        display: 'Stupeň(D)',
        local: 'Stupeň',
        global: 'Degree'
      },
      undo: {
        display: 'Zpět(U)',
        local: 'Zpět',
        global: 'Undo'
      },
      close: {
        display: 'Uzavřít(C)',
        local: 'Uzavřít',
        global: 'Close'
      },
      chord: {
        display: 'Tětiva(C)',
        local: 'Tětiva',
        global: 'Chord'
      },
      sqrtChord: {
        display: 'Odmocnina tětivy(S)',
        local: 'Odmocnina tětivy',
        global: 'SqrtChord'
      },
      uniform: {
        display: 'Rovnoměrné(U)',
        local: 'Rovnoměrné',
        global: 'Uniform'
      }
    }
  },
  sysvar: {
    prompt: 'Zadejte novou hodnotu'
  },
  zoom: {
    mainPrompt: 'Zadejte roh okna nebo',
    firstCorner: 'Zadejte první roh',
    secondCorner: 'Zadejte protilehlý roh',
    centerPoint: 'Zadejte středový bod',
    heightOrScale: 'Zadejte výšku nebo faktor měřítka (nX nebo nXP)',
    scaleFactor: 'Zadejte faktor měřítka (nX nebo nXP)',
    keywords: {
      all: {
        display: 'Vše(A)',
        local: 'Vše',
        global: 'All'
      },
      center: {
        display: 'Střed(C)',
        local: 'Střed',
        global: 'Center'
      },
      extents: {
        display: 'Rozsah(E)',
        local: 'Rozsah',
        global: 'Extents'
      },
      previous: {
        display: 'Předchozí(P)',
        local: 'Předchozí',
        global: 'Previous'
      },
      scale: {
        display: 'Měřítko(S)',
        local: 'Měřítko',
        global: 'Scale'
      },
      window: {
        display: 'Okno(W)',
        local: 'Okno',
        global: 'Window'
      }
    }
  },
  chtml: {
    exportInvisibleLayers: 'Exportovat neviditelné hladiny',
    initialView: 'Počáteční pohled při otevření HTML',
    viewerMode: 'Režim offline prohlížeče',
    keywords: {
      yes: {
        display: 'Ano(Y)',
        local: 'Ano',
        global: 'Yes'
      },
      no: {
        display: 'Ne(N)',
        local: 'Ne',
        global: 'No'
      },
      extents: {
        display: 'Rozsah(E)',
        local: 'Rozsah',
        global: 'Extents'
      },
      current: {
        display: 'Aktuální(C)',
        local: 'Aktuální',
        global: 'Current'
      },
      view: {
        display: 'Pohled(V)',
        local: 'Pohled',
        global: 'View'
      },
      measure: {
        display: 'Měření(M)',
        local: 'Měření',
        global: 'Measure'
      }
    }
  }
}

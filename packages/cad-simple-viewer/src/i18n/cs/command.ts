export default {
  ACAD: {
    '-hatch': {
      description:
        'Vytváří šrafování pomocí voleb příkazového řádku bez rozhraní pásu karet'
    },
    '-layer': {
      description: 'Spravuje hladiny pomocí voleb příkazového řádku'
    },
    angbase: {
      description: 'Nastaví směr základního úhlu 0 vzhledem k aktuálnímu USS'
    },
    angdir: {
      description:
        'Určuje, zda se kladné úhly měří po směru nebo proti směru hodinových ručiček'
    },
    arc: {
      description: 'Vytvoří oblouk'
    },
    aunits: {
      description: 'Nastaví formát zobrazení úhlů'
    },
    auprec: {
      description:
        'Nastaví přesnost zobrazení úhlů, používá se společně s AUNITS'
    },
    cdxf: {
      description: 'Exportuje aktuální výkres do DXF'
    },
    cpdf: {
      description: 'Exportuje aktuální výkres do PDF'
    },
    cecolor: {
      description: 'Nastaví aktuální výchozí barvu pro nově vytvářené objekty'
    },
    celtscale: {
      description: 'Řídí měřítko typu čáry pro nově vytvářené objekty'
    },
    celtype: {
      description: 'Nastaví typ čáry pro nově vytvářené objekty'
    },
    celweight: {
      description: 'Nastaví výchozí tloušťku čáry pro nově vytvářené objekty'
    },
    cetranparency: {
      description: 'Nastaví průhlednost pro nově vytvářené objekty'
    },
    cachefont: {
      description:
        'Uloží místní soubor fontu do IndexedDB pro vykreslování textu'
    },
    circle: {
      description: 'Vytvoří jednu kružnici zadáním středu a poloměru'
    },
    clayer: {
      description: 'Nastaví aktuální hladinu pro nové objekty a operace úprav'
    },
    cmleaderstyle: {
      description: 'Nastaví název aktuálního stylu multiodkazu'
    },
    cmlscale: {
      description: 'Řídí celkovou šířku multičáry'
    },
    cmlstyle: {
      description: 'Nastaví název aktuálního stylu multičáry'
    },
    colortheme: {
      description:
        'Řídí barevný motiv uživatelského rozhraní (tmavý nebo světlý)'
    },
    copy: {
      description:
        'Kopíruje vybrané objekty vytvořením kopií na nových pozicích',
      prompt: 'Vyberte objekty'
    },
    csvg: {
      description: 'Převede aktuální výkres na SVG'
    },
    chtml: {
      description:
        'Exportuje aktuální výkres do samostatného offline souboru HTML'
    },
    '-chtml': {
      description:
        'Exportuje aktuální výkres do HTML pomocí voleb příkazového řádku'
    },
    dimlinear: {
      description: 'Vytvoří lineární kóty'
    },
    dynmode: {
      description: 'Řídí nastavení dynamického zadávání u kurzoru'
    },
    dynprompt: {
      description: 'Řídí zobrazení výzev v popiscích dynamického zadávání'
    },
    ellipse: {
      description:
        'Vytvoří elipsu nebo eliptický oblouk pomocí koncových bodů os nebo středu'
    },
    erase: {
      description: 'Odstraní vybrané objekty z výkresu',
      prompt: 'Vyberte objekty'
    },
    entout: {
      description: 'Exportuje sloučený náhledový obrázek vybraných objektů',
      prompt: 'Vyberte objekty'
    },
    hideobjects: {
      description: 'Dočasně potlačí zobrazení vybraných objektů',
      prompt: 'Vyberte objekty'
    },
    imageattach: {
      description:
        'Připojí rastrový obrázek jako externí referenci k aktuálnímu výkresu'
    },
    xattach: {
      description:
        'Připojí výkres DWG nebo DXF jako externí referenci k aktuálnímu výkresu'
    },
    gripcolor: {
      description:
        'Nastaví barvu nevybraných gripů zobrazených na vybraných objektech'
    },
    griphot: {
      description: 'Nastaví barvu vybraných (aktivních) gripů'
    },
    gripobjlimit: {
      description:
        'Potlačí zobrazení gripů, když výběr přesáhne zadaný počet objektů (0 = bez omezení)'
    },
    grips: {
      description: 'Řídí, zda se na vybraných objektech zobrazují gripy'
    },
    gripsize: {
      description: 'Nastaví velikost gripů v pixelech'
    },
    hatch: {
      description:
        'Vyplní uzavřenou oblast nebo vybrané objekty vzorem šrafování'
    },
    ipdf: {
      description: 'Importuje vektorovou geometrii ze souboru PDF'
    },
    hpang: {
      description:
        'Nastaví výchozí úhel v radiánech pro nově vytvářené vzory šrafování'
    },
    hpassoc: {
      description: 'Řídí, zda jsou nově vytvářená šrafování asociativní'
    },
    hpbackgroundcolor: {
      description:
        'Nastaví výchozí barvu pozadí pro nově vytvářené vzory šrafování'
    },
    hpcolor: {
      description: 'Nastaví výchozí barvu pro nově vytvářená šrafování'
    },
    hpdouble: {
      description:
        'Řídí, zda jsou uživatelsky definované vzory šrafování zdvojené'
    },
    hpislanddetection: {
      description:
        'Řídí, jak se nakládá s ostrůvky uvnitř nově vytvářených hranic šrafování'
    },
    hplayer: {
      description:
        'Nastaví výchozí hladinu pro nově vytvářená šrafování a výplně'
    },
    hpname: {
      description:
        'Nastaví výchozí název vzoru pro nově vytvářená šrafování v této relaci'
    },
    hpscale: {
      description: 'Nastaví výchozí měřítko pro nově vytvářené vzory šrafování'
    },
    hpseparate: {
      description:
        'Řídí, zda se pro více hranic vytvoří jeden nebo samostatné objekty šrafování'
    },
    hptransparency: {
      description:
        'Nastaví výchozí průhlednost pro nově vytvářená šrafování a výplně'
    },
    insunits: {
      description:
        'Určuje jednotky výkresu pro automatické měřítko vkládaných bloků, obrázků nebo externích referencí'
    },
    laycur: {
      description: 'Změní hladinu vybraných objektů na aktuální hladinu',
      prompt: 'Vyberte objekty pro změnu na aktuální hladinu'
    },
    laydel: {
      description: 'Odstraní hladinu a všechny objekty na této hladině'
    },
    layerclose: {
      description: 'Zavře Správce vlastností hladin'
    },
    layerp: {
      description:
        'Vrátí poslední změnu nebo sadu změn provedených v nastavení hladin'
    },
    layfrz: {
      description: 'Zmrazí hladinu vybraných objektů',
      prompt: 'Vyberte objekt na hladině ke zmrazení'
    },
    layiso: {
      description: 'Izoluje hladiny vybraných objektů',
      prompt: 'Vyberte objekty na hladinách k izolaci'
    },
    laylck: {
      description: 'Uzamkne hladinu vybraných objektů',
      prompt: 'Vyberte objekt na hladině k uzamčení'
    },
    layoff: {
      description: 'Vypne hladinu vybraných objektů',
      prompt: 'Vyberte objekt na hladině k vypnutí'
    },
    layon: {
      description: 'Zapne všechny hladiny ve výkresu'
    },
    laythw: {
      description: 'Rozmrazí všechny zmrazené hladiny ve výkresu'
    },
    layulk: {
      description: 'Odemkne hladinu vybraných objektů',
      prompt: 'Vyberte objekt na hladině k odemčení'
    },
    layuniso: {
      description: 'Obnoví hladiny skryté nebo uzamčené příkazem LAYISO'
    },
    line: {
      description: 'Kreslí úsečky mezi body'
    },
    log: {
      description: 'Zaznamenává ladicí informace do konzole'
    },
    lunits: {
      description: 'Nastaví formát zobrazení souřadnic a vzdáleností'
    },
    luprec: {
      description:
        'Nastaví přesnost zobrazení délkových jednotek, používá se společně s LUNITS'
    },
    lwdisplay: {
      description: 'Řídí, zda se ve výkresu zobrazují tloušťky čar'
    },
    clearmeasurements: {
      description: 'Odstraní z pohledu všechna aktivní měření'
    },
    measurearea: {
      description: 'Vypočítá plochu a obvod vybraných objektů nebo bodů'
    },
    measureangle: {
      description: 'Změří úhel mezi dvěma čarami nebo třemi body'
    },
    measurearc: {
      description: 'Změří délku oblouku'
    },
    measuredistance: {
      description: 'Změří vzdálenost a přírůstky mezi dvěma body'
    },
    measurement: {
      description:
        'Nastaví, zda výkres používá anglosaské (imperiální) nebo metrické jednotky'
    },
    measurementcolor: {
      description: 'Nastaví barvu použitou pro překryvy měření'
    },
    mline: {
      description:
        'Vytvoří několik rovnoběžných čar jako jeden objekt multičáry'
    },
    move: {
      description: 'Posune vybrané objekty o vektor přemístění',
      prompt: 'Vyberte objekty'
    },
    offset: {
      description:
        'Vytvoří rovnoběžné kopie křivek, lomených čar nebo kružnic v zadané vzdálenosti'
    },
    mtext: {
      description: 'Vytvoří jeden objekt víceřádkového textu'
    },
    open: {
      description: 'Otevře existující soubor výkresu'
    },
    osmode: {
      description:
        'Nastaví trvalé režimy uchopení objektů pomocí bitové hodnoty'
    },
    pan: {
      description: 'Posune pohled beze změny směru pohledu nebo zvětšení'
    },
    pickbox: {
      description:
        'Nastaví velikost (v pixelech) výběrového rámečku pro výběr objektů'
    },
    pline: {
      description: 'Vytvoří křivku zadáním více bodů'
    },
    pngout: {
      description: 'Exportuje do PNG'
    },
    point: {
      description: 'Vytvoří body'
    },
    polygon: {
      description:
        'Vytvoří pravidelný mnohoúhelník podle středu/poloměru nebo jedné hrany'
    },
    qnew: {
      description: 'Zahájí nový výkres'
    },
    ray: {
      description:
        'Vytvoří polopřímku, která začíná v bodě a pokračuje do nekonečna'
    },
    rectang: {
      description: 'Vytvoří obdélník zadáním dvou protilehlých rohů'
    },
    regen: {
      description: 'Překreslí aktuální výkres'
    },
    revcloud: {
      description: 'Vytvoří revizní obláček obdélníkového tvaru'
    },
    rotate: {
      description: 'Otočí vybrané objekty kolem základního bodu',
      prompt: 'Vyberte objekty'
    },
    select: {
      description: 'Vybírá objekty'
    },
    shortcutmenu: {
      description: 'Řídí dostupnost místních nabídek v oblasti výkresu'
    },
    sketch: {
      description:
        'Vytvoří skicovací čáru pomocí křivky, která sleduje pohyb myši'
    },
    spline: {
      description: 'Vytvoří hladkou křivku splajn zadáním řídicích bodů'
    },
    textstyle: {
      description: 'Nastaví název aktuálního textového stylu'
    },
    unitmode: {
      description:
        'Řídí zlomkové zobrazení souřadnic, když je LUNITS architektonický nebo zlomkový'
    },
    switchbg: {
      description: 'Přepíná pozadí oblasti výkresu mezi bílou a černou'
    },
    unisolateobjects: {
      description: 'Znovu zobrazí všechny objekty skryté příkazem HIDEOBJECTS'
    },
    undo: {
      description: 'Vrátí zpět poslední operaci úpravy databáze',
      nothingToUndo: 'Není co vrátit zpět.'
    },
    redo: {
      description: 'Zopakuje poslední vrácenou operaci úpravy databáze',
      nothingToRedo: 'Není co zopakovat.'
    },
    xline: {
      description:
        'Vytvoří konstrukční přímku, která se rozprostírá do nekonečna na obě strany'
    },
    zoom: {
      description: 'Zvětší na maximální rozsah všech objektů'
    }
  },
  USER: {}
}

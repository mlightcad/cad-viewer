// TODO(cs): Most Czech translations for interactive command jig prompts are not
// done yet. AcApI18n.t() has no per-key locale fallback (a missing cs key returns
// the raw key, not en), so we spread the English tree as a placeholder and override
// translated sections. Replace remaining English keys with Czech to finish the locale.
import en from '../en/jig'

export default {
  ...en,
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
  }
}

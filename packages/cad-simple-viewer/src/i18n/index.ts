import { AcApI18n, AcApLocale } from './AcApI18n'
import enCommand from './en/command'
import enJig from './en/jig'
import enMain from './en/main'
import zhCommand from './zh/command'
import zhJig from './zh/jig'
import zhMain from './zh/main'

// Register core locale messages
AcApI18n.mergeLocaleMessage('en', {
  command: enCommand,
  jig: enJig,
  main: enMain
})
AcApI18n.mergeLocaleMessage('zh', {
  command: zhCommand,
  jig: zhJig,
  main: zhMain
})

export { AcApI18n, type AcApLocale }

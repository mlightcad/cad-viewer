import { AcEdCommandStack } from '../editor/index.js'
import { AcApI18n, type AcApLocale, type AcApLocaleChangedEventArgs } from './AcApI18n.js'
import arCommand from './ar/command.js'
import arJig from './ar/jig.js'
import arMain from './ar/main.js'
import arSimpleUi from './ar/simpleUi.js'
import csCommand from './cs/command.js'
import csJig from './cs/jig.js'
import csMain from './cs/main.js'
import csSimpleUi from './cs/simpleUi.js'
import enCommand from './en/command.js'
import enJig from './en/jig.js'
import enMain from './en/main.js'
import enSimpleUi from './en/simpleUi.js'
import jaCommand from './ja/command.js'
import jaJig from './ja/jig.js'
import jaMain from './ja/main.js'
import jaSimpleUi from './ja/simpleUi.js'
import koCommand from './ko/command.js'
import koJig from './ko/jig.js'
import koMain from './ko/main.js'
import koSimpleUi from './ko/simpleUi.js'
import trCommand from './tr/command.js'
import trJig from './tr/jig.js'
import trMain from './tr/main.js'
import trSimpleUi from './tr/simpleUi.js'
import zhCommand from './zh/command.js'
import zhJig from './zh/jig.js'
import zhMain from './zh/main.js'
import zhSimpleUi from './zh/simpleUi.js'

// Register core locale messages (including built-in simple UI chrome)
AcApI18n.mergeLocaleMessage('en', {
  command: enCommand,
  jig: enJig,
  main: enMain,
  simpleUi: enSimpleUi
})
AcApI18n.mergeLocaleMessage('zh', {
  command: zhCommand,
  jig: zhJig,
  main: zhMain,
  simpleUi: zhSimpleUi
})
AcApI18n.mergeLocaleMessage('ja', {
  command: jaCommand,
  jig: jaJig,
  main: jaMain,
  simpleUi: jaSimpleUi
})
AcApI18n.mergeLocaleMessage('ko', {
  command: koCommand,
  jig: koJig,
  main: koMain,
  simpleUi: koSimpleUi
})
AcApI18n.mergeLocaleMessage('tr', {
  command: trCommand,
  jig: trJig,
  main: trMain,
  simpleUi: trSimpleUi
})
AcApI18n.mergeLocaleMessage('cs', {
  command: csCommand,
  jig: csJig,
  main: csMain,
  simpleUi: csSimpleUi
})
AcApI18n.mergeLocaleMessage('ar', {
  command: arCommand,
  jig: arJig,
  main: arMain,
  simpleUi: arSimpleUi
})

export const cmdDescription = (groupName: string, cmdName: string) => {
  const key = `command.${groupName}.${cmdName}`
  return AcApI18n.t(key)
}

export const sysCmdDescription = (name: string) => {
  return cmdDescription(AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME, name)
}

export const userCmdDescription = (name: string) => {
  return cmdDescription(AcEdCommandStack.DEFAUT_COMMAND_GROUP_NAME, name)
}

export { AcApI18n, type AcApLocale, type AcApLocaleChangedEventArgs }
export { AcUiI18n, acuiRegisterSimpleUiI18n } from './AcUiI18n.js'


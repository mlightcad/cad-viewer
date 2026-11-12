import { AcEdCommandStack } from '../editor'
import { AcApI18n, type AcApLocale, type AcApLocaleChangedEventArgs } from './AcApI18n'
import arCommand from './ar/command'
import arJig from './ar/jig'
import arMain from './ar/main'
import arSimpleUi from './ar/simpleUi'
import csCommand from './cs/command'
import csJig from './cs/jig'
import csMain from './cs/main'
import csSimpleUi from './cs/simpleUi'
import enCommand from './en/command'
import enJig from './en/jig'
import enMain from './en/main'
import enSimpleUi from './en/simpleUi'
import jaCommand from './ja/command'
import jaJig from './ja/jig'
import jaMain from './ja/main'
import jaSimpleUi from './ja/simpleUi'
import koCommand from './ko/command'
import koJig from './ko/jig'
import koMain from './ko/main'
import koSimpleUi from './ko/simpleUi'
import trCommand from './tr/command'
import trJig from './tr/jig'
import trMain from './tr/main'
import trSimpleUi from './tr/simpleUi'
import zhCommand from './zh/command'
import zhJig from './zh/jig'
import zhMain from './zh/main'
import zhSimpleUi from './zh/simpleUi'

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
export { AcUiI18n, acuiRegisterSimpleUiI18n } from './AcUiI18n'


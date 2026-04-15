import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcEdOpenMode } from '@mlightcad/cad-simple-viewer'
import { reactive } from 'vue'

export interface CommandInfo {
  globalName: string
  commandName: string
  groupName: string
  mode: AcEdOpenMode
}

export function useCommands() {
  const reactiveCommands = reactive<CommandInfo[]>([])

  const commands = AcApDocManager.instance.commandManager.iterator()
  for (const command of commands) {
    reactiveCommands.push({
      globalName: command.command.globalName,
      commandName: command.command.localName,
      groupName: command.commandGroup,
      mode: command.command.mode
    })
  }
  reactiveCommands.sort((a, b) =>
    a.commandName.toLowerCase().localeCompare(b.commandName.toLowerCase())
  )

  return reactiveCommands
}

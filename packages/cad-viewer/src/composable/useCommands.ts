import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { reactive } from 'vue'

export interface CommandInfo {
  commandName: string
  groupName: string
}

export function useCommands() {
  const reactiveCommands = reactive<CommandInfo[]>([])

  const commands = AcApDocManager.instance.commandManager.iterator()
  for (const command of commands) {
    reactiveCommands.push({
      commandName: command.command.localName,
      groupName: command.commandGroup
    })
  }
  reactiveCommands.sort((a, b) =>
    a.commandName.toLowerCase().localeCompare(b.commandName.toLowerCase())
  )

  return reactiveCommands
}

import { AcEdOpenMode } from '../view'
import { AcEdCommand } from './AcEdCommand'
import {
  AcEdCommandIterator,
  AcEdCommandIteratorItem
} from './AcEdCommandIterator'

/**
 * Interface representing a command group in the command stack.
 * Groups commands by name and provides maps for both global and local command lookups.
 */
export interface AcEdCommandGroup {
  /** The name of the command group */
  groupName: string
  /** Map of commands indexed by their global names */
  commandsByGlobalName: Map<string, AcEdCommand>
  /** Map of commands indexed by their local names */
  commandsByLocalName: Map<string, AcEdCommand>
  /**
   * Map of commands indexed by alias names.
   *
   * Key is normalized alias (uppercase), value is the registered command object.
   * Used for direct lookup by alias and conflict checks during registration.
   */
  commandsByAlias: Map<string, AcEdCommand>
  /**
   * Reverse index of aliases by command instance.
   *
   * This map allows:
   * - Efficient cleanup of all aliases when a command is removed
   * - Efficient alias listing in command UI (auto-complete display)
   */
  aliasesByCommand: Map<AcEdCommand, Set<string>>
}

/**
 * The class to create, define, and register command objects.
 *
 * It is used to manages all command registration and lookup functionality.
 * Commands are organized into groups, with system commands (ACAD) and user commands (USER)
 * being the default groups.
 *
 * @example
 * ```typescript
 * const commandStack = AcApDocManager.instance.commandManager;
 * commandStack.addCommand('USER', 'MYCOMMAND', 'MYCOMMAND', myCommandInstance);
 * const command = commandStack.lookupGlobalCmd('MYCOMMAND');
 * ```
 */
export class AcEdCommandStack {
  /** The name of the system command group */
  static SYSTEMT_COMMAND_GROUP_NAME = 'ACAD'
  /** The name of the default user command group */
  static DEFAUT_COMMAND_GROUP_NAME = 'USER'

  /** Array of all command groups in the stack */
  private _commandsByGroup: AcEdCommandGroup[]
  /** Reference to the system command group */
  private _systemCommandGroup: AcEdCommandGroup
  /** Reference to the default user command group */
  private _defaultCommandGroup: AcEdCommandGroup

  /**
   * Private constructor to enforce singleton pattern.
   * Initializes the command stack with system and default command groups.
   */
  constructor() {
    this._commandsByGroup = []
    this._systemCommandGroup = {
      groupName: AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      commandsByGlobalName: new Map(),
      commandsByLocalName: new Map(),
      commandsByAlias: new Map(),
      aliasesByCommand: new Map()
    }
    this._defaultCommandGroup = {
      groupName: AcEdCommandStack.DEFAUT_COMMAND_GROUP_NAME,
      commandsByGlobalName: new Map(),
      commandsByLocalName: new Map(),
      commandsByAlias: new Map(),
      aliasesByCommand: new Map()
    }
    this._commandsByGroup.push(this._systemCommandGroup)
    this._commandsByGroup.push(this._defaultCommandGroup)
  }

  /**
   * Adds a command to the specified command group.
   *
   * @param cmdGroupName - The name of the command group. If empty, uses the default group.
   * @param cmdGlobalName - The global (untranslated) name of the command. Must be unique within the group.
   * @param cmdLocalName - The local (translated) name of the command. Defaults to global name if empty.
   * @param cmd - The command object to add to the stack.
   * @param cmdAlias - Optional command alias or alias list. Aliases are case-insensitive and
   * normalized to uppercase during registration.
   *
   * @throws {Error} When the global name is empty or when a command with the same name already exists
   *
   * @example
   * ```typescript
   * commandStack.addCommand('USER', 'LINE', 'ligne', new LineCommand());
   * ```
   */
  addCommand(
    cmdGroupName: string,
    cmdGlobalName: string,
    cmdLocalName: string,
    cmd: AcEdCommand,
    cmdAlias?: string | string[]
  ) {
    cmdGroupName = cmdGroupName.toUpperCase()
    cmdGlobalName = cmdGlobalName.toUpperCase()
    cmdLocalName = cmdLocalName.toUpperCase()

    if (!cmdGlobalName) {
      throw new Error(
        '[AcEdCommandStack] The global name of the command is required!'
      )
    }
    if (!cmdLocalName) {
      cmdLocalName = cmdGlobalName
    }

    let commandGroup = this._defaultCommandGroup
    if (cmdGroupName) {
      const tmp = this._commandsByGroup.find(
        value => value.groupName == cmdGroupName
      )
      if (!tmp) {
        commandGroup = {
          groupName: cmdGroupName,
          commandsByGlobalName: new Map(),
          commandsByLocalName: new Map(),
          commandsByAlias: new Map(),
          aliasesByCommand: new Map()
        }
        this._commandsByGroup.push(commandGroup)
      } else {
        commandGroup = tmp
      }
    }
    if (commandGroup.commandsByGlobalName.has(cmdGlobalName)) {
      throw new Error(
        `[AcEdCommandStack] The command with global name '${cmdGlobalName}' already exists!`
      )
    }
    if (commandGroup.commandsByLocalName.has(cmdLocalName)) {
      throw new Error(
        `[AcEdCommandStack] The command with local name '${cmdLocalName}' already exists!`
      )
    }
    const aliases = this.normalizeAliases(cmdAlias, cmdGlobalName, cmdLocalName)
    for (const alias of aliases) {
      if (commandGroup.commandsByAlias.has(alias)) {
        throw new Error(
          `[AcEdCommandStack] The command alias '${alias}' already exists!`
        )
      }
      if (
        commandGroup.commandsByGlobalName.has(alias) ||
        commandGroup.commandsByLocalName.has(alias)
      ) {
        throw new Error(
          `[AcEdCommandStack] The command alias '${alias}' conflicts with existing command name!`
        )
      }
    }

    commandGroup.commandsByGlobalName.set(cmdGlobalName, cmd)
    commandGroup.commandsByLocalName.set(cmdLocalName, cmd)
    aliases.forEach(alias => {
      commandGroup.commandsByAlias.set(alias, cmd)
    })
    commandGroup.aliasesByCommand.set(cmd, new Set(aliases))
    cmd.globalName = cmdGlobalName
    cmd.localName = cmdLocalName
  }

  /**
   * Return an iterator that can be used to traverse all of command objects in this command stack
   * (that is, the iterator iterates through all commands in all groups).
   *
   * @returns Return an iterator that can be used to traverse all of command objects in this command
   * stack.
   */
  iterator() {
    return new AcEdCommandIterator(this._commandsByGroup)
  }

  /**
   * Fuzzy search for commands by prefix using the command iterator.
   *
   * This method iterates through all commands in all command groups and returns those
   * whose global or local names start with the provided prefix. The search is case-insensitive.
   * If a mode is specified, only commands compatible with that mode are returned.
   * Higher value modes are compatible with lower value modes.
   *
   * @param prefix - The prefix string to search for. Case-insensitive.
   * @param mode - Optional access mode to filter commands. Only commands compatible with this mode are returned.
   * @returns An array of objects containing matched commands and their corresponding group names.
   *
   * @example
   * ```typescript
   * const matches = commandStack.searchCommandsByPrefix('LI', AcEdOpenMode.Write);
   * matches.forEach(item => {
   *   console.log(item.groupName, item.command.globalName);
   * });
   * ```
   */
  searchCommandsByPrefix(
    prefix: string,
    mode?: AcEdOpenMode
  ): AcEdCommandIteratorItem[] {
    prefix = prefix.toUpperCase()
    const results: AcEdCommandIteratorItem[] = []

    const iter = this.iterator()
    let item = iter.next()
    while (!item.done) {
      const { command } = item.value
      if (
        command.globalName.startsWith(prefix) ||
        command.localName.startsWith(prefix) ||
        this.commandAliasStartsWith(item.value.commandGroup, command, prefix)
      ) {
        // Check mode compatibility if mode is specified
        if (mode === undefined || this.isModeCompatible(mode, command.mode)) {
          results.push(item.value)
        }
      }
      item = iter.next()
    }

    return results
  }

  /**
   * Search through all of the global and untranslated names in all of the command groups in the command
   * stack starting at the top of the stack trying to find a match with cmdName. If a match is found, the
   * matched AcEdCommand object is returned. Otherwise undefined is returned to indicate that the command
   * could not be found. If more than one command of the same name is present in the command stack (that
   * is, in separate command groups), then the first one found is used.
   *
   * If a mode is specified, the command is only returned if it is compatible with that mode.
   * Higher value modes are compatible with lower value modes.
   *
   * @param cmdName - Input the command name to search for
   * @param mode - Optional access mode to check compatibility. Only returns the command if it's compatible with this mode.
   * @returns Return the matched AcEdCommand object if a match is found and compatible with the mode. Otherwise, return undefined.
   */
  lookupGlobalCmd(cmdName: string, mode?: AcEdOpenMode) {
    cmdName = cmdName.toUpperCase()
    let result: AcEdCommand | undefined = undefined
    for (const group of this._commandsByGroup) {
      result = group.commandsByGlobalName.get(cmdName)
      if (!result) {
        result = group.commandsByAlias.get(cmdName)
      }
      if (result) {
        // Check mode compatibility if mode is specified
        if (mode === undefined || this.isModeCompatible(mode, result.mode)) {
          break
        } else {
          result = undefined
        }
      }
    }
    return result
  }

  /**
   * Search through all of the local and translated names in all of the command groups in the command stack
   * starting at the top of the stack trying to find a match with cmdName. If a match is found, the matched
   * AcEdCommand object is returned. Otherwise undefined is returned to indicate that the command could not
   * be found. If more than one command of the same name is present in the command stack (that is, in
   * separate command groups), then the first one found is used.
   *
   * If a mode is specified, the command is only returned if it is compatible with that mode.
   * Higher value modes are compatible with lower value modes.
   *
   * @param cmdName - Input the command name to search for
   * @param mode - Optional access mode to check compatibility. Only returns the command if it's compatible with this mode.
   * @returns Return the matched AcEdCommand object if a match is found and compatible with the mode. Otherwise, return undefined.
   */
  lookupLocalCmd(cmdName: string, mode?: AcEdOpenMode) {
    cmdName = cmdName.toUpperCase()
    let result: AcEdCommand | undefined = undefined
    for (const group of this._commandsByGroup) {
      result = group.commandsByLocalName.get(cmdName)
      if (!result) {
        result = group.commandsByAlias.get(cmdName)
      }
      if (result) {
        // Check mode compatibility if mode is specified
        if (mode === undefined || this.isModeCompatible(mode, result.mode)) {
          break
        } else {
          result = undefined
        }
      }
    }
    return result
  }

  /**
   * Remove the command with the global and untranslated name `cmdGlobalName` from the `cmdGroupName`
   * command group. Return true if successful. Return false if no command with the global and untranslated
   * name `cmdGlobalName` is found in the `cmdGroupName` command group.
   *
   * @param cmdGroupName - Input the name of the command group containing the command to be removed
   * @param cmdGlobalName - Input the command name which is to be removed from cmdGroupName
   * @returns Return true if successful. Return false if no command with the global and untranslated
   * name `cmdGlobalName` is found in the `cmdGroupName` command group.
   */
  removeCmd(cmdGroupName: string, cmdGlobalName: string) {
    cmdGroupName = cmdGroupName.toUpperCase()
    cmdGlobalName = cmdGlobalName.toUpperCase()
    for (const group of this._commandsByGroup) {
      if (group.groupName == cmdGroupName) {
        const command = group.commandsByGlobalName.get(cmdGlobalName)
        if (!command) {
          return false
        }
        group.commandsByGlobalName.delete(cmdGlobalName)
        group.commandsByLocalName.delete(command.localName)
        const aliases = group.aliasesByCommand.get(command)
        aliases?.forEach(alias => {
          group.commandsByAlias.delete(alias)
        })
        group.aliasesByCommand.delete(command)
        return true
      }
    }
    return false
  }

  /**
   * Remove the command group with the name `GroupName` from the command stack and delete the command group
   * dictionary object and all the AcEdCommand objects stored within it.
   *
   * @param groupName - Input the name of the command group to be removed from the command stack.
   * @returns Return true if successful. Return false if no command group is found with the name `GroupName`.
   */
  removeGroup(groupName: string) {
    groupName = groupName.toUpperCase()
    const index = this._commandsByGroup.findIndex(
      group => group.groupName === groupName
    )
    if (index >= 0) {
      this._commandsByGroup.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Removes all of registered commands
   */
  removeAll() {
    this._defaultCommandGroup.commandsByGlobalName.clear()
    this._defaultCommandGroup.commandsByLocalName.clear()
    this._defaultCommandGroup.commandsByAlias.clear()
    this._defaultCommandGroup.aliasesByCommand.clear()
    this._systemCommandGroup.commandsByGlobalName.clear()
    this._systemCommandGroup.commandsByLocalName.clear()
    this._systemCommandGroup.commandsByAlias.clear()
    this._systemCommandGroup.aliasesByCommand.clear()
    this._commandsByGroup = [
      this._systemCommandGroup,
      this._defaultCommandGroup
    ]
  }

  /**
   * Gets all aliases of the specified command in a command group.
   *
   * @param command - Target command object
   * @param commandGroupName - Optional command group name. If omitted, the first matching group is used.
   * @returns Alias list in registration order
   */
  getCommandAliases(command: AcEdCommand, commandGroupName?: string): string[] {
    const normalizedGroupName = commandGroupName?.trim().toUpperCase()

    const groups = normalizedGroupName
      ? this._commandsByGroup.filter(
          group => group.groupName === normalizedGroupName
        )
      : this._commandsByGroup

    for (const group of groups) {
      const aliases = group.aliasesByCommand.get(command)
      if (aliases) {
        return [...aliases]
      }
    }

    return []
  }

  /**
   * Checks whether any alias of the given command starts with the input prefix.
   *
   * This helper is used by prefix search so alias names can participate in
   * command auto-complete matching together with global/local command names.
   *
   * @param commandGroupName - Name of the command group containing the command
   * @param command - Command instance whose aliases are inspected
   * @param prefix - Uppercase prefix to match
   * @returns True if any alias starts with the prefix
   */
  private commandAliasStartsWith(
    commandGroupName: string,
    command: AcEdCommand,
    prefix: string
  ) {
    const group = this._commandsByGroup.find(
      value => value.groupName === commandGroupName
    )
    if (!group) {
      return false
    }
    const aliases = group.aliasesByCommand.get(command)
    if (!aliases) {
      return false
    }
    for (const alias of aliases) {
      if (alias.startsWith(prefix)) {
        return true
      }
    }
    return false
  }

  /**
   * Normalizes raw alias input into a validated alias list for registration.
   *
   * Processing rules:
   * - Accepts one alias string or a list of alias strings.
   * - Trims whitespace and converts aliases to uppercase.
   * - Removes empty aliases.
   * - Removes aliases that are identical to command global/local names.
   * - Removes duplicates while preserving insertion order.
   *
   * @param aliases - Raw alias input from caller
   * @param cmdGlobalName - Command global name in uppercase
   * @param cmdLocalName - Command local name in uppercase
   * @returns Normalized alias list
   */
  private normalizeAliases(
    aliases: string | string[] | undefined,
    cmdGlobalName: string,
    cmdLocalName: string
  ) {
    const values = Array.isArray(aliases) ? aliases : aliases ? [aliases] : []
    const result = new Set<string>()
    values.forEach(alias => {
      const normalized = alias.trim().toUpperCase()
      if (
        normalized &&
        normalized !== cmdGlobalName &&
        normalized !== cmdLocalName
      ) {
        result.add(normalized)
      }
    })
    return [...result]
  }

  /**
   * Checks if a document mode is compatible with a command's required mode.
   *
   * Higher value modes are compatible with lower value modes.
   * - Write mode (8) is compatible with Review (4) and Read (0) commands
   * - Review mode (4) is compatible with Read (0) commands
   * - Read mode (0) is only compatible with Read (0) commands
   *
   * @param documentMode - The mode of the document
   * @param commandMode - The mode required by the command
   * @returns True if the document mode is compatible with the command mode
   */
  private isModeCompatible(
    documentMode: AcEdOpenMode,
    commandMode: AcEdOpenMode
  ): boolean {
    // Higher value modes are compatible with lower value modes
    return documentMode >= commandMode
  }
}

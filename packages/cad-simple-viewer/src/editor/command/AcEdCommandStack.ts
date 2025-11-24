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
}

/**
 * The class to create, define, and register command objects.
 *
 * This is a singleton class that manages all command registration and lookup functionality.
 * Commands are organized into groups, with system commands (ACAD) and user commands (USER)
 * being the default groups.
 *
 * @example
 * ```typescript
 * const commandStack = AcEdCommandStack.instance;
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
  /** Singleton instance of the command stack */
  private static _instance?: AcEdCommandStack

  /**
   * Private constructor to enforce singleton pattern.
   * Initializes the command stack with system and default command groups.
   */
  private constructor() {
    this._commandsByGroup = []
    this._systemCommandGroup = {
      groupName: AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      commandsByGlobalName: new Map(),
      commandsByLocalName: new Map()
    }
    this._defaultCommandGroup = {
      groupName: AcEdCommandStack.DEFAUT_COMMAND_GROUP_NAME,
      commandsByGlobalName: new Map(),
      commandsByLocalName: new Map()
    }
    this._commandsByGroup.push(this._systemCommandGroup)
    this._commandsByGroup.push(this._defaultCommandGroup)
  }

  /**
   * Gets the singleton instance of the command stack.
   * Creates a new instance if one doesn't exist.
   *
   * @returns The singleton instance of AcEdCommandStack
   */
  static get instance() {
    if (!AcEdCommandStack._instance) {
      AcEdCommandStack._instance = new AcEdCommandStack()
    }
    return AcEdCommandStack._instance
  }

  /**
   * Adds a command to the specified command group.
   *
   * @param cmdGroupName - The name of the command group. If empty, uses the default group.
   * @param cmdGlobalName - The global (untranslated) name of the command. Must be unique within the group.
   * @param cmdLocalName - The local (translated) name of the command. Defaults to global name if empty.
   * @param cmd - The command object to add to the stack.
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
    cmd: AcEdCommand
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
          commandsByLocalName: new Map()
        }
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

    commandGroup.commandsByGlobalName.set(cmdGlobalName, cmd)
    commandGroup.commandsByLocalName.set(cmdLocalName, cmd)
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
   *
   * @param prefix - The prefix string to search for. Case-insensitive.
   * @returns An array of objects containing matched commands and their corresponding group names.
   *
   * @example
   * ```typescript
   * const matches = commandStack.searchCommandsByPrefix('LI');
   * matches.forEach(item => {
   *   console.log(item.groupName, item.command.globalName);
   * });
   * ```
   */
  searchCommandsByPrefix(prefix: string): AcEdCommandIteratorItem[] {
    prefix = prefix.toUpperCase()
    const results: AcEdCommandIteratorItem[] = []

    const iter = this.iterator()
    let item = iter.next()
    while (!item.done) {
      const { command } = item.value
      if (
        command.globalName.startsWith(prefix) ||
        command.localName.startsWith(prefix)
      ) {
        results.push(item.value)
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
   * @param cmdName - Input the command name to search for
   * @returns Return the matched AcEdCommand object if a match is found. Otherwise, return undefined.
   */
  lookupGlobalCmd(cmdName: string) {
    cmdName = cmdName.toUpperCase()
    let result: AcEdCommand | undefined = undefined
    for (const group of this._commandsByGroup) {
      result = group.commandsByGlobalName.get(cmdName)
      if (result) break
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
   * @param cmdName - Input the command name to search for
   * @returns Return the matched AcEdCommand object if a match is found. Otherwise, return undefined.
   */
  lookupLocalCmd(cmdName: string) {
    cmdName = cmdName.toUpperCase()
    let result: AcEdCommand | undefined = undefined
    for (const group of this._commandsByGroup) {
      result = group.commandsByLocalName.get(cmdName)
      if (result) break
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
        return group.commandsByGlobalName.delete(cmdGlobalName)
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
    let tmp = -1
    this._commandsByGroup.some((group, index) => {
      tmp = index
      return group.groupName == groupName
    })
    if (tmp >= 0) {
      this._commandsByGroup.splice(tmp, 1)
      return true
    }
    return false
  }
}

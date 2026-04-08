/**
 * Indicates how the state machine should proceed after handling a prompt result.
 *
 * - `continue` keeps the loop running and may transition to another state.
 * - `finish` stops the loop immediately.
 */
export type AcEdPromptStateStep = 'continue' | 'finish'

/**
 * Represents a single prompt step in a state machine workflow.
 *
 * Each state is responsible for:
 * - Building a prompt (options/config) to show to the user.
 * - Handling the prompt result and deciding whether to continue or finish.
 *
 * @typeParam TPromptOptions - The prompt options type passed to the editor.
 * @typeParam TResult - The result type returned by the editor.
 */
export interface AcEdPromptState<TPromptOptions, TResult> {
  /**
   * Build the prompt options for this state.
   */
  buildPrompt(): TPromptOptions

  /**
   * Handle the prompt result and return the next step directive.
   *
   * @param result - The result returned from the editor for this prompt.
   */
  handleResult(
    result: TResult
  ): Promise<AcEdPromptStateStep> | AcEdPromptStateStep
}

/**
 * A lightweight state machine for chaining editor prompts.
 *
 * It repeatedly:
 * 1. Builds a prompt from the current state,
 * 2. Awaits a result from an injected `getResult` function,
 * 3. Lets the state decide whether to continue or finish.
 *
 * The state itself can also mutate the machine by calling `setState(...)`
 * from within `handleResult`.
 *
 * @example
 * ```ts
 * type Prompt = { message: string }
 * type Result = { status: 'ok' | 'cancel'; value?: number }
 *
 * class FirstState implements AcEdPromptState<Prompt, Result> {
 *   constructor(private sm: AcEdPromptStateMachine<Prompt, Result>) {}
 *
 *   buildPrompt() {
 *     return { message: 'Enter first value:' }
 *   }
 *
 *   handleResult(result: Result) {
 *     if (result.status !== 'ok') return 'finish'
 *     this.sm.setState(new SecondState(this.sm, result.value ?? 0))
 *     return 'continue'
 *   }
 * }
 *
 * class SecondState implements AcEdPromptState<Prompt, Result> {
 *   constructor(
 *     private sm: AcEdPromptStateMachine<Prompt, Result>,
 *     private firstValue: number
 *   ) {}
 *
 *   buildPrompt() {
 *     return { message: 'Enter second value:' }
 *   }
 *
 *   handleResult(result: Result) {
 *     if (result.status !== 'ok') return 'finish'
 *     const sum = this.firstValue + (result.value ?? 0)
 *     console.log('sum', sum)
 *     return 'finish'
 *   }
 * }
 *
 * const sm = new AcEdPromptStateMachine<Prompt, Result>()
 * sm.setState(new FirstState(sm))
 * await sm.run(async prompt => {
 *   // Editor interaction happens here:
 *   return { status: 'ok', value: 1 }
 * })
 * ```
 */
export class AcEdPromptStateMachine<TPromptOptions, TResult> {
  /**
   * The current active state. When undefined, the machine is idle.
   */
  state?: AcEdPromptState<TPromptOptions, TResult>

  /**
   * Create a new state machine with an optional initial state.
   *
   * @param initialState - The first state to run, if any.
   */
  constructor(initialState?: AcEdPromptState<TPromptOptions, TResult>) {
    this.state = initialState
  }

  /**
   * Replace the current state.
   *
   * @param state - The new state to activate.
   */
  setState(state: AcEdPromptState<TPromptOptions, TResult>) {
    this.state = state
  }

  /**
   * Run the state machine until a state returns `finish` or an error occurs.
   *
   * @param getResult - Function that executes a prompt and returns its result.
   */
  async run(getResult: (prompt: TPromptOptions) => Promise<TResult>) {
    while (this.state) {
      try {
        const prompt = this.state.buildPrompt()
        const result = await getResult(prompt)
        const step = await this.state.handleResult(result)
        if (step === 'finish') break
      } catch {
        break
      }
    }
  }
}

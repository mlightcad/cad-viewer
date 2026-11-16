import { eventBus } from './eventBus.js'

/**
 * Display an error or warning message. In order to decouple UI from this module,
 * this function justs trigger one 'message' event through event bus instead of
 * showing one message directly. It is UI module's resposiblity to listen this event
 * and show message.
 */
export function acedAlert(message: string) {
  eventBus.emit('message', {
    message: message,
    type: 'warning'
  })
}

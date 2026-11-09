/**
 * CAD Agent plugin for cad-viewer.
 *
 * @packageDocumentation
 */

import './ui/agent-panel.css'

export {
  acapAgentRecognizeText,
  cleanRecognizedText
} from './agent/textRecognizer'
export { createAgentPlugin } from './createAgentPlugin'
export { default as AgentChatPanel } from './ui/AgentChatPanel.vue'

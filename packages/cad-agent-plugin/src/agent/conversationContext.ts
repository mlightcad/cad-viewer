import type { UIMessage } from 'ai'

/** Image file part on a {@link UIMessage}. */
type ImageFilePart = {
  type: 'file'
  url: string
  mediaType?: string
}

/**
 * Extracts the latest user request text and all user-attached reference images
 * from the conversation history.
 */
export function extractConversationContext(messages: UIMessage[]): {
  userRequest: string
  referenceImages: string[]
} {
  const userMessages = messages.filter(message => message.role === 'user')
  const lastUser = userMessages[userMessages.length - 1]
  const userRequest =
    lastUser?.parts
      ?.filter(part => part.type === 'text')
      .map(part => (part.type === 'text' ? part.text : ''))
      .join('\n')
      .trim() ?? ''

  const referenceImages = messages.flatMap(message => {
    if (message.role !== 'user' || !message.parts?.length) {
      return []
    }
    return message.parts
      .filter(
        (part): part is ImageFilePart =>
          part.type === 'file' && !!part.mediaType?.startsWith('image/')
      )
      .map(part => part.url)
  })

  return { userRequest, referenceImages }
}

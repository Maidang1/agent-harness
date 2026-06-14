export const contentToText = (content: unknown): string => {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content.map(contentPartToText).join('')
  }

  return ''
}

export const truncateTextTitle = (text: string) => {
  const normalized = text.replace(/\s+/g, ' ').trim()

  if (normalized.length <= 28) {
    return normalized
  }

  return `${normalized.slice(0, 27)}…`
}

const contentPartToText = (part: unknown) => {
  if (typeof part !== 'object' || part === null) {
    return ''
  }

  const candidate = part as { type?: unknown; text?: unknown }

  if (candidate.type === 'text' && typeof candidate.text === 'string') {
    return candidate.text
  }

  return ''
}

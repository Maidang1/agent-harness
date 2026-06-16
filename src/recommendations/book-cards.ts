export type BookRecommendationCard = {
  id: string
  title: string
  author: string
  reason: string
  scenarios: string[]
  difficulty: string
  estimatedReadingTime: string
  evidence: string
  deepLink?: string
  createdAt: number
}

type HeadingMatch = {
  index: number
  endIndex: number
  title: string
  author: string
}

const HEADING_PATTERN =
  /(?:^|\n)\s*(?:#{1,4}\s*)?(?:[-*]\s*)?(?:\d+[.、]\s*)?《([^》]+)》(?:\s*[-—:：]\s*([^\n]+))?/g

export const parseBookRecommendationCards = (
  content: string,
  createdAt = Date.now(),
): BookRecommendationCard[] => {
  const matches = collectHeadingMatches(content)
  const cards: BookRecommendationCard[] = []

  for (const [index, match] of matches.entries()) {
    const nextMatch = matches[index + 1]
    const block = content.slice(match.endIndex, nextMatch?.index ?? content.length)
    const author = match.author || getField(block, ['作者'])
    const card: BookRecommendationCard = {
      id: makeCardId(match.title, author),
      title: match.title,
      author,
      reason: getField(block, ['推荐理由', '理由']) || firstMeaningfulLine(block),
      scenarios: splitList(getField(block, ['适合场景', '场景', '适合人群'])),
      difficulty: getField(block, ['难度']),
      estimatedReadingTime: getField(block, ['预计阅读时间', '阅读时间']),
      evidence: getField(block, ['推荐依据', '依据']),
      deepLink: findDeepLink(block) || undefined,
      createdAt,
    }

    if (!cards.some((item) => sameTitle(item.title, card.title))) {
      cards.push(card)
    }
  }

  return cards.slice(0, 12)
}

const collectHeadingMatches = (content: string): HeadingMatch[] => {
  const matches: HeadingMatch[] = []

  for (const match of content.matchAll(HEADING_PATTERN)) {
    const title = cleanTitle(match[1])

    if (!title || typeof match.index !== 'number') {
      continue
    }

    matches.push({
      index: match.index,
      endIndex: match.index + match[0].length,
      title,
      author: cleanAuthor(match[2] ?? ''),
    })
  }

  return matches
}

const getField = (block: string, labels: string[]) => {
  for (const label of labels) {
    const pattern = new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?${label}\\s*[：:]\\s*([^\\n]+)`)
    const match = block.match(pattern)

    if (match?.[1]) {
      return cleanText(match[1])
    }
  }

  return ''
}

const firstMeaningfulLine = (block: string) =>
  block
    .split('\n')
    .map((line) => line.replace(/^[-*\s]+/, '').trim())
    .find((line) => line && !/^(作者|适合场景|难度|预计阅读时间|推荐依据)[：:]/.test(line)) ??
  ''

const splitList = (value: string) =>
  value
    .split(/[、,，/]/)
    .map(cleanText)
    .filter(Boolean)

const findDeepLink = (block: string) => block.match(/weread:\/\/[^\s)]+/)?.[0] ?? ''

const cleanTitle = (value: string) => cleanText(value).replace(/^《|》$/g, '')

const cleanAuthor = (value: string) =>
  cleanText(value)
    .replace(/^作者[：:]/, '')
    .replace(/^by\s+/i, '')

const cleanText = (value: string) =>
  value
    .replace(/\*\*/g, '')
    .replace(/^[-*\s]+/, '')
    .trim()

const sameTitle = (left: string, right: string) =>
  left.trim().toLowerCase() === right.trim().toLowerCase()

const makeCardId = (title: string, author: string) => {
  let hash = 2166136261

  for (const char of `${title}|${author}`) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }

  return `card-${(hash >>> 0).toString(16)}`
}

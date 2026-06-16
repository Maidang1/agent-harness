import { type BookRecommendationCard } from '../recommendations/book-cards.ts'

export type ReadingCardStatus = 'recommended' | 'planned' | 'reading' | 'read'
export type ReadingPlanStatus = 'active' | 'paused' | 'done'

export type ReadingWorkspaceCard = BookRecommendationCard & {
  status: ReadingCardStatus
  updatedAt: number
}

export type ReadingWorkspacePlan = {
  id: string
  cardId: string
  title: string
  goal: string
  status: ReadingPlanStatus
  nextAction: string
  createdAt: number
  updatedAt: number
}

export type ReadingReview = {
  id: string
  cardId: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

export type ReadingWorkspace = {
  schemaVersion: 1
  cards: ReadingWorkspaceCard[]
  plans: ReadingWorkspacePlan[]
  reviews: ReadingReview[]
}

export const READING_WORKSPACE_SCHEMA_VERSION = 1

export const createDefaultReadingWorkspace = (): ReadingWorkspace => ({
  schemaVersion: READING_WORKSPACE_SCHEMA_VERSION,
  cards: [],
  plans: [],
  reviews: [],
})

export const normalizeReadingWorkspace = (value: unknown): ReadingWorkspace => {
  if (typeof value !== 'object' || value === null) {
    return createDefaultReadingWorkspace()
  }

  const workspace = value as Partial<ReadingWorkspace>

  return {
    schemaVersion: READING_WORKSPACE_SCHEMA_VERSION,
    cards: normalizeCards(workspace.cards),
    plans: normalizePlans(workspace.plans),
    reviews: normalizeReviews(workspace.reviews),
  }
}

export const addRecommendationCard = (
  workspace: ReadingWorkspace,
  card: BookRecommendationCard,
): ReadingWorkspace => {
  const normalized = normalizeReadingWorkspace(workspace)
  const existing = normalized.cards.find((item) => sameBook(item, card))

  if (existing) {
    return {
      ...normalized,
      cards: normalized.cards.map((item) =>
        item.id === existing.id
          ? normalizeCard({
              ...item,
              ...card,
              id: item.id,
              status: item.status,
              updatedAt: Math.max(item.updatedAt, card.createdAt),
            })
          : item,
      ),
    }
  }

  return {
    ...normalized,
    cards: [
      normalizeCard({
        ...card,
        status: 'recommended',
        updatedAt: card.createdAt,
      }),
      ...normalized.cards,
    ].slice(0, 40),
  }
}

export const mergeRecommendationCards = (
  workspace: ReadingWorkspace,
  cards: BookRecommendationCard[],
): ReadingWorkspace =>
  cards.reduce(addRecommendationCard, normalizeReadingWorkspace(workspace))

export const markRecommendationCardStatus = (
  workspace: ReadingWorkspace,
  cardId: string,
  status: ReadingCardStatus,
  updatedAt = Date.now(),
): ReadingWorkspace => {
  const normalized = normalizeReadingWorkspace(workspace)

  return {
    ...normalized,
    cards: normalized.cards.map((card) =>
      card.id === cardId ? { ...card, status, updatedAt } : card,
    ),
  }
}

export const createWorkspacePlanFromCard = (
  workspace: ReadingWorkspace,
  cardId: string,
  now = Date.now(),
): ReadingWorkspace => {
  const normalized = normalizeReadingWorkspace(workspace)
  const card = normalized.cards.find((item) => item.id === cardId)

  if (!card) {
    return normalized
  }

  const planId = `plan-${card.id}`
  const plans = normalized.plans.some((plan) => plan.id === planId)
    ? normalized.plans
    : [
        {
          id: planId,
          cardId: card.id,
          title: `读《${card.title}》`,
          goal: card.reason || `完成《${card.title}》并做一次复盘`,
          status: 'active' as const,
          nextAction: card.deepLink ? '打开微信读书继续阅读' : '安排一次 25 分钟阅读',
          createdAt: now,
          updatedAt: now,
        },
        ...normalized.plans,
      ].slice(0, 20)

  return {
    ...normalized,
    cards: normalized.cards.map((item) =>
      item.id === card.id ? { ...item, status: 'planned', updatedAt: now } : item,
    ),
    plans,
  }
}

export const createReviewDraftFromCard = (
  workspace: ReadingWorkspace,
  cardId: string,
  now = Date.now(),
): ReadingWorkspace => {
  const normalized = normalizeReadingWorkspace(workspace)
  const card = normalized.cards.find((item) => item.id === cardId)

  if (!card) {
    return normalized
  }

  const reviewId = `review-${card.id}`
  const content = [
    '核心观点：',
    `《${card.title}》最值得记录的观点是：`,
    '',
    '关键划线：',
    '- ',
    '',
    '我的理解：',
    '- ',
    '',
    '可执行行动：',
    '- ',
    '',
    '延伸阅读：',
    card.evidence ? `- 推荐依据：${card.evidence}` : '- ',
  ].join('\n')
  const reviews = normalized.reviews.some((review) => review.id === reviewId)
    ? normalized.reviews
    : [
        {
          id: reviewId,
          cardId: card.id,
          title: `《${card.title}》读后复盘`,
          content,
          createdAt: now,
          updatedAt: now,
        },
        ...normalized.reviews,
      ].slice(0, 40)

  return {
    ...normalized,
    reviews,
  }
}

const normalizeCards = (value: unknown): ReadingWorkspaceCard[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const cards: ReadingWorkspaceCard[] = []

  for (const item of value) {
    const card = normalizeCard(item)

    if (!card || cards.some((existing) => sameBook(existing, card))) {
      continue
    }

    cards.push(card)

    if (cards.length >= 40) {
      break
    }
  }

  return cards
}

const normalizeCard = (value: unknown): ReadingWorkspaceCard | null => {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const card = value as Partial<ReadingWorkspaceCard>
  const title = stringValue(card.title)

  if (!title) {
    return null
  }

  const createdAt = numberValue(card.createdAt) || Date.now()

  return {
    id: stringValue(card.id) || makeStableId('card', title, card.author),
    title,
    author: stringValue(card.author),
    reason: stringValue(card.reason),
    scenarios: normalizeStringArray(card.scenarios, 6),
    difficulty: stringValue(card.difficulty),
    estimatedReadingTime: stringValue(card.estimatedReadingTime),
    evidence: stringValue(card.evidence),
    deepLink: stringValue(card.deepLink),
    createdAt,
    status: normalizeCardStatus(card.status),
    updatedAt: numberValue(card.updatedAt) || createdAt,
  }
}

const normalizePlans = (value: unknown): ReadingWorkspacePlan[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (typeof item !== 'object' || item === null) {
        return null
      }

      const plan = item as Partial<ReadingWorkspacePlan>
      const title = stringValue(plan.title)

      if (!title) {
        return null
      }

      return {
        id: stringValue(plan.id) || makeStableId('plan', title),
        cardId: stringValue(plan.cardId),
        title,
        goal: stringValue(plan.goal),
        status: normalizePlanStatus(plan.status),
        nextAction: stringValue(plan.nextAction),
        createdAt: numberValue(plan.createdAt),
        updatedAt: numberValue(plan.updatedAt),
      }
    })
    .filter((item): item is ReadingWorkspacePlan => item !== null)
    .slice(0, 20)
}

const normalizeReviews = (value: unknown): ReadingReview[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (typeof item !== 'object' || item === null) {
        return null
      }

      const review = item as Partial<ReadingReview>
      const title = stringValue(review.title)
      const content = stringValue(review.content)

      if (!title || !content) {
        return null
      }

      return {
        id: stringValue(review.id) || makeStableId('review', title),
        cardId: stringValue(review.cardId),
        title,
        content,
        createdAt: numberValue(review.createdAt),
        updatedAt: numberValue(review.updatedAt),
      }
    })
    .filter((item): item is ReadingReview => item !== null)
    .slice(0, 40)
}

const normalizeCardStatus = (value: unknown): ReadingCardStatus =>
  value === 'planned' || value === 'reading' || value === 'read'
    ? value
    : 'recommended'

const normalizePlanStatus = (value: unknown): ReadingPlanStatus =>
  value === 'paused' || value === 'done' ? value : 'active'

const normalizeStringArray = (value: unknown, maxItems: number) => {
  if (!Array.isArray(value)) {
    return []
  }

  const items: string[] = []

  for (const item of value) {
    const text = stringValue(item)

    if (!text || items.includes(text)) {
      continue
    }

    items.push(text)

    if (items.length >= maxItems) {
      break
    }
  }

  return items
}

const sameBook = (
  left: Pick<BookRecommendationCard, 'title' | 'author'>,
  right: Pick<BookRecommendationCard, 'title' | 'author'>,
) =>
  left.title.trim().toLowerCase() === right.title.trim().toLowerCase() &&
  (!left.author ||
    !right.author ||
    left.author.trim().toLowerCase() === right.author.trim().toLowerCase())

const makeStableId = (prefix: string, ...parts: unknown[]) => {
  const source = parts.map((part) => stringValue(part)).join('|')
  let hash = 2166136261

  for (const char of source) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }

  return `${prefix}-${(hash >>> 0).toString(16)}`
}

const stringValue = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

const numberValue = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0

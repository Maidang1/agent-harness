export const USER_MEMORY_SCHEMA_VERSION = 1

export type MemoryPlanStatus = 'active' | 'paused' | 'done'

export type ProfileMemoryView = {
  summary: string
  learnedCategories: string[]
  notes: string[]
}

export type ReadingPlanMemoryView = {
  id: string
  title: string
  goal: string
  status: MemoryPlanStatus
  evidence: string
  updatedAt: number
}

export type EvidenceMemoryView = {
  recentPrompts: string[]
}

export type UserMemoryView = {
  schemaVersion: typeof USER_MEMORY_SCHEMA_VERSION
  profile: ProfileMemoryView
  plans: ReadingPlanMemoryView[]
  evidence: EvidenceMemoryView
}

export type EditableUserMemoryFields = {
  summary: string
  learnedCategoriesText: string
  notesText: string
  recentPromptsText: string
  plans: ReadingPlanMemoryView[]
}

const MEMORY_PLAN_STATUSES = new Set<MemoryPlanStatus>([
  'active',
  'paused',
  'done',
])

const MAX_SUMMARY_CHARS = 800
const MAX_TEXT_CHARS = 180
const MAX_NOTES = 40
const MAX_PLANS = 12
const MAX_RECENT_PROMPTS = 24

export const createDefaultUserMemory = (): UserMemoryView => ({
  schemaVersion: USER_MEMORY_SCHEMA_VERSION,
  profile: {
    summary: '',
    learnedCategories: [],
    notes: [],
  },
  plans: [],
  evidence: {
    recentPrompts: [],
  },
})

export const normalizeUserMemory = (value: unknown): UserMemoryView => {
  if (typeof value !== 'object' || value === null) {
    return createDefaultUserMemory()
  }

  const memory = value as Partial<UserMemoryView>

  return {
    schemaVersion: USER_MEMORY_SCHEMA_VERSION,
    profile: normalizeProfileMemory(memory.profile),
    plans: normalizePlans(memory.plans),
    evidence: normalizeEvidence(memory.evidence),
  }
}

export const createEditedUserMemory = (
  memory: UserMemoryView,
  fields: EditableUserMemoryFields,
): UserMemoryView =>
  normalizeUserMemory({
    ...memory,
    profile: {
      ...memory.profile,
      summary: fields.summary,
      learnedCategories: splitLines(fields.learnedCategoriesText),
      notes: splitLines(fields.notesText),
    },
    plans: fields.plans,
    evidence: {
      ...memory.evidence,
      recentPrompts: splitLines(fields.recentPromptsText),
    },
  })

export const createSimpleEditedUserMemory = (
  memory: UserMemoryView,
  summary: string,
): UserMemoryView =>
  normalizeUserMemory({
    ...memory,
    profile: {
      ...memory.profile,
      summary,
    },
  })

export const createClearedUserMemory = (): UserMemoryView => createDefaultUserMemory()

const normalizeProfileMemory = (value: unknown): ProfileMemoryView => {
  if (typeof value !== 'object' || value === null) {
    return createDefaultUserMemory().profile
  }

  const profile = value as Partial<ProfileMemoryView>

  return {
    summary: normalizeText(profile.summary, MAX_SUMMARY_CHARS),
    learnedCategories: normalizeStringList(profile.learnedCategories),
    notes: normalizeStringList(profile.notes, MAX_NOTES, MAX_TEXT_CHARS),
  }
}

const normalizePlans = (value: unknown): ReadingPlanMemoryView[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const plans: ReadingPlanMemoryView[] = []

  for (const [index, item] of value.entries()) {
    if (typeof item !== 'object' || item === null) {
      continue
    }

    const plan = item as Partial<ReadingPlanMemoryView>
    const goal = normalizeText(plan.goal, 360)
    const title = normalizeText(plan.title, 120) || truncateForTitle(goal)

    if (!title || !goal || plans.some((entry) => entry.title === title)) {
      continue
    }

    plans.push({
      id: normalizeText(plan.id, 80) || `plan-${index}`,
      title,
      goal,
      status: normalizePlanStatus(plan.status),
      evidence: normalizeText(plan.evidence, 240),
      updatedAt: normalizeTimestamp(plan.updatedAt),
    })

    if (plans.length >= MAX_PLANS) {
      break
    }
  }

  return plans
}

const normalizeEvidence = (value: unknown): EvidenceMemoryView => {
  if (typeof value !== 'object' || value === null) {
    return createDefaultUserMemory().evidence
  }

  return {
    recentPrompts: normalizeStringList(
      (value as Partial<EvidenceMemoryView>).recentPrompts,
      MAX_RECENT_PROMPTS,
      MAX_TEXT_CHARS,
    ),
  }
}

const normalizeStringList = (
  value: unknown,
  maxItems = Number.POSITIVE_INFINITY,
  maxChars = MAX_TEXT_CHARS,
) => {
  if (!Array.isArray(value)) {
    return []
  }

  const items: string[] = []

  for (const item of value) {
    const text = normalizeText(item, maxChars)

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

const normalizeText = (value: unknown, maxChars: number) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
    .slice(0, maxChars)
}

const truncateForTitle = (value: string) => value.slice(0, 40)

const normalizePlanStatus = (value: unknown): MemoryPlanStatus =>
  typeof value === 'string' && MEMORY_PLAN_STATUSES.has(value as MemoryPlanStatus)
    ? (value as MemoryPlanStatus)
    : 'active'

const normalizeTimestamp = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0

const splitLines = (value: string) => value.split('\n')

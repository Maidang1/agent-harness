import {
  BOOK_PREFERENCE_CATEGORIES,
  type BookPreferenceCategory,
} from '../config/client-config.ts'
import {
  type LearningStatusMemoryView,
  type ReadingPlanMemoryView,
  type UserMemoryView,
} from './memory-data.ts'

export type MemoryLearningRecord = {
  recentPrompts: string[]
  categories: BookPreferenceCategory[]
  activePlans: ReadingPlanMemoryView[]
  lastLearningStatus: LearningStatusMemoryView | null
}

const MAX_RECORD_PROMPTS = 5
const MAX_RECORD_PLANS = 3

export const createMemoryLearningRecord = (
  userMemory: UserMemoryView,
  favoriteCategories: BookPreferenceCategory[],
): MemoryLearningRecord => ({
  recentPrompts: [...userMemory.evidence.recentPrompts]
    .reverse()
    .slice(0, MAX_RECORD_PROMPTS),
  categories: normalizeRecordCategories([
    ...favoriteCategories,
    ...userMemory.profile.learnedCategories,
  ]),
  activePlans: [...userMemory.plans]
    .filter((plan) => plan.status === 'active')
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_RECORD_PLANS),
  lastLearningStatus: userMemory.meta.lastLearningStatus,
})

export const hasMemoryLearningRecord = (record: MemoryLearningRecord) =>
  record.recentPrompts.length > 0 ||
  record.categories.length > 0 ||
  record.activePlans.length > 0 ||
  record.lastLearningStatus !== null

const normalizeRecordCategories = (
  values: readonly string[],
): BookPreferenceCategory[] => {
  const categories = new Set<BookPreferenceCategory>()

  for (const value of values) {
    const category = BOOK_PREFERENCE_CATEGORIES.find(
      (item) => item.value === value || item.label === value,
    )

    if (category) {
      categories.add(category.value)
    }
  }

  return [...categories]
}

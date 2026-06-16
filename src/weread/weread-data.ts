export type WereadSyncStatus = 'empty' | 'success' | 'failed'

export type WereadShelfItemKind = 'book' | 'album' | 'mp'

export type WereadShelfItem = {
  id: string
  kind: WereadShelfItemKind
  title: string
  author: string
  category: string
  cover: string
  updatedAt: number
  updatedAtLabel: string
  isFinished: boolean
  isPrivate: boolean
  deepLink: string
}

export type WereadShelfSummary = {
  totalCount: number
  bookCount: number
  albumCount: number
  mpCount: number
  publicCount: number
  privateCount: number
  finishedBookCount: number
  readingBookCount: number
  recentItems: WereadShelfItem[]
}

export type WereadPreferCategory = {
  title: string
  readingTimeSeconds: number
  readingTimeLabel: string
  readingCount: number
}

export type WereadLongestBook = {
  id: string
  title: string
  author: string
  cover: string
  readTimeSeconds: number
  readTimeLabel: string
}

export type WereadReadingStats = {
  mode: 'weekly' | 'monthly' | 'annually' | 'overall'
  readDays: number
  totalReadTimeSeconds: number
  totalReadTimeLabel: string
  dayAverageReadTimeSeconds: number
  dayAverageReadTimeLabel: string
  preferCategories: WereadPreferCategory[]
  longestBooks: WereadLongestBook[]
}

export type WereadNotebookBook = {
  bookId: string
  title: string
  author: string
  cover: string
  reviewCount: number
  noteCount: number
  bookmarkCount: number
  totalNoteCount: number
  readingProgress: number
  markedStatus: number
  sort: number
  sortLabel: string
}

export type WereadNotebooksSummary = {
  totalBookCount: number
  totalNoteCount: number
  books: WereadNotebookBook[]
}

export type WereadRecommendedBook = {
  bookId: string
  title: string
  author: string
  cover: string
  category: string
  intro: string
  reason: string
  rating: number
  deepLink: string
}

export type WereadSnapshot = {
  schemaVersion: 1
  updatedAt: number
  status: WereadSyncStatus
  errorMessage: string
  shelf: WereadShelfSummary
  readingStats: WereadReadingStats
  notebooks: WereadNotebooksSummary
  recommendedBooks: WereadRecommendedBook[]
}

export const WEREAD_SNAPSHOT_SCHEMA_VERSION = 1

export const createDefaultWereadSnapshot = (): WereadSnapshot => ({
  schemaVersion: WEREAD_SNAPSHOT_SCHEMA_VERSION,
  updatedAt: 0,
  status: 'empty',
  errorMessage: '',
  shelf: {
    totalCount: 0,
    bookCount: 0,
    albumCount: 0,
    mpCount: 0,
    publicCount: 0,
    privateCount: 0,
    finishedBookCount: 0,
    readingBookCount: 0,
    recentItems: [],
  },
  readingStats: {
    mode: 'monthly',
    readDays: 0,
    totalReadTimeSeconds: 0,
    totalReadTimeLabel: '0分钟',
    dayAverageReadTimeSeconds: 0,
    dayAverageReadTimeLabel: '0分钟',
    preferCategories: [],
    longestBooks: [],
  },
  notebooks: {
    totalBookCount: 0,
    totalNoteCount: 0,
    books: [],
  },
  recommendedBooks: [],
})

export const normalizeWereadSnapshot = (value: unknown): WereadSnapshot => {
  if (typeof value !== 'object' || value === null) {
    return createDefaultWereadSnapshot()
  }

  const snapshot = value as Record<string, unknown>
  const defaults = createDefaultWereadSnapshot()
  const status = normalizeStatus(snapshot.status)
  const shelf = normalizeShelfSummary(snapshot.shelf)
  const readingStats = normalizeReadingStats(snapshot.readingStats)
  const notebooks = normalizeNotebooks(snapshot.notebooks)
  const recommendedBooks = normalizeRecommendedBooks(
    snapshot.recommendedBooks ?? (snapshot.recommendations as Record<string, unknown>)?.books,
  )

  return {
    schemaVersion: WEREAD_SNAPSHOT_SCHEMA_VERSION,
    updatedAt: numberValue(snapshot.updatedAt, defaults.updatedAt),
    status: status === 'empty' && hasSnapshotData(shelf, readingStats, notebooks, recommendedBooks)
      ? 'success'
      : status,
    errorMessage: stringValue(snapshot.errorMessage),
    shelf,
    readingStats,
    notebooks,
    recommendedBooks,
  }
}

export const formatWereadDuration = (seconds: number) => {
  const totalMinutes = Math.max(0, Math.floor(seconds / 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0 && minutes > 0) {
    return `${hours}小时${minutes}分钟`
  }

  if (hours > 0) {
    return `${hours}小时`
  }

  return `${minutes}分钟`
}

export const formatWereadDate = (timestampSeconds: number) => {
  if (!Number.isFinite(timestampSeconds) || timestampSeconds <= 0) {
    return ''
  }

  return new Date(timestampSeconds * 1000).toISOString().slice(0, 10)
}

const normalizeStatus = (value: unknown): WereadSyncStatus =>
  value === 'success' || value === 'failed' || value === 'empty'
    ? value
    : 'empty'

const normalizeShelfSummary = (value: unknown): WereadShelfSummary => {
  if (isNormalizedShelf(value)) {
    return {
      totalCount: numberValue(value.totalCount),
      bookCount: numberValue(value.bookCount),
      albumCount: numberValue(value.albumCount),
      mpCount: numberValue(value.mpCount),
      publicCount: numberValue(value.publicCount),
      privateCount: numberValue(value.privateCount),
      finishedBookCount: numberValue(value.finishedBookCount),
      readingBookCount: numberValue(value.readingBookCount),
      recentItems: normalizeShelfItems(value.recentItems),
    }
  }

  if (typeof value !== 'object' || value === null) {
    return createDefaultWereadSnapshot().shelf
  }

  const shelf = value as Record<string, unknown>
  const books = arrayValue(shelf.books)
  const albums = arrayValue(shelf.albums)
  const hasMp = typeof shelf.mp === 'object' && shelf.mp !== null
  const bookItems = books.map(normalizeShelfBook).filter(isShelfItem)
  const albumItems = albums.map(normalizeShelfAlbum).filter(isShelfItem)
  const mpItems = hasMp ? [normalizeMpItem(shelf.mp)] : []
  const items = [...bookItems, ...albumItems, ...mpItems]
  const mpCount = hasMp ? 1 : 0

  return {
    totalCount: books.length + albums.length + mpCount,
    bookCount: books.length,
    albumCount: albums.length,
    mpCount,
    publicCount: items.filter((item) => !item.isPrivate).length,
    privateCount: items.filter((item) => item.isPrivate).length,
    finishedBookCount: bookItems.filter((item) => item.isFinished).length,
    readingBookCount: bookItems.filter(
      (item) => !item.isFinished && item.updatedAt > 0,
    ).length,
    recentItems: items
      .filter((item) => item.updatedAt > 0)
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, 8),
  }
}

const normalizeShelfItems = (value: unknown) =>
  arrayValue(value).map(normalizeNormalizedShelfItem).filter(isShelfItem).slice(0, 8)

const normalizeShelfBook = (value: unknown): WereadShelfItem | null => {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const book = value as Record<string, unknown>
  const bookId = stringValue(book.bookId)
  const updatedAt = numberValue(book.readUpdateTime) || numberValue(book.updateTime)

  return {
    id: bookId,
    kind: 'book',
    title: stringValue(book.title),
    author: stringValue(book.author),
    category: stringValue(book.category),
    cover: stringValue(book.cover),
    updatedAt,
    updatedAtLabel: formatWereadDate(updatedAt),
    isFinished: numberValue(book.finishReading) === 1,
    isPrivate: numberValue(book.secret) === 1,
    deepLink: bookId ? `weread://reading?bId=${bookId}` : '',
  }
}

const normalizeShelfAlbum = (value: unknown): WereadShelfItem | null => {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const album = value as Record<string, unknown>
  const info = objectValue(album.albumInfo)
  const extra = objectValue(album.albumInfoExtra)
  const albumId = stringValue(info.albumId)
  const updatedAt =
    numberValue(extra.lectureReadUpdateTime) || numberValue(info.updateTime)

  return {
    id: albumId,
    kind: 'album',
    title: stringValue(info.name),
    author: stringValue(info.authorName),
    category: '有声书',
    cover: stringValue(info.cover),
    updatedAt,
    updatedAtLabel: formatWereadDate(updatedAt),
    isFinished: numberValue(info.finish) === 1,
    isPrivate: numberValue(extra.secret) === 1,
    deepLink: '',
  }
}

const normalizeMpItem = (value: unknown): WereadShelfItem => {
  const mp = objectValue(value)

  return {
    id: 'mp',
    kind: 'mp',
    title: stringValue(mp.name) || '文章收藏',
    author: '',
    category: '文章收藏',
    cover: '',
    updatedAt: 0,
    updatedAtLabel: '',
    isFinished: false,
    isPrivate: true,
    deepLink: '',
  }
}

const normalizeNormalizedShelfItem = (value: unknown): WereadShelfItem | null => {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const item = value as Partial<WereadShelfItem>
  const updatedAt = numberValue(item.updatedAt)
  const kind = item.kind === 'album' || item.kind === 'mp' ? item.kind : 'book'

  return {
    id: stringValue(item.id),
    kind,
    title: stringValue(item.title),
    author: stringValue(item.author),
    category: stringValue(item.category),
    cover: stringValue(item.cover),
    updatedAt,
    updatedAtLabel: stringValue(item.updatedAtLabel) || formatWereadDate(updatedAt),
    isFinished: Boolean(item.isFinished),
    isPrivate: Boolean(item.isPrivate),
    deepLink: stringValue(item.deepLink),
  }
}

const isShelfItem = (value: WereadShelfItem | null): value is WereadShelfItem =>
  value !== null && value.title.length > 0

const isNormalizedShelf = (value: unknown): value is Partial<WereadShelfSummary> =>
  typeof value === 'object' &&
  value !== null &&
  ('totalCount' in value || 'recentItems' in value)

const normalizeReadingStats = (value: unknown): WereadReadingStats => {
  if (typeof value !== 'object' || value === null) {
    return createDefaultWereadSnapshot().readingStats
  }

  const stats = value as Record<string, unknown>
  const totalReadTimeSeconds = numberValue(stats.totalReadTimeSeconds ?? stats.totalReadTime)
  const dayAverageReadTimeSeconds = numberValue(
    stats.dayAverageReadTimeSeconds ?? stats.dayAverageReadTime,
  )

  return {
    mode: normalizeStatsMode(stats.mode),
    readDays: numberValue(stats.readDays),
    totalReadTimeSeconds,
    totalReadTimeLabel:
      stringValue(stats.totalReadTimeLabel) || formatWereadDuration(totalReadTimeSeconds),
    dayAverageReadTimeSeconds,
    dayAverageReadTimeLabel:
      stringValue(stats.dayAverageReadTimeLabel) ||
      formatWereadDuration(dayAverageReadTimeSeconds),
    preferCategories: normalizePreferCategories(
      stats.preferCategories ?? stats.preferCategory,
    ),
    longestBooks: normalizeLongestBooks(stats.longestBooks ?? stats.readLongest),
  }
}

const normalizeStatsMode = (
  value: unknown,
): WereadReadingStats['mode'] =>
  value === 'weekly' || value === 'annually' || value === 'overall'
    ? value
    : 'monthly'

const normalizePreferCategories = (value: unknown): WereadPreferCategory[] =>
  arrayValue(value)
    .map((item) => {
      const category = objectValue(item)
      const readingTimeSeconds = numberValue(
        category.readingTimeSeconds ?? category.readingTime,
      )

      return {
        title: stringValue(category.title ?? category.categoryTitle),
        readingTimeSeconds,
        readingTimeLabel:
          stringValue(category.readingTimeLabel) ||
          formatWereadDuration(readingTimeSeconds),
        readingCount: numberValue(category.readingCount),
      }
    })
    .filter((item) => item.title)
    .slice(0, 8)

const normalizeLongestBooks = (value: unknown): WereadLongestBook[] =>
  arrayValue(value)
    .map((item) => {
      const entry = objectValue(item)
      const book = objectValue(entry.book)
      const album = objectValue(entry.albumInfo)
      const source = Object.keys(book).length > 0 ? book : album
      const id = stringValue(source.bookId ?? source.albumId)
      const readTimeSeconds = numberValue(entry.readTimeSeconds ?? entry.readTime)

      return {
        id,
        title: stringValue(source.title ?? source.name),
        author: stringValue(source.author ?? source.authorName),
        cover: stringValue(source.cover),
        readTimeSeconds,
        readTimeLabel:
          stringValue(entry.readTimeLabel) || formatWereadDuration(readTimeSeconds),
      }
    })
    .filter((item) => item.title)
    .slice(0, 5)

const normalizeNotebooks = (value: unknown): WereadNotebooksSummary => {
  if (typeof value !== 'object' || value === null) {
    return createDefaultWereadSnapshot().notebooks
  }

  const notebooks = value as Record<string, unknown>
  const books = arrayValue(notebooks.books)
    .map(normalizeNotebookBook)
    .filter((book): book is WereadNotebookBook => book !== null)
    .sort((left, right) => right.totalNoteCount - left.totalNoteCount)
    .slice(0, 12)
  const totalNoteCount =
    numberValue(notebooks.totalNoteCount) ||
    books.reduce((sum, book) => sum + book.totalNoteCount, 0)

  return {
    totalBookCount: numberValue(notebooks.totalBookCount) || books.length,
    totalNoteCount,
    books,
  }
}

const normalizeNotebookBook = (value: unknown): WereadNotebookBook | null => {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const item = value as Record<string, unknown>
  const book = objectValue(item.book)
  const bookId = stringValue(item.bookId ?? book.bookId)
  const reviewCount = numberValue(item.reviewCount)
  const noteCount = numberValue(item.noteCount)
  const bookmarkCount = numberValue(item.bookmarkCount)
  const sort = numberValue(item.sort)

  return {
    bookId,
    title: stringValue(item.title ?? book.title),
    author: stringValue(item.author ?? book.author),
    cover: stringValue(item.cover ?? book.cover),
    reviewCount,
    noteCount,
    bookmarkCount,
    totalNoteCount: numberValue(item.totalNoteCount) || reviewCount + noteCount + bookmarkCount,
    readingProgress: numberValue(item.readingProgress),
    markedStatus: numberValue(item.markedStatus),
    sort,
    sortLabel: stringValue(item.sortLabel) || formatWereadDate(sort),
  }
}

const normalizeRecommendedBooks = (value: unknown): WereadRecommendedBook[] =>
  arrayValue(value)
    .map((item) => {
      const book = objectValue(item)
      const bookInfo = objectValue(book.bookInfo)
      const source = Object.keys(bookInfo).length > 0 ? bookInfo : book
      const bookId = stringValue(source.bookId)

      return {
        bookId,
        title: stringValue(source.title),
        author: stringValue(source.author),
        cover: stringValue(source.cover),
        category: stringValue(source.category),
        intro: stringValue(source.intro),
        reason: stringValue(book.reason ?? source.reason),
        rating: numberValue(book.newRating ?? source.newRating),
        deepLink: bookId ? `weread://reading?bId=${bookId}` : '',
      }
    })
    .filter((book) => book.title)
    .slice(0, 12)

const hasSnapshotData = (
  shelf: WereadShelfSummary,
  readingStats: WereadReadingStats,
  notebooks: WereadNotebooksSummary,
  recommendedBooks: WereadRecommendedBook[],
) =>
  shelf.totalCount > 0 ||
  readingStats.totalReadTimeSeconds > 0 ||
  notebooks.totalNoteCount > 0 ||
  recommendedBooks.length > 0

const objectValue = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}

const arrayValue = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : []

const stringValue = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

const numberValue = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, value)
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed)
    }
  }

  return fallback
}

import { BookOpenText } from '@phosphor-icons/react'

const examples = [
  ['小王子', '温柔、短篇，适合睡前慢慢读。', '治愈'],
  ['山茶文具店', '日常感强，节奏松弛。', '温暖'],
  ['也许你该找个人聊聊', '轻松理解情绪和关系。', '疗愈'],
]

export const EmptyThread = () => (
  <div className="empty-thread">
    <div className="empty-thread-copy">
      <span className="empty-thread-kicker">本地阅读聊天</span>
      <h2>说说你的阅读需求</h2>
      <p>描述兴趣、困惑、目标或想解决的问题，我会按心情、难度和阅读场景推荐书。</p>
    </div>

    <div className="empty-preview" aria-label="推荐预览">
      <div className="empty-preview-header">
        <span>示例推荐</span>
        <span>低压力 · 睡前</span>
      </div>
      <div className="empty-preview-list">
        {examples.map(([title, reason, mood]) => (
          <div key={title} className="empty-preview-row">
            <div className="empty-book-mark" aria-hidden="true">
              <BookOpenText size={20} weight="fill" />
            </div>
            <div>
              <strong>{title}</strong>
              <p>{reason}</p>
            </div>
            <span>{mood}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
)

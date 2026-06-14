const WEREAD_GATEWAY = 'https://i.weread.qq.com/api/agent/gateway'
const SKILL_VERSION = '1.0.3'

export async function searchWeReadBooks(apiKey: string, keyword: string) {
  const res = await fetch(WEREAD_GATEWAY, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_name: '/store/search',
      skill_version: SKILL_VERSION,
      keyword,
      count: 10,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`WeRead API error ${res.status}: ${text}`)
  }

  return await res.json()
}

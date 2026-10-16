// leetcode.js —— 采购员：去力扣官网取今天的题目
const DAILY_QUERY = `query questionOfToday {
  todayRecord {
    date
    question {
      questionFrontendId
      title
      translatedTitle
      difficulty
      titleSlug
    }
  }
}`

// 去力扣取货；失败会抛错，由调用方决定怎么安抚用户
export async function fetchDailyQuestion() {
    const response = await fetch('https://leetcode.cn/graphql/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: DAILY_QUERY }),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    const q = data.data.todayRecord[0].question
    return {
        id: q.questionFrontendId,
        title: q.translatedTitle,
        difficulty: q.difficulty,
        slug: q.titleSlug,
    }
}

// 把题目拼成好看的三行文字
export function questionText(q) {
    return `今日题目：力扣 #${q.id} ${q.title}\n难度：${q.difficulty}\n链接：https://leetcode.cn/problems/${q.slug}/`
}

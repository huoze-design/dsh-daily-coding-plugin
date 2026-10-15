import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'daily-coding'
export const inject = ['tools']

// 力扣官网「每日一题」的取货单
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

// 打卡本文件：用户主目录下的 .daily-coding-plugin/checkins.json
const DATA_FILE = join(homedir(), '.daily-coding-plugin', 'checkins.json')

// 读打卡本：文件不存在（还没打过卡）就返回空列表
async function readDates() {
    try {
        const text = await readFile(DATA_FILE, 'utf8')
        const data = JSON.parse(text)
        return Array.isArray(data.dates) ? data.dates : []
    } catch {
        return []
    }
}

// 写打卡本
async function saveDates(dates) {
    await mkdir(dirname(DATA_FILE), { recursive: true })
    await writeFile(DATA_FILE, JSON.stringify({ dates }, null, 2), 'utf8')
}

// 日期搬运工：把日期挪 offset 天（跨月进位交给 JS）
function shiftDay(dateStr, offset) {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d + offset)).toISOString().slice(0, 10)
}

// 数连续打卡：从今天往回数，断一天就停
// （今天还没打，就从昨天开始数，不算断签）
function currentStreak(dates) {
    const set = new Set(dates)
    const today = new Date().toLocaleDateString('sv-SE')
    let cursor = set.has(today) ? today : shiftDay(today, -1)
    let streak = 0
    while (set.has(cursor)) {
        streak++
        cursor = shiftDay(cursor, -1)
    }
    return streak
}

export function apply(ctx) {
    ctx.tools.register(defineTool({
        name: 'daily',
        description: "Get today's LeetCode daily coding question (number, title and link).",
        parameters: {},
        output: {
            schema: { type: 'string' },
            render: (_args, value) => [{ type: 'text', text: value }],
        },
        async execute() {
            try {
                const response = await fetch('https://leetcode.cn/graphql/', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ query: DAILY_QUERY }),
                })
                if (!response.ok) {
                    return '力扣官网好像出问题了（HTTP ' + response.status + '）。稍后再试～'
                }
                const data = await response.json()
                const q = data.data.todayRecord[0].question
                return `今日题目：力扣 #${q.questionFrontendId} ${q.translatedTitle}\n难度：${q.difficulty}\n链接：https://leetcode.cn/problems/${q.titleSlug}/`
            } catch {
                return '网络开小差了，没能连上力扣官网。请检查网络后再说一次「今天的题目」～'
            }
        },
    }))

    ctx.tools.register(defineTool({
        name: 'daily_checkin',
        description: "Check in today's LeetCode daily question. Call it when the user solved today's question.",
        parameters: {},
        output: {
            schema: { type: 'string' },
            render: (_args, value) => [{ type: 'text', text: value }],
        },
        async execute() {
            const today = new Date().toLocaleDateString('sv-SE')
            const dates = await readDates()
            if (dates.includes(today)) {
                return `今天已经打过卡啦！当前累计 ${dates.length} 天。`
            }
            dates.push(today)
            await saveDates(dates)
            return `打卡成功！✅ 今天 ${today} 已记录。累计打卡 ${dates.length} 天。`
        },
    }))

    ctx.tools.register(defineTool({
        name: 'daily_stats',
        description: "Show the user's check-in stats: total days, current streak and last check-in date.",
        parameters: {},
        output: {
            schema: { type: 'string' },
            render: (_args, value) => [{ type: 'text', text: value }],
        },
        async execute() {
            const dates = await readDates()
            const sorted = [...dates].sort()
            const last = sorted[sorted.length - 1] ?? '还没有打卡记录'
            const streak = currentStreak(dates)
            return `累计打卡：${dates.length} 天\n当前连续：${streak} 天\n最近打卡：${last}`
        },
    }))
}
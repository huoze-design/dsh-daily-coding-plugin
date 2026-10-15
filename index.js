import { homedir } from 'node:os'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'daily-coding'
export const inject = ['tools']

// ===== 文件路径 =====
const DATA_DIR = join(homedir(), '.daily-coding-plugin')
const DATA_FILE = join(DATA_DIR, 'checkins.json')       // 打卡本
const CACHE_FILE = join(DATA_DIR, 'question-cache.json') // 今日题目缓存

// ===== 力扣取货单 =====
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

// ===== 日期工具 =====
function today() {
    return new Date().toLocaleDateString('sv-SE')
}

function shiftDay(dateStr, offset) {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d + offset)).toISOString().slice(0, 10)
}

function currentStreak(dates) {
    const set = new Set(dates)
    let cursor = set.has(today()) ? today() : shiftDay(today(), -1)
    let streak = 0
    while (set.has(cursor)) {
        streak++
        cursor = shiftDay(cursor, -1)
    }
    return streak
}

// ===== 打卡本读写（含 v1→v2 自动迁移）=====
async function migrate(data) {
    // 旧版账本：只有日期数组 → 升级成新版，题目信息留空
    if (Array.isArray(data.dates)) {
        return {
            version: 2,
            records: data.dates.map(d => ({ date: d, id: '', title: '', difficulty: '', solved: false })),
        }
    }
    if (!Array.isArray(data.records)) return { version: 2, records: [] }
    return data
}

async function readData() {
    try {
        return await migrate(JSON.parse(await readFile(DATA_FILE, 'utf8')))
    } catch {
        return { version: 2, records: [] }
    }
}

async function saveData(data) {
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
}

// ===== 今日题目缓存 =====
async function readCache() {
    try {
        const cache = JSON.parse(await readFile(CACHE_FILE, 'utf8'))
        if (cache.date === today()) return cache
    } catch { }
    return null
}

async function saveCache(q) {
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(CACHE_FILE, JSON.stringify({
        date: today(),
        id: q.questionFrontendId,
        title: q.translatedTitle,
        difficulty: q.difficulty,
        slug: q.titleSlug,
    }, null, 2), 'utf8')
}

function questionText(q) {
    return `今日题目：力扣 #${q.id} ${q.title}\n难度：${q.difficulty}\n链接：https://leetcode.cn/problems/${q.slug}/`
}

export function apply(ctx) {
    // ===== 工具 1：查题（先缓存后网络，断网兜底）=====
    ctx.tools.register(defineTool({
        name: 'daily',
        description: "Get today's LeetCode daily coding question (number, title and link).",
        parameters: {},
        output: {
            schema: { type: 'string' },
            render: (_args, value) => [{ type: 'text', text: value }],
        },
        async execute() {
            const cached = await readCache()
            if (cached) return questionText(cached)
            try {
                const response = await fetch('https://leetcode.cn/graphql/', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ query: DAILY_QUERY }),
                })
                if (!response.ok) return `力扣官网好像出问题了（HTTP ${response.status}），稍后再试试吧。`
                const data = await response.json()
                const q = data.data.todayRecord[0].question
                await saveCache(q)
                return questionText(q)
            } catch {
                return '网络开小差了，没能连上力扣官网。检查一下网络，稍后再试。'
            }
        },
    }))

    // ===== 工具 2：打卡（带 solved 参数）=====
    ctx.tools.register(defineTool({
        name: 'daily_checkin',
        description: "Check in for today's LeetCode daily question. Call it after the user works on today's question.",
        parameters: {
            type: 'object',
            properties: {
                solved: { type: 'boolean', description: "Whether the user solved today's question. Defaults to false." },
            },
        },
        output: {
            schema: { type: 'string' },
            render: (_args, value) => [{ type: 'text', text: value }],
        },
        async execute(args) {
            const data = await readData()
            const t = today()
            if (data.records.some(r => r.date === t)) {
                return `今天已经打过卡啦！当前累计 ${data.records.length} 天。`
            }
            const cache = await readCache()
            const solved = args.solved === true
            data.records.push({
                date: t,
                id: cache ? cache.id : '',
                title: cache ? cache.title : '',
                difficulty: cache ? cache.difficulty : '',
                solved,
            })
            await saveData(data)
            let text = '打卡成功！✅ 今天已记录。'
            if (cache) {
                text += `\n题目：#${cache.id} ${cache.title}（${solved ? '做出来了 🎉' : '还没做出来，明天再战'}）`
            } else {
                text += '\n（小提示：先问 daily 再打卡，打卡本会自动记下题目信息）'
            }
            text += `\n累计打卡 ${data.records.length} 天。`
            return text
        },
    }))

    // ===== 工具 3：统计 =====
    ctx.tools.register(defineTool({
        name: 'daily_stats',
        description: "Show the user's check-in stats: total days, current streak and the latest check-in date.",
        parameters: {},
        output: {
            schema: { type: 'string' },
            render: (_args, value) => [{ type: 'text', text: value }],
        },
        async execute() {
            const data = await readData()
            const dates = data.records.map(r => r.date)
            const solvedCount = data.records.filter(r => r.solved).length
            const last = [...dates].sort().at(-1)
            return `累计打卡：${dates.length} 天\n当前连续：${currentStreak(dates)} 天\n做出来的题：${solvedCount} 道\n最近打卡：${last ?? '还没有'}\n（没打就喊 daily_checkin 补上！）`
        },
    }))
}
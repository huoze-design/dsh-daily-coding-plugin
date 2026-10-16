// tools.js —— 技能台：三个工具的说明书
import { defineTool } from '@deepseek-ai/dsh-tools'
import { today, currentStreak } from './date.js'
import { readData, saveData, readCache, saveCache } from './storage.js'
import { fetchDailyQuestion, questionText } from './leetcode.js'

export function registerTools(ctx) {
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
                const q = await fetchDailyQuestion()
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
            solved: { type: 'boolean', description: "Whether the user solved today's question. Defaults to false." },
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

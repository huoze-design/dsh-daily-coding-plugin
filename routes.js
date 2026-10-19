// routes.js —— 宿主半场：只读 HTTP 路由（浏览器半场取数用）
import { readData, readCache, saveCache } from './storage.js'
import { currentStreak } from './date.js'
import { fetchDailyQuestion } from './leetcode.js'

function sendJson(res, data) {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(data))
}

export function makeRoutes() {
    return [
        {
            kind: 'exact',
            path: '/api/daily-coding/records',
            handler: async (req, res) => {
                const { records } = await readData()
                sendJson(res, { records })
            },
        },
        {
            kind: 'exact',
            path: '/api/daily-coding/stats',
            handler: async (req, res) => {
                const { records } = await readData()
                sendJson(res, {
                    total: records.length,
                    currentStreak: currentStreak(records.map((r) => r.date)),
                    solved: records.filter((r) => r.solved).length,
                    last: records.length > 0 ? records[records.length - 1].date : null,
                })
            },
        },
        {
            kind: 'exact',
            path: '/api/daily-coding/today',
            handler: async (req, res) => {
                try {
                    const force = String(req.url || '').includes('refresh=1')
                    let q = force ? null : await readCache()
                    if (!q) {
                        q = await fetchDailyQuestion()
                        await saveCache(q)
                    }
                    sendJson(res, q)
                } catch {
                    sendJson(res, { error: '网络开小差了，稍后再试' })
                }
            },
        },
    ]
}
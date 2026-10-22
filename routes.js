// routes.js —— 宿主半场：只读 HTTP 路由（浏览器半场取数用）
import { readData, readCache, saveCache, addCheckin } from './storage.js'
import { currentStreak } from './date.js'
import { fetchDailyQuestion } from './leetcode.js'

function sendJson(res, data) {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(data))
}

// 把请求体读完并解析成对象（读不出来就返回 null）
function readBody(req) {
    return new Promise((resolve) => {
        const chunks = []
        req.on('data', (c) => chunks.push(c))
        req.on('end', () => {
            if (!chunks.length) return resolve(null)
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
            } catch {
                resolve(null)
            }
        })
        req.on('error', () => resolve(null))
    })
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
        {
            kind: 'exact',
            path: '/api/daily-coding/checkin',
            handler: async (req, res) => {
                try {
                    let solved = false
                    if (req.method === 'POST') {
                        const body = await readBody(req)
                        solved = body !== null && body.solved === true
                    } else {
                        // 兜底：万一 POST 的请求体没被转发过来，用查询串
                        solved = String(req.url || '').includes('solved=1')
                    }
                    sendJson(res, await addCheckin(solved))
                } catch (e) {
                    sendJson(res, { error: String(e && e.message ? e.message : e) })
                }
            },
        },
    ]
}
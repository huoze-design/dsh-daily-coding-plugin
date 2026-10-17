// routes.js —— 宿主半场：两条只读 HTTP 路由（浏览器半场取数用）
import { readData } from './storage.js'
import { currentStreak } from './date.js'

function sendJson(res, data) {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(data))
}

export function makeRoutes() {
    return [
        {
            kind: 'exact',
            path: '/api/daily-coding/records',
            handler: (req, res) => {
                const { records } = readData()
                sendJson(res, { records })
            },
        },
        {
            kind: 'exact',
            path: '/api/daily-coding/stats',
            handler: (req, res) => {
                const { records } = readData()
                sendJson(res, {
                    total: records.length,
                    currentStreak: currentStreak(records.map((r) => r.date)),
                    solved: records.filter((r) => r.solved).length,
                    last: records.length > 0 ? records[records.length - 1].date : null,
                })
            },
        },
    ]
}
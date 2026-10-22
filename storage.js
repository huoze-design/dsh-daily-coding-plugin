// storage.js —— 仓库管理员：打卡本 + 题目缓存 的读与写
import { homedir } from 'node:os'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { today, currentStreak } from './date.js'

const DATA_DIR = join(homedir(), '.daily-coding-plugin')
const DATA_FILE = join(DATA_DIR, 'checkins.json')        // 打卡本
const CACHE_FILE = join(DATA_DIR, 'question-cache.json') // 今日题目缓存

// 旧版账本（只有日期数组）→ 自动升级成新版，题目信息留空
async function migrate(data) {
    if (Array.isArray(data.dates)) {
        return {
            version: 2,
            records: data.dates.map(d => ({ date: d, id: '', title: '', difficulty: '', solved: false })),
        }
    }
    if (!Array.isArray(data.records)) return { version: 2, records: [] }
    return data
}

// 读打卡本（文件不存在/坏了就当空账本）
export async function readData() {
    try {
        return await migrate(JSON.parse(await readFile(DATA_FILE, 'utf8')))
    } catch {
        return { version: 2, records: [] }
    }
}

// 写打卡本（目录不存在会自动创建）
export async function saveData(data) {
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
}

// 读今日题目缓存（缓存不是今天的就算作废）
export async function readCache() {
    try {
        const cache = JSON.parse(await readFile(CACHE_FILE, 'utf8'))
        if (cache.date === today() && cache.id && cache.title) return cache
    } catch { }
    return null
}

// 写今日题目缓存
export async function saveCache(q) {
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(CACHE_FILE, JSON.stringify({
        date: today(),
        id: q.id,
        title: q.title,
        difficulty: q.difficulty,
        slug: q.slug,
    }, null, 2), 'utf8')
}
// 打一次卡：今天已打过就返回 already，不重复记
export async function addCheckin(solved) {
    const data = await readData()
    const t = today()
    const dates = data.records.map(r => r.date)

    if (data.records.some(r => r.date === t)) {
        return { ok: true, already: true, total: data.records.length, currentStreak: currentStreak(dates) }
    }

    const cache = await readCache()
    const record = {
        date: t,
        id: cache ? cache.id : '',
        title: cache ? cache.title : '',
        difficulty: cache ? cache.difficulty : '',
        solved: solved === true,
    }
    data.records.push(record)
    await saveData(data)

    return {
        ok: true,
        already: false,
        record,
        total: data.records.length,
        currentStreak: currentStreak(dates.concat(t)),
    }
}
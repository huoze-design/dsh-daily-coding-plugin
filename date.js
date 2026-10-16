// date.js —— 日历管家：今天几号、挪日子、算连续天数

// 今天几号（本地日期，格式 YYYY-MM-DD）
export function today() {
    return new Date().toLocaleDateString('sv-SE')
}

// 把日期往前(+)/往后(-)挪 offset 天，Date.UTC 会自动处理跨月跨年进位
export function shiftDay(dateStr, offset) {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d + offset)).toISOString().slice(0, 10)
}

// 当前连续打卡天数：从今天往回数（今天没打就从昨天开始数，连续不中断）
export function currentStreak(dates) {
    const set = new Set(dates)
    const t = today()
    let cursor = set.has(t) ? t : shiftDay(t, -1)
    let streak = 0
    while (set.has(cursor)) {
        streak++
        cursor = shiftDay(cursor, -1)
    }
    return streak
}

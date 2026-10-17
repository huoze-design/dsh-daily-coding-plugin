// ============================================================
// 打卡日历 · 浏览器半场（client）
// 第 3 课：月历网格 + 点击详情
// ============================================================
window.__ModuleLoader__.load({
    id: 'dsh-daily-coding-plugin',
    factory: (require) => {
        var module = { exports: {} }
        var exports = module.exports
        Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

        const React = require('react')

        const TAB_ID = 'daily-coding:calendar'
        const RECORDS_API = 'api/daily-coding/records'
        const STATS_API = 'api/daily-coding/stats'

        // ---------- 日历小工具 ----------
        const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

        function pad(n) {
            return String(n).padStart(2, '0')
        }

        function ymd(y, m, d) {
            return `${y}-${pad(m)}-${pad(d)}`
        }

        function todayStr() {
            const t = new Date()
            return ymd(t.getFullYear(), t.getMonth() + 1, t.getDate())
        }

        // records 数组 → 以日期为键的字典（点格子时 O(1) 查）
        function buildIndex(records) {
            const map = {}
            for (const r of records) map[r.date] = r
            return map
        }

        // 生成某年某月的格子：前面补空让 1 号落对星期，凑满整周
        function monthCells(year, month) {
            const daysInMonth = new Date(year, month, 0).getDate()
            const firstDay = new Date(year, month - 1, 1).getDay() // 0=周日
            const lead = (firstDay + 6) % 7 // 周一=0 … 周日=6
            const cells = []
            for (let i = 0; i < lead; i++) cells.push(null)
            for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, date: ymd(year, month, d) })
            while (cells.length % 7 !== 0) cells.push(null)
            return cells
        }

        // ---------- 样式 ----------
        const S = {
            wrap: { padding: 16, fontFamily: 'inherit', fontSize: 13 },
            head: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
            h3: { margin: 0, fontSize: 15 },
            stats: { opacity: 0.7, fontSize: 12 },
            week: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', opacity: 0.55, fontSize: 11, marginBottom: 6 },
            grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 },
            cell: {
                position: 'relative',
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
            },
            cellEmpty: { visibility: 'hidden' },
            cellChecked: { background: 'rgba(16, 185, 129, 0.10)' },
            cellToday: { border: '1px solid #f59e0b', color: '#d97706', fontWeight: 700 },
            dot: { position: 'absolute', bottom: 5, left: '50%', marginLeft: -2.5, width: 5, height: 5, borderRadius: '50%' },
            dotSolved: { background: '#10b981' },
            dotChecked: { background: '#f59e0b' },
            card: { marginTop: 14, padding: 10, borderRadius: 8, background: 'rgba(127, 127, 127, 0.10)', minHeight: 60 },
            cardTitle: { fontWeight: 600, marginBottom: 3 },
            cardMeta: { opacity: 0.7 },
            tip: { marginTop: 10, opacity: 0.5, fontSize: 11 },
        }

        function renderCard(rec, date) {
            if (!rec) {
                return React.createElement('div', { style: S.card },
                    React.createElement('div', { style: S.cardMeta }, `${date} 没有打卡记录`))
            }
            return React.createElement('div', { style: S.card },
                React.createElement('div', { style: S.cardTitle },
                    rec.id ? `#${rec.id} ${rec.title}` : '（旧记录：没有题目信息）'),
                React.createElement('div', { style: S.cardMeta },
                    `${date} · 难度 ${rec.difficulty || '—'} · ${rec.solved ? '✅ 做出来了' : '🟡 打卡未做出来'}`))
        }

        function CalendarPanel() {
            const [stats, setStats] = React.useState(null)
            const [records, setRecords] = React.useState([])
            const [error, setError] = React.useState(null)
            const [selected, setSelected] = React.useState(null)

            React.useEffect(() => {
                Promise.all([
                    fetch(STATS_API).then((r) => r.json()),
                    fetch(RECORDS_API).then((r) => r.json()),
                ])
                    .then(([s, r]) => {
                        setStats(s)
                        setRecords(Array.isArray(r.records) ? r.records : [])
                    })
                    .catch((e) => setError(String(e)))
            }, [])

            if (error) return React.createElement('div', { style: S.wrap }, '取数据失败：' + error)
            if (!stats) return React.createElement('div', { style: S.wrap }, '加载中…')

            const now = new Date()
            const year = now.getFullYear()
            const month = now.getMonth() + 1
            const index = buildIndex(records)
            const cells = monthCells(year, month)
            const today = todayStr()

            const head = React.createElement('div', { style: S.head },
                React.createElement('h3', { style: S.h3 }, `${year} 年 ${month} 月`),
                React.createElement('span', { style: S.stats },
                    `累计 ${stats.total} · 连续 ${stats.currentStreak} · 做出来 ${stats.solved}`))

            const weekRow = React.createElement('div', { style: S.week },
                WEEKDAYS.map((w) => React.createElement('div', { key: w }, w)))

            const grid = React.createElement('div', { style: S.grid },
                cells.map((cell, i) => {
                    if (!cell) {
                        return React.createElement('div', { key: 'blank-' + i, style: Object.assign({}, S.cell, S.cellEmpty) })
                    }
                    const rec = index[cell.date]
                    const style = Object.assign({}, S.cell, rec ? S.cellChecked : {}, cell.date === today ? S.cellToday : {})
                    const children = [React.createElement('span', { key: 'd' }, String(cell.day))]
                    if (rec) {
                        children.push(React.createElement('span', {
                            key: 'dot',
                            style: Object.assign({}, S.dot, rec.solved ? S.dotSolved : S.dotChecked),
                        }))
                    }
                    return React.createElement('div',
                        { key: cell.date, style, onClick: rec ? () => setSelected(cell.date) : undefined },
                        children)
                }))

            const card = selected
                ? renderCard(index[selected], selected)
                : React.createElement('div', { style: S.card },
                    React.createElement('div', { style: S.cardMeta }, '点击有标记的日期，查看当天打卡的题目'))

            return React.createElement('div', { style: S.wrap },
                head, weekRow, grid, card,
                React.createElement('div', { style: S.tip }, '绿点=打卡且做出来 · 黄点=打卡未做出来 · 橙框=今天'))
        }

        function apply(ctx) {
            ctx.betterSidebar.registerTab({
                id: TAB_ID,
                title: '打卡日历',
                description: '力扣每日一题打卡日历',
                order: 60,
                single: true,
                component: CalendarPanel,
            })
        }

        exports.apply = apply
        exports.inject = ['betterSidebar']
        return module.exports
    },
})
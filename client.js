// ============================================================
// 打卡日历 · 浏览器半场（client）
// 第 5 课：今日题目 + 刷新
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
        const TODAY_API = 'api/daily-coding/today'

        const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

        function pad(n) { return String(n).padStart(2, '0') }
        function ymd(y, m, d) { return `${y}-${pad(m)}-${pad(d)}` }
        function todayStr() { const t = new Date(); return ymd(t.getFullYear(), t.getMonth() + 1, t.getDate()) }

        function buildIndex(records) {
            const map = {}
            for (const r of records) map[r.date] = r
            return map
        }
        // ===== 时间轴：今天前后各 180 天 =====
        const TL_DAYS = 180
        const BAR_W = 12               // 一根柱子多宽
        const BAR_GAP = 3              // 柱子之间的缝
        const CELL_W = BAR_W + BAR_GAP // 每前进一天，内容右移多少像素

        function timelineDays() {
            const out = []
            const t = new Date()
            for (let i = -TL_DAYS; i <= TL_DAYS; i++) {
                const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + i)
                out.push(ymd(d.getFullYear(), d.getMonth() + 1, d.getDate()))
            }
            return out
        }
        const TIMELINE = timelineDays()   // 插件加载时算一次，之后不再变

        function shiftMonth(view, delta) {
            let m = view.month + delta
            let y = view.year
            if (m < 1) { m = 12; y -= 1 }
            if (m > 12) { m = 1; y += 1 }
            return { year: y, month: m }
        }

        function monthCells(year, month) {
            const daysInMonth = new Date(year, month, 0).getDate()
            const firstDay = new Date(year, month - 1, 1).getDay()
            const lead = (firstDay + 6) % 7
            const cells = []
            for (let i = 0; i < lead; i++) cells.push(null)
            for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, date: ymd(year, month, d) })
            while (cells.length % 7 !== 0) cells.push(null)
            return cells
        }

        const S = {
            wrap: { padding: 16, fontFamily: 'inherit', fontSize: 13 },
            head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
            h3: { margin: 0, fontSize: 15 },
            nav: { display: 'flex', gap: 4 },
            navBtn: { border: '1px solid rgba(127,127,127,0.35)', background: 'transparent', color: 'inherit', borderRadius: 6, fontSize: 12, padding: '2px 8px', cursor: 'pointer' },
            stats: { opacity: 0.7, fontSize: 12, marginBottom: 8 },
            actions: { display: 'flex', gap: 6, marginBottom: 10 },
            refreshTip: { fontSize: 11, opacity: 0.65, marginLeft: 6 },
            week: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', opacity: 0.55, fontSize: 11, marginBottom: 6 },
            grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 },
            cell: { position: 'relative', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
            cellEmpty: { visibility: 'hidden' },
            cellChecked: { background: 'rgba(16, 185, 129, 0.10)' },
            cellToday: { border: '1px solid #f59e0b', color: '#d97706', fontWeight: 700 },
            dot: { position: 'absolute', bottom: 5, left: '50%', marginLeft: -2.5, width: 5, height: 5, borderRadius: '50%' },
            dotSolved: { background: '#10b981' },
            dotChecked: { background: '#f59e0b' },
            card: { marginTop: 14, padding: 10, borderRadius: 8, background: 'rgba(127, 127, 127, 0.10)', minHeight: 56 },
            cardTitle: { fontWeight: 600, marginBottom: 3 },
            cardMeta: { opacity: 0.7, wordBreak: 'break-all' },
            sectionHead: { display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 12, opacity: 0.75 },
            chart: { display: 'flex', alignItems: 'stretch', gap: 2, height: 40, marginTop: 6 },
            trackView: { overflow: 'hidden', cursor: 'grab', touchAction: 'none', userSelect: 'none', padding: '4px 0', borderTop: '1px solid rgba(127,127,127,0.15)', borderBottom: '1px solid rgba(127,127,127,0.15)' },
            bar: { flex: '1 1 0', borderRadius: 2, minWidth: 2 },
            barSolved: { background: '#10b981' },
            barChecked: { background: '#f59e0b' },
            barNone: { background: 'rgba(127,127,127,0.15)' },
            legend: { display: 'flex', gap: 12, fontSize: 11, opacity: 0.6, marginTop: 6 },
            legendItem: { display: 'inline-flex', alignItems: 'center', gap: 4 },
            legendDot: { width: 8, height: 8, borderRadius: 2, display: 'inline-block' },
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
            const [view, setView] = React.useState(() => {
                const n = new Date()
                return { year: n.getFullYear(), month: n.getMonth() + 1 }
            })
            const [selected, setSelected] = React.useState(null)
            const [today, setToday] = React.useState(null)
            const [busy, setBusy] = React.useState(false)
            const [refreshing, setRefreshing] = React.useState(false)
            const [lastRefresh, setLastRefresh] = React.useState('')

            // ===== 时间轴拖动引擎 =====
            const viewRef = React.useRef(null)     // 视口：能看到的那一块
            const trackRef = React.useRef(null)    // 轨道：一条超长横幅，被平移
            const offsetRef = React.useRef(0)      // 当前平移了多少像素
            const dragRef = React.useRef(null)     // 拖动过程中的临时数据
            const rafRef = React.useRef(0)         // requestAnimationFrame 句柄
            const placedRef = React.useRef(false)  // 是否已经定位过「今天」

            // 平移量限制：0 到「轨道总宽 - 视口宽」
            function clampOffset(v) {
                const el = viewRef.current
                const viewW = el ? el.clientWidth : 0
                const max = Math.max(0, TIMELINE.length * CELL_W - viewW)
                return Math.min(Math.max(v, 0), max)
            }

            // 真正干活的一帧：平移轨道 + 让月份跟随
            function paint() {
                const track = trackRef.current
                if (track) track.style.transform = `translate3d(${-offsetRef.current}px,0,0)`

                // 视口正中间那根柱子是哪一天 → 那个月
                const el = viewRef.current
                const viewW = el ? el.clientWidth : 0
                const centerIdx = Math.floor((offsetRef.current + viewW / 2) / CELL_W)
                const day = TIMELINE[Math.min(Math.max(centerIdx, 0), TIMELINE.length - 1)]
                if (!day) return
                const y = Number(day.slice(0, 4))
                const m = Number(day.slice(5, 7))
                setView((prev) => (prev.year === y && prev.month === m ? prev : { year: y, month: m }))
            }

            // 把多次调用合并成「下一帧画一次」
            function schedulePaint() {
                if (rafRef.current) return
                rafRef.current = requestAnimationFrame(() => {
                    rafRef.current = 0
                    paint()
                })
            }

            function onPointerDown(e) {
                if (e.button !== undefined && e.button !== 0) return   // 只认左键
                const el = viewRef.current
                if (el) el.setPointerCapture(e.pointerId)              // 抓住指针
                dragRef.current = {
                    startX: e.clientX,
                    startOffset: offsetRef.current,
                    lastX: e.clientX,
                    lastT: performance.now(),
                    v: 0,
                }
                if (el) el.style.cursor = 'grabbing'
            }

            function onPointerMove(e) {
                const d = dragRef.current
                if (!d) return
                // 鼠标往右 = 内容往右 = 看到更早的日期 = offset 变小
                offsetRef.current = clampOffset(d.startOffset - (e.clientX - d.startX))
                // 顺手采样一下速度，松手时用
                const now = performance.now()
                const dt = now - d.lastT
                if (dt > 0) d.v = (e.clientX - d.lastX) / dt   // 像素/毫秒
                d.lastX = e.clientX
                d.lastT = now
                schedulePaint()
            }

            function onPointerUp() {
                const d = dragRef.current
                dragRef.current = null
                const el = viewRef.current
                if (el) el.style.cursor = 'grab'
                if (!d) return
                let velocity = -d.v                 // 内容的速度 = 手指速度取反
                if (Math.abs(velocity) < 0.15) return
                const step = () => {
                    offsetRef.current = clampOffset(offsetRef.current + velocity * 16)
                    paint()
                    velocity *= 0.94                // 每帧衰减 6%，慢慢停
                    rafRef.current = Math.abs(velocity) > 0.05 ? requestAnimationFrame(step) : 0
                }
                if (rafRef.current) cancelAnimationFrame(rafRef.current)
                rafRef.current = requestAnimationFrame(step)
            }

            // 挂载后：把视口定位到今天；面板宽窄变化时重算
            React.useEffect(() => {
                const el = viewRef.current
                if (!el) return
                const place = () => {
                    const viewW = el.clientWidth
                    if (!viewW) return
                    offsetRef.current = clampOffset(TL_DAYS * CELL_W - viewW / 2 + CELL_W / 2)
                    placedRef.current = true
                    paint()
                }
                if (!placedRef.current) place()
                const ro = new ResizeObserver(() => {
                    if (!placedRef.current) place()
                    else paint()
                })
                ro.observe(el)
                return () => {
                    ro.disconnect()
                    if (rafRef.current) cancelAnimationFrame(rafRef.current)
                }
            }, [])

            const load = React.useCallback(async () => {
                try {
                    const t = Date.now()
                    const [s, r] = await Promise.all([
                        fetch(`${STATS_API}?t=${t}`).then((res) => res.json()),
                        fetch(`${RECORDS_API}?t=${t}`).then((res) => res.json()),
                    ])
                    setStats(s)
                    setRecords(Array.isArray(r.records) ? r.records : [])
                    setError(null)
                    return true
                } catch (e) {
                    setError(String(e))
                    return false
                }
            }, [])

            React.useEffect(() => { load() }, [load])

            async function loadToday(force) {
                setBusy(true)
                try {
                    const r = await fetch(force ? `${TODAY_API}?refresh=1` : TODAY_API)
                    const data = await r.json()
                    setToday(data)
                } catch (e) {
                    setToday({ error: String(e) })
                } finally {
                    setBusy(false)
                }
            }
            async function handleRefresh() {
                if (refreshing) return
                setRefreshing(true)
                const ok = await load()
                if (ok) {
                    const n = new Date()
                    setLastRefresh(`已刷新 ${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`)
                    if (today) loadToday(true)
                }
                setRefreshing(false)
            }

            if (error) return React.createElement('div', { style: S.wrap }, '取数据失败：' + error)
            if (!stats) return React.createElement('div', { style: S.wrap }, '加载中…')

            const index = buildIndex(records)
            const cells = monthCells(view.year, view.month)
            const todayDate = todayStr()

            const prefix = `${view.year}-${pad(view.month)}`
            const monthDone = records.filter((r) => r.date.startsWith(prefix)).length
            const monthDays = new Date(view.year, view.month, 0).getDate()
            const rate = monthDays ? Math.round((monthDone / monthDays) * 100) : 0

            const head = React.createElement('div', { style: S.head },
                React.createElement('h3', { style: S.h3 }, `${view.year} 年 ${view.month} 月`),
                React.createElement('div', { style: S.nav },
                    React.createElement('button', { style: S.navBtn, onClick: () => { setView(shiftMonth(view, -1)); setSelected(null) } }, '←'),
                    React.createElement('button', { style: S.navBtn, onClick: () => { const n = new Date(); setView({ year: n.getFullYear(), month: n.getMonth() + 1 }); setSelected(null) } }, '本月'),
                    React.createElement('button', { style: S.navBtn, onClick: () => { setView(shiftMonth(view, 1)); setSelected(null) } }, '→'),
                ))

            const statsLine = React.createElement('div', { style: S.stats },
                `累计 ${stats.total} · 连续 ${stats.currentStreak} · 做出来 ${stats.solved} · ${view.month} 月打卡 ${monthDone}/${monthDays} 天（${rate}%）`)

            const actions = React.createElement('div', { style: S.actions },
                React.createElement('button', { style: S.navBtn, disabled: busy, onClick: () => loadToday(false) }, '📖 今日题目'),
                React.createElement('button', { style: S.navBtn, disabled: refreshing, onClick: handleRefresh }, refreshing ? '⏳ 刷新中…' : '🔄 刷新'),
                lastRefresh ? React.createElement('span', { style: S.refreshTip }, lastRefresh) : null)

            const weekRow = React.createElement('div', { style: S.week },
                WEEKDAYS.map((w) => React.createElement('div', { key: w }, w)))

            const grid = React.createElement('div', { style: S.grid },
                cells.map((cell, i) => {
                    if (!cell) {
                        return React.createElement('div', { key: 'blank-' + i, style: Object.assign({}, S.cell, S.cellEmpty) })
                    }
                    const rec = index[cell.date]
                    const style = Object.assign({}, S.cell, rec ? S.cellChecked : {}, cell.date === todayDate ? S.cellToday : {})
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

            const todayCard = today
                ? React.createElement('div', { style: S.card },
                    today.error
                        ? React.createElement('div', { style: S.cardMeta }, '今日题目取失败：' + today.error)
                        : React.createElement('div', null,
                            React.createElement('div', { style: S.cardTitle }, `#${today.id} ${today.title}`),
                            React.createElement('div', { style: S.cardMeta },
                                `难度 ${today.difficulty || '—'} · https://leetcode.cn/problems/${today.slug}/`)))
                : null
            const chart = React.createElement('div', null,
                React.createElement('div', { style: S.sectionHead },
                    React.createElement('span', null, '时间轴'),
                    React.createElement('span', null, `本月打卡 ${monthDone} 天`)),
                React.createElement('div', {
                    ref: viewRef,
                    style: S.trackView,
                    onPointerDown: onPointerDown,
                    onPointerMove: onPointerMove,
                    onPointerUp: onPointerUp,
                    onPointerCancel: onPointerUp,
                },
                    React.createElement('div', {
                        ref: trackRef,
                        style: { display: 'flex', alignItems: 'flex-end', height: 44, width: TIMELINE.length * CELL_W, willChange: 'transform' },
                    },
                        TIMELINE.map((date) => {
                            const rec = index[date]
                            const bg = rec ? (rec.solved ? '#10b981' : '#f59e0b') : 'rgba(127,127,127,0.15)'
                            return React.createElement('div', {
                                key: date,
                                title: date + (rec ? ' · ' + (rec.id ? `#${rec.id} ${rec.title}` : '已打卡') : ' · 未打卡'),
                                style: { width: BAR_W, flex: '0 0 auto', marginRight: BAR_GAP, height: rec ? 40 : 6, background: bg, borderRadius: 2 },
                            })
                        })),
                ),
                React.createElement('div', { style: S.legend },
                    React.createElement('span', { style: S.legendItem },
                        React.createElement('span', { style: Object.assign({}, S.legendDot, S.barSolved) }), '做出来'),
                    React.createElement('span', { style: S.legendItem },
                        React.createElement('span', { style: Object.assign({}, S.legendDot, S.barChecked) }), '只打卡'),
                    React.createElement('span', { style: S.legendItem },
                        React.createElement('span', { style: Object.assign({}, S.legendDot, S.barNone) }), '没打卡')))

            return React.createElement('div', { style: S.wrap },
                head, statsLine, actions, weekRow, grid, card, todayCard, chart,
                React.createElement('div', { style: S.tip }, '按住时间轴左右拖动，查看前后月份 · 绿=做出来 · 黄=只打卡'))
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

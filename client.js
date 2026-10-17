// ============================================================
// 打卡日历 · 浏览器半场（client）
// 第 1 课：占位标签页。第 2 课接数据，第 3 课画月历。
// ============================================================
window.__ModuleLoader__.load({
    id: 'dsh-daily-coding-plugin',
    factory: (require) => {
        var module = { exports: {} }
        var exports = module.exports
        Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

        const React = require('react')

        const TAB_ID = 'daily-coding:calendar'

        // 标签页里画什么
        const RECORDS_API = 'api/daily-coding/records'
        const STATS_API = 'api/daily-coding/stats'

        // 标签页里画什么
        function CalendarPanel(props) {
            const [stats, setStats] = React.useState(null)
            const [error, setError] = React.useState(null)

            React.useEffect(() => {
                Promise.all([
                    fetch(STATS_API).then((r) => r.json()),
                    fetch(RECORDS_API).then((r) => r.json()),
                ])
                    .then(([s, r]) => setStats({ ...s, records: r.records }))
                    .catch((e) => setError(String(e)))
            }, [])

            if (error) {
                return React.createElement('div', { style: { padding: 16 } }, '取数据失败：' + error)
            }
            if (!stats) {
                return React.createElement('div', { style: { padding: 16, opacity: 0.7 } }, '加载中…')
            }
            return React.createElement(
                'div',
                { style: { padding: 16, lineHeight: 1.8 } },
                React.createElement('h3', { style: { margin: '0 0 8px', fontSize: 15 } }, '打卡日历'),
                React.createElement('p', { style: { margin: 0 } },
                    `累计 ${stats.total} 天 · 当前连续 ${stats.currentStreak} 天 · 做出来 ${stats.solved} 道`),
                React.createElement('p', { style: { margin: 0, opacity: 0.7 } },
                    stats.last ? `最近打卡：${stats.last}` : '还没有打卡记录'),
            )
        }

        // 插件启动时：把「打卡日历」登记进右侧栏的 + 菜单
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
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
        function CalendarPanel(props) {
            return React.createElement(
                'div',
                { style: { padding: 16, fontFamily: 'inherit' } },
                React.createElement('h3', { style: { margin: '0 0 8px', fontSize: 15 } }, '打卡日历'),
                React.createElement(
                    'p',
                    { style: { opacity: 0.7, margin: 0, lineHeight: 1.6 } },
                    '面板骨架已就位 🚧  第 2 课接上打卡数据，第 3 课画月历网格。',
                ),
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
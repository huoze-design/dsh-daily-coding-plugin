// index.js —— 总装车间：DSH 启动时把三个工具装进机器人
import { registerTools } from './tools.js'
import { makeRoutes } from './routes.js'

export const name = 'daily-coding'
export const inject = ['tools', 'webServer']

export function apply(ctx) {
    registerTools(ctx)

    const routes = makeRoutes()
    ctx.effect(() => {
        const disposers = routes.map((route) => ctx.webServer.register(route))
        return () => disposers.forEach((dispose) => dispose())
    })
}
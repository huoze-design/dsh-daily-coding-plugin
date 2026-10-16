// index.js —— 总装车间：DSH 启动时把三个工具装进机器人
import { registerTools } from './tools.js'

export const name = 'daily-coding'
export const inject = ['tools']

export function apply(ctx) {
    registerTools(ctx)
}

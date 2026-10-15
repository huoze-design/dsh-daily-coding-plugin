# dsh-daily-coding-plugin

给 DSH 的「每日编程一题」插件：力扣每日一题 + 打卡 + 连续天数统计。

## 功能

- `daily`：获取力扣每日一题（题号 / 标题 / 难度 / 链接）
- `daily_checkin`：今日打卡（自动去重，重复打卡会被拦截）
- `daily_stats`：累计天数、连续天数、最近打卡日期

## 安装

dsh plugin --profile demo add <https://github.com/huoze-design/dsh-daily-coding-plugin>

## 使用

- Use the daily tool to get today's question.
- Use the daily_checkin tool to check in.
- Use the daily_stats tool to show my stats.

## 数据

打卡记录保存在用户主目录下的 `.daily-coding-plugin/checkins.json`。

## 致谢

本项目是 DSH 插件开发入门的学习作品，参考 [DeepSeek Harness 插件开发文档](https://github.com/deepseek-ai/deepseek-harness)。
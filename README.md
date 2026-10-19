# 日常刊物 · Daily Journals

**[打开云端书架](https://zyx10210916.github.io/daily-journals/)** · [回路](https://zyx10210916.github.io/daily-journals/agent/) · [世界切片](https://zyx10210916.github.io/daily-journals/world/)

一个简洁的云端书架：聊天里收到每日简报，GitHub 留下原稿，按月编成可下载的 EPUB，也可部署为直接阅读的网站。

| 刊物 | 内容 | 十月 EPUB |
| --- | --- | --- |
| **回路** | Agent runtime、门控、流式事件、状态与多 Agent 工程 | [下载](https://github.com/zyx10210916/daily-journals/raw/refs/heads/main/public/editions/agent/2026-10.epub) |
| **世界切片** | 人物、冷门职业、商业机制与跨学科知识 | [下载](https://github.com/zyx10210916/daily-journals/raw/refs/heads/main/public/editions/world/2026-10.epub) |

月内 EPUB 持续更新，下载的文件是当时快照。每月独立存档；有订正时保留 Git 提交历史。

## 阅读与归档

- [回路原稿](content/agent/) · [世界切片原稿](content/world/) · [全部 EPUB](public/editions/)
- 当前导入的回路是六期历史会话整理版，世界切片是九篇找回的素材、分布于六个日期。迁移没有重新核验，页面和 EPUB 均明确标记；没有补造缺失早报。
- 新日稿按 `content/<刊物>/YYYY-MM-DD.md` 保存。原稿提交会触发 GitHub Actions 校验，并提交更新的月刊 EPUB。检查 Actions 结果后再判断当次归档是否完整。
- 聊天消息由原有 ChatGPT 定时任务生成；此仓库不会自行访问 ChatGPT、搜索新闻或生成研究结论。外部写入失败时，日稿仍应在聊天中送达，并说明失败。

## 本地构建

只需要 Node 22 和 Python 3.12，无第三方运行依赖。

```sh
npm run verify
npm run build
npm run preview
```

访问 `http://localhost:4321`。输出目录为 `dist/`，包括 EPUB；可整体部署到静态托管服务。

## GitHub Pages

书架使用 GitHub Pages，与原稿和 EPUB 一起保存在本仓库。首次启用时，在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。

每次日稿提交后，同一个工作流完成内容校验、月刊生成、EPUB 归档和网站部署。上线地址以 Actions 的 `deploy` 任务输出为准；可在该任务中点击 `github-pages` 环境查看。首次部署需 Pages 已启用，源文件上传成功不代表网站已发布。

网站全部使用相对链接，支持仓库子路径。静态输出仍为 `dist/`。无需 Cloudflare、数据库、额外 npm 依赖或私人访问令牌。

## 扩展刊物

在 `content/publications.json` 添加唯一 slug、名称、说明、主题数组、强调色和 archiveNote，并创建 `content/<slug>/`。栏目、月刊目录与 EPUB 会自动生成。

```sh
npm run new:issue -- world 2026-10-20
```

此命令生成 `.draft.md`，完成正文、日期和来源后再改名为 `.md`。Frontmatter 为 JSON。详见 [归档约定](AGENTS.md)。

## 验证范围

验证覆盖元数据、站内链接、正文转义、两刊搜索与收藏隔离，以及 EPUB 的 ZIP、XML、OPF、目录、章节链接与文件摘要。不等同于完整 EPUBCheck，也不保证所有阅读器的排版完全一致。网站无账户和跟踪脚本，收藏仅在本机浏览器保存。

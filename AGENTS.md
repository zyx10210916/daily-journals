# Daily Journals 编辑与归档约定

GitHub 仓库 `zyx10210916/daily-journals` 是刊物原稿与 EPUB 的保存位置。聊天每日消息继续发送，正文与归档保持一致。不要使用 Google Drive 作为本项目目的地。

## 原稿与刊物

- `content/publications.json` 是刊物配置。`agent` 是「回路」，`world` 是「世界切片」。新刊物添加配置和独立内容目录，避免在页面中写死第三个刊物。
- 按 Asia/Shanghai 的简报日期保存到 `content/<slug>/YYYY-MM-DD.md`；一份日稿可包含多条内容。
- Frontmatter 使用 JSON（包在两行 `---` 中），不是任意 YAML。字段见下方。
- topic 必须来自相应刊物配置。来源日期不明确时写“未标注发布日期；核验于 YYYY-MM-DD”，不猜日期。正文链接使用 HTTPS。
- `archiveKind: verified` 仅用于本次实际核实的内容，`verifiedAt` 是实际核验日期。迁移的历史稿使用 `conversation` 或 `partial`，不得改称已重新核验。
- 没有合格新内容也可保存日稿：`noUpdate: true`，`sources: []`，正文说明检索范围和没有收录的原因；不要补造论文或凑数。
- 不上传对话上下文、账号资料、令牌、内部自动化提示词等私人信息。只提交用户授权保存的刊物内容。

```md
---
{"date":"2026-10-20","title":"本期标题","summary":"一句导读","topics":["State"],"archiveKind":"verified","verifiedAt":"2026-10-20","sources":[{"title":"原始来源标题","url":"https://example.com/report","date":"2026-10-19","recommendation":"选读"}]}
---
## 本期精选

写入实际已核验的内容，清楚标注来源结论与自己的推断。
```

## 每日安全写入

1. 先读当前分支与本文件、刊物配置、最近归档，避免重复主题和日期。
2. 新日稿用新文件提交。已有同日文件时先比对：相同则跳过，有实质修订则保留来源和修订说明，读取当前 blob SHA 后更新。不要覆盖其他刊物和无关文件。
3. 多文件提交应基于最新 main，用 expected SHA 更新引用。并发冲突后重新读取再合并，不强推。
4. 原稿成功提交后，GitHub Actions 会校验并生成 `public/editions/<slug>/YYYY-MM.epub`。不必人工改二进制 EPUB 或 catalog。
5. ChatGPT 回答继续包含当日简报；末尾可附原稿和 EPUB 链接。只在写入成功后称“已归档”。不能核实构建结果时，区分“原稿已保存”和“EPUB 等待构建”。失败时照常发聊天简报并准确说明失败，不创建替代定时任务。

## 内容要求

「回路」保留原任务对新颖性、工程可迁移性、原始来源、日期、证据与局限、适用场景和精读建议的全部要求。通常 1–3 条，不凑数。

「世界切片」保留原任务的 3–5 条、约五分钟、人物/职业/商业/跨学科的轻量定位。包含女性但不限于女性，不转型成国际新闻聚合；事实与解释分开。

## 验证与发布

- Node 22、Python 3.12；构建不需要第三方 npm 或 Python 包。
- `npm run verify`：元数据、路由、交互逻辑及 EPUB ZIP/XML/目录/链接结构校验。
- `npm run build`：输出静态网站到 `dist/`，并更新月刊 EPUB。
- `npm run new:issue -- world YYYY-MM-DD` 只生成不发布的 `.draft.md` 草稿；填好来源后改名为 `.md`。
- 每月一个 EPUB，月内同一地址更新；过去月份保留，实质订正允许重新生成。下载到阅读器的是当时快照，不会自动改变。
- 只修改内容时不需要新增测试。改编译器或状态交互时运行现有验证，必要时补充有意义的回归检查。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml as e, renderMarkdown } from './markdown.mjs';

export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
export function getPublications() {
  const entries = JSON.parse(fs.readFileSync(path.join(projectRoot, 'content/publications.json'), 'utf8'));
  const seen = new Set();
  for (const item of entries) {
    if (!/^[a-z][a-z0-9-]+$/.test(item.slug) || seen.has(item.slug) || !item.title || !Array.isArray(item.topics)) throw new Error('Invalid publication registry');
    if (!/^#[0-9a-f]{6}$/i.test(item.accent)) throw new Error('Invalid accent');
    seen.add(item.slug);
  }
  return entries;
}
export function getPublication(slug) {
  const entry = getPublications().find((item) => item.slug === slug);
  if (!entry) throw new Error(`Unknown publication: ${slug}`);
  return entry;
}
export function getIssues(slug='agent') {
  const publication = getPublication(slug);
  const directory = path.join(projectRoot, 'content', slug);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter((name) => /^\d{4}-\d{2}-\d{2}\.md$/.test(name)).map((name) => {
    const content = fs.readFileSync(path.join(directory, name), 'utf8');
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) throw new Error(`Invalid frontmatter: ${slug}/${name}`);
    const metadata = JSON.parse(match[1]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(metadata.date) || name !== `${metadata.date}.md` || new Date(`${metadata.date}T00:00:00Z`).toISOString().slice(0,10) !== metadata.date) throw new Error(`Invalid date: ${name}`);
    if (!metadata.title || typeof metadata.summary !== 'string' || !Array.isArray(metadata.topics) || !Array.isArray(metadata.sources) || (!metadata.sources.length && metadata.noUpdate !== true)) throw new Error(`Incomplete issue metadata: ${name}`);
    if (!metadata.topics.every((topic) => publication.topics.includes(topic))) throw new Error(`Unknown topic: ${name}`);
    for (const source of metadata.sources) if (!source.title || !source.date || !/^https:\/\//.test(source.url)) throw new Error(`Invalid source: ${name}`);
    const archiveKind = metadata.archiveKind || (slug === 'agent' ? 'conversation' : 'partial');
    if (!['conversation','partial','verified'].includes(archiveKind)) throw new Error(`Invalid archive status: ${name}`);
    if (archiveKind === 'verified' && !/^\d{4}-\d{2}-\d{2}$/.test(metadata.verifiedAt || '')) throw new Error(`Missing verification date: ${name}`);
    return { ...metadata, slug, archiveKind, body: match[2], ...renderMarkdown(match[2]), reading: Math.max(2, Math.ceil(match[2].replace(/https?:\/\/\S+/g, '').length / 450)) };
  }).sort((a,b) => b.date.localeCompare(a.date));
}
export function getEditions(slug) {
  const issues = getIssues(slug);
  return [...new Set(issues.map((item) => item.date.slice(0,7)))].sort().reverse().map((month) => {
    const chapters = issues.filter((item) => item.date.startsWith(month));
    return { slug, month, count: chapters.length, articles: chapters.reduce((n,item) => n + item.sources.length, 0), updated: chapters[0].date, file: `editions/${slug}/${month}.epub`, chapters };
  });
}
export function getRoutes() {
  return [{path:'',kind:'shelf'}, {path:'about',kind:'about'}, ...getPublications().flatMap((publication) => [
    {path:publication.slug,kind:'publication',slug:publication.slug},
    ...getEditions(publication.slug).map((edition) => ({path:`${publication.slug}/editions/${edition.month}`,kind:'edition',slug:publication.slug,month:edition.month})),
    ...getIssues(publication.slug).map((issue) => ({path:`${publication.slug}/issues/${issue.date}`,kind:'issue',slug:publication.slug,date:issue.date})),
  ])];
}
export const hrefFor = (route, target='') => `${route.path ? '../'.repeat(route.path.split('/').length) : './'}${target ? `${target}/` : ''}`;
const fileHref = (route,target) => `${route.path ? '../'.repeat(route.path.split('/').length) : './'}${target}`;
const dateText = (date) => date.replaceAll('-','.');
const monthText = (month) => `${month.slice(0,4)} 年 ${Number(month.slice(5))} 月号`;
const statusText = (issue) => issue.archiveKind === 'verified' ? '已核验' : issue.archiveKind === 'partial' ? '部分素材归档' : '会话整理版';
export function archiveNote(issue) {
  return issue.archiveKind === 'verified' ? `核验日期：${issue.verifiedAt}。请结合各条内容的证据、来源日期与局限阅读。` : issue.archiveKind === 'partial' ? '本页为已有月刊中找回的部分素材，不代表当日完整早报。本次迁移未重新核验原始来源。' : '本页整理自已有聊天简报，保留原始来源，未在本次迁移重新核验。来源结论与工程推断分别标注。';
}
const tags = (issue) => issue.topics.map((topic) => `<span class="tag">${e(topic)}</span>`).join('');
function header(route) { return `<a href="#main" class="skip">跳到正文</a><header class="header"><a class="brand" href="${hrefFor(route)}">日常刊物<span>DAILY JOURNALS</span></a><nav aria-label="主导航"><a ${route.kind === 'shelf' ? 'aria-current="page"' : ''} href="${hrefFor(route)}">书架</a>${getPublications().map((publication) => `<a ${route.slug === publication.slug ? 'aria-current="page"' : ''} href="${hrefFor(route,publication.slug)}">${e(publication.title)}</a>`).join('')}<a href="${hrefFor(route,'about')}">关于</a></nav></header>`; }
function footer() { return '<footer class="footer"><span>每日归档，按月成刊。</span><span>Markdown 原稿 · EPUB 阅读 · 持续积累</span></footer>'; }
function download(route,edition,label='下载 EPUB') { return `<a class="button" href="${fileHref(route,edition.file)}" download>${label} <span aria-hidden="true">↓</span></a>`; }
function book(publication,edition,route) { return `<article class="book-card" data-publication="${publication.slug}"><a class="book-cover cover-${publication.slug}" href="${hrefFor(route,`${publication.slug}/editions/${edition.month}`)}"><span class="book-subtitle">${e(publication.subtitle)}</span><h2>${e(publication.title)}</h2><span class="book-rule"></span><p>${monthText(edition.month)}</p><span class="cover-caption">${publication.slug==='agent'?'研究与工程之间的阅读笔记':publication.slug==='world'?'人物 · 职业 · 商业 · 跨界知识':e(publication.description)}</span><span class="book-imprint">日常刊物 / 持续更新版</span></a><div class="book-info"><div class="book-meta"><span>收录至 ${dateText(edition.updated)}</span><span>${edition.count} 天 · ${edition.articles} 篇来源</span></div><p>${e(publication.description)}</p><div class="book-actions"><a href="${hrefFor(route,`${publication.slug}/editions/${edition.month}`)}">在线阅读 →</a>${download(route,edition)}</div></div></article>`; }
function shelf(route) { return `<main id="main"><section class="intro"><p class="eyebrow">THE BOOKSHELF</p><h1>我的云端书架</h1><p>每天收到一份新知，也在这里留下来。<br>当月持续更新，随时在线阅读或下载 EPUB。</p></section><div class="section-line"><h2>正在更新</h2><span>按月整理 · 自由阅读</span></div><section class="books" aria-label="刊物书架">${getPublications().map((publication) => { const edition=getEditions(publication.slug)[0]; return edition ? book(publication,edition,route) : `<article class="book-empty"><h2>${e(publication.title)}</h2><p>${e(publication.description)}</p><p>等待第一篇内容归档。</p></article>`; }).join('')}</section><aside class="shelf-note"><h2>让阅读慢慢积累</h2><p>每天的原稿分别保存，当月内容编成同一本 EPUB。历史整理版与新核验内容会明确标注；不为缺失日期补造早报。</p><a href="${hrefFor(route,'about')}">了解归档方式 →</a></aside></main>`; }
function issueRows(issues,route) { return `<div class="issue-list">${issues.map((issue) => `<article class="issue-row" data-issue="${issue.slug}:${issue.date}" data-topics="${e(issue.topics.join('|'))}" data-search="${e(`${issue.date} ${issue.title} ${issue.summary} ${issue.topics.join(' ')} ${issue.body}`)}"><time datetime="${issue.date}">${dateText(issue.date)}</time><div><div class="row-status">${statusText(issue)} · ${issue.reading} 分钟</div><h3><a href="${hrefFor(route,`${issue.slug}/issues/${issue.date}`)}">${e(issue.title)}</a></h3><p>${e(issue.summary)}</p><div class="tags">${tags(issue)}</div></div><a class="arrow" href="${hrefFor(route,`${issue.slug}/issues/${issue.date}`)}" aria-label="阅读 ${e(issue.title)}">↗</a></article>`).join('')}<p class="empty" data-empty hidden>没有找到匹配内容。试试其他关键词，或取消收藏筛选。</p></div>`; }
function filters(publication) { return `<div class="filters"><label class="search"><span aria-hidden="true">⌕</span><input data-search type="search" aria-label="搜索正文、标题或主题" placeholder="搜索标题、主题或正文"></label><button data-saved-filter aria-pressed="false">只看收藏 <span data-saved-count>00</span></button></div><div class="topics" role="group" aria-label="按主题筛选"><button data-topic="all" aria-pressed="true">全部</button>${publication.topics.map((topic) => `<button data-topic="${e(topic)}" aria-pressed="false">${e(topic)}</button>`).join('')}</div>`; }
function publicationPage(route) { const publication=getPublication(route.slug), editions=getEditions(route.slug), issues=getIssues(route.slug); return `<main id="main"><section class="intro publication-intro"><p class="eyebrow">${route.slug.toUpperCase()} / COLLECTION</p><h1>${e(publication.title)}</h1><p>${e(publication.description)}</p></section>${editions.length?`<section class="edition-links" aria-label="月刊下载">${editions.map((edition) => `<div><a href="${hrefFor(route,`${route.slug}/editions/${edition.month}`)}"><strong>${monthText(edition.month)}</strong><span>收录至 ${dateText(edition.updated)} · ${edition.count} 天</span></a>${download(route,edition)}</div>`).join('')}</section>`:''}<div class="section-line"><h2>每日归档</h2><span data-result-count>${issues.length} 份</span></div>${filters(publication)}${issueRows(issues,route)}<p class="archive-note">${e(publication.archiveNote)}</p></main>`; }
function editionPage(route) { const publication=getPublication(route.slug), edition=getEditions(route.slug).find((item) => item.month===route.month); return `<main id="main"><a class="back" href="${hrefFor(route,route.slug)}">← 返回${e(publication.title)}</a><header class="edition-header"><div><p class="eyebrow">MONTHLY EDITION / ${edition.month}</p><h1>${e(publication.title)}<br><span>${monthText(edition.month)}</span></h1><p>持续更新版 · 收录至 ${dateText(edition.updated)}<br>${edition.count} 个日期 · ${edition.articles} 篇来源</p></div><div class="edition-download">${download(route,edition)}<p>适用于支持 EPUB 的阅读器。<br>也可以直接打开下方章节阅读。</p></div></header><div class="section-line"><h2>本月目录</h2><span>最新内容在前</span></div>${issueRows(edition.chapters,route)}<p class="archive-note">${e(publication.archiveNote)}</p></main>`; }
function issuePage(route) { const publication=getPublication(route.slug), issues=getIssues(route.slug), issue=issues.find((item) => item.date===route.date), index=issues.indexOf(issue), older=issues[index+1],newer=issues[index-1];return `<main id="main" class="reader"><a class="back" href="${hrefFor(route,`${route.slug}/editions/${issue.date.slice(0,7)}`)}">← 返回月刊目录</a><header class="article-header"><div class="article-meta"><span>${e(publication.title)}</span><time datetime="${issue.date}">${dateText(issue.date)}</time><span>${statusText(issue)} · ${issue.reading} 分钟</span></div><h1>${e(issue.title)}</h1><p class="deck">${e(issue.summary)}</p><div class="article-tools"><div class="tags">${tags(issue)}</div><div><button data-save="${issue.slug}:${issue.date}" aria-pressed="false">收藏本期 +</button><button data-print>打印 / 保存 PDF</button></div></div></header><div class="reading-grid"><article class="prose"><aside class="provenance">${e(archiveNote(issue))}</aside>${issue.html}<section class="sources"><h2 id="sources">原始来源</h2>${issue.sources.map((source,i) => `<a href="${e(source.url)}" target="_blank" rel="noopener noreferrer"><span>${String(i+1).padStart(2,'0')}</span><div>${e(source.title)}<small>${e(source.date)}${source.recommendation?` · ${e(source.recommendation)}`:''}</small></div><b>↗</b></a>`).join('')}</section></article><aside class="reading-toc"><nav aria-label="本期目录"><p class="eyebrow">本期目录</p>${issue.toc.map((item) => `<a href="#${item.id}">${e(item.title)}</a>`).join('')}<a href="#sources">原始来源</a></nav></aside></div><nav class="pagination" aria-label="相邻归档">${older?`<a href="${hrefFor(route,`${route.slug}/issues/${older.date}`)}">← ${dateText(older.date)}<strong>${e(older.title)}</strong></a>`:'<span></span>'}${newer?`<a href="${hrefFor(route,`${route.slug}/issues/${newer.date}`)}">${dateText(newer.date)} →<strong>${e(newer.title)}</strong></a>`:`<a href="${hrefFor(route,route.slug)}">继续阅读 →<strong>返回刊物档案</strong></a>`}</nav></main>`; }
function about() { return `<main id="main" class="about"><p class="eyebrow">ABOUT DAILY JOURNALS</p><h1>每日归档，按月成刊。</h1><p class="lead">聊天框保留当天的消息，书架留下可以反复阅读的刊物。</p><h2>一份内容，几种读法</h2><p>每天的简报保存为 Markdown 原稿，再编入对应刊物的当月 EPUB。同一份内容也能在线阅读，不需要安装应用或注册账号。</p><h2>一座可以继续长大的书架</h2><p>目前收录「回路」与「世界切片」。新刊物只需增加一份配置和内容目录，就能使用同样的目录、搜索和 EPUB 编排方式。</p><h2>保持来源与边界</h2><p>第一批回路内容为会话简报整理版；世界切片来自已有月刊中找回的九篇素材。它们不代表重新核验的研究，也不填补缺失的完整早报。以后实际完成核验的新内容，会单独记录核验日期。</p><h2>关于 EPUB</h2><p>当月 EPUB 随内容更新；月份结束后保留该月独立版本。下载的文件是当时的快照，想看新增内容可重新下载或使用在线阅读。实际同步进度以仓库提交和网站部署结果为准。</p><h2>关于收藏与隐私</h2><p>收藏仅保存在当前浏览器。网站没有账户、评论、追踪脚本或云端收藏；公开站点中的内容均可由访客阅读。</p></main>`; }
export function renderDocument(route) { const publication=route.slug?getPublication(route.slug):null, issue=route.kind==='issue'?getIssues(route.slug).find((item)=>item.date===route.date):null;const title=issue?`${issue.title} · ${publication.title}`:route.kind==='edition'?`${publication.title} · ${monthText(route.month)}`:publication?`${publication.title} · 日常刊物`:route.kind==='about'?'关于 · 日常刊物':'日常刊物 · 我的云端书架';const description=issue?.summary||publication?.description||'每日知识归档，按月编成 EPUB。在线阅读或下载，留在同一座云端书架。';const content=route.kind==='shelf'?shelf(route):route.kind==='publication'?publicationPage(route):route.kind==='edition'?editionPage(route):route.kind==='issue'?issuePage(route):about();return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${e(description)}"><meta name="theme-color" content="#f8f7f3"><title>${e(title)}</title><link rel="icon" href="${fileHref(route,'favicon.svg')}" type="image/svg+xml"><link rel="stylesheet" href="${fileHref(route,'journals.css')}"><link rel="stylesheet" href="${fileHref(route,'publication-themes.css')}"><script src="${fileHref(route,'library.js')}" defer></script></head><body data-journal="${route.slug||'shelf'}">${header(route)}${content}${footer()}</body></html>`; }

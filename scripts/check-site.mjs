import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getPublications, getIssues, getRoutes, renderDocument, projectRoot } from '../src/lib/publications.mjs';
import { renderMarkdown } from '../src/lib/markdown.mjs';
const publications=getPublications();
const routes=getRoutes();
for(const route of routes){
  const html=renderDocument(route);
  assert(html.startsWith('<!doctype html>')&&html.includes('<html lang="zh-CN">'),'Invalid HTML document');
  assert(!html.includes('undefined'),'Unexpected missing content');
  assert(!/|turn\d+(search|view)/.test(html),'Unconverted chat references');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(ids.length,new Set(ids).size,'Duplicate anchors');
  for(const [,href]of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    if(/^https?:/.test(href))continue;
    const destination=new URL(href,`https://example.test/${route.path?`${route.path}/`:''}`);
    if(destination.hash)assert(ids.includes(destination.hash.slice(1)),`Missing anchor ${href}`);
    const relative=destination.pathname.slice(1);
    if(/\.[a-z]+$/.test(relative))assert(fs.existsSync(path.join(projectRoot,'public',relative)),`Missing asset ${relative}`);
    else assert(routes.some(item=>`${item.path}${item.path?'/':''}`===relative),`Broken link ${href} from ${route.path}`);
  }
}
const hostile=renderMarkdown('<script>alert(1)</script>\n\n[x](javascript:alert)\n\n`<img src=x onerror=alert(1)>`').html;
assert(!hostile.includes('<script>')&&!hostile.includes('href="javascript:')&&!hostile.includes('<img'),'Unsafe Markdown');
const world=getIssues('world');
assert(world.filter(issue=>issue.archiveKind==='partial').reduce((n,issue)=>n+issue.sources.length,0)===9,'Historical world material count changed');
const css=fs.readFileSync(path.join(projectRoot,'public/journals.css'),'utf8');
assert(!/@import/.test(css)&&css.includes('@media(max-width:760px)')&&css.includes('@media print'),'Missing portable reading styles');
assert(renderDocument(routes[0]).includes('EPUB'),'Bookshelf must offer EPUB');
console.log(`Verified ${publications.length} publications, ${routes.length} pages, assets, source links, Markdown escaping, and archive provenance.`);

"""Build EPUB 3 monthly editions from the same Markdown content as the website.

Uses the Python and Node standard libraries only. No content is fetched remotely.
"""
from __future__ import annotations
import hashlib
import html
import json
from pathlib import Path
import re
import subprocess
import uuid
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from xml.etree import ElementTree as ET
from zipfile import ZipFile, ZipInfo, ZIP_STORED, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public' / 'editions'
FORMAT_VERSION = 1
DATA = json.loads(subprocess.check_output(['node', str(ROOT/'scripts/export-content.mjs')], text=True))
OUTPUT.mkdir(parents=True, exist_ok=True)
CATALOG_PATH = OUTPUT / 'catalog.json'
previous = json.loads(CATALOG_PATH.read_text()) if CATALOG_PATH.exists() else {'editions': []}
old = {(entry['slug'],entry['month']):entry for entry in previous['editions']}
current_month = datetime.now(ZoneInfo('Asia/Shanghai')).strftime('%Y-%m')
catalog = {'format': 'EPUB 3', 'editions': []}

STYLE = '''body{font-family:serif;line-height:1.85;margin:5%;}h1{font-size:1.8em;line-height:1.5;}h2{font-size:1.35em;line-height:1.6;margin-top:2em;}h3{font-size:1.1em;}p{margin:0 0 1em;}a{color:inherit;}li{margin:.5em 0;}code{font-family:monospace;font-size:.85em;}pre{white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid #aaa;padding:1em;}blockquote{border-left:2px solid #888;margin:1.5em 0;padding-left:1em;}.meta,.note{font-size:.85em;}.note{border-top:1px solid #aaa;border-bottom:1px solid #aaa;padding:1em 0;}small{display:block;}nav li{margin:1em 0;}.cover{padding-top:12%;} .cover h1{font-size:2.6em;font-weight:normal;}.cover .rule{width:3em;border-top:1px solid #777;margin:2em 0;}.cover p{font-size:1em;}.sr-only{display:none;}'''
def esc(value):
    return html.escape(str(value), quote=True)
def xhtml(title, body):
    document = f'''<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="zh-CN" lang="zh-CN"><head><title>{esc(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body>{body}</body></html>'''
    ET.fromstring(document)
    return document
def markdown_xhtml(fragment):
    fragment = re.sub(r'<hr\s*>', '<hr/>', fragment)
    fragment = re.sub(r'<br\s*>', '<br/>', fragment)
    ET.fromstring(f'<div>{fragment}</div>')
    return fragment
def write_entry(archive, name, value, compressed=True):
    info = ZipInfo(name, date_time=(1980,1,1,0,0,0))
    info.compress_type = ZIP_DEFLATED if compressed else ZIP_STORED
    archive.writestr(info, value.encode('utf-8') if isinstance(value,str) else value)

for publication in DATA:
    slug = publication['slug']
    months = sorted({issue['date'][:7] for issue in publication['issues']}, reverse=True)
    for month in months:
        chapters = sorted([issue for issue in publication['issues'] if issue['date'].startswith(month)], key=lambda issue:issue['date'])
        closed = month < current_month
        payload = {'version':FORMAT_VERSION,'publication':publication,'month':month,'chapters':chapters,'closed':closed}
        # Exclude other months from this edition's identity.
        payload['publication'] = {key:value for key,value in publication.items() if key!='issues'}
        digest = hashlib.sha256(json.dumps(payload,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
        prior = old.get((slug,month),{})
        modified = prior.get('modified_at') if prior.get('content_sha256') == digest else datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        relative = f'{slug}/{month}.epub'
        output = OUTPUT / relative
        output.parent.mkdir(parents=True,exist_ok=True)
        if prior.get('content_sha256') != digest or not output.exists():
            month_label = f'{month[:4]} 年 {int(month[5:])} 月号'
            title = f'{publication["title"]} · {month_label}'
            identifier = f'urn:uuid:{uuid.uuid5(uuid.NAMESPACE_URL, f"https://github.com/zyx10210916/daily-journals/{slug}/{month}")}'
            nav_items = ''.join(f'<li><a href="chapter-{i+1:03}.xhtml">{esc(issue["date"])} · {esc(issue["title"])}</a></li>' for i,issue in enumerate(chapters))
            nav = xhtml(f'{title} · 目录', f'<nav epub:type="toc" id="toc"><h1>本月目录</h1><ol><li><a href="cover.xhtml">封面与归档说明</a></li>{nav_items}</ol></nav>')
            cover = xhtml(title,f'<section epub:type="titlepage" class="cover"><p>{esc(publication["subtitle"])}</p><h1>{esc(publication["title"])}</h1><div class="rule"></div><p>{month_label}</p><p>{"月度归档版" if closed else "持续更新版"} · 收录至 {chapters[-1]["date"]}</p><p>{len(chapters)} 个日期 · {sum(len(issue["sources"]) for issue in chapters)} 篇来源</p><p>{esc(publication["description"])}</p><p class="note">{esc(publication["archiveNote"])}</p><p class="meta">本文件是下载时的阅读快照；当月新增内容需重新下载或在线阅读。原始来源链接保留在每章末尾。</p></section>')
            files = {'EPUB/cover.xhtml':cover,'EPUB/nav.xhtml':nav,'EPUB/style.css':STYLE}
            manifest = ['<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>','<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>','<item id="style" href="style.css" media-type="text/css"/>']
            spine = ['<itemref idref="cover"/>','<itemref idref="nav"/>']
            for i,issue in enumerate(chapters):
                entry = f'chapter-{i+1:03}'
                sources = ''.join(f'<li><a href="{esc(source["url"])}">{esc(source["title"])}</a><small>{esc(source["date"])}{(" · "+esc(source["recommendation"])) if source.get("recommendation") else ""}</small></li>' for source in issue['sources'])
                body = f'<section epub:type="chapter"><p class="meta">{esc(issue["date"])} · {esc(publication["title"])}</p><h1>{esc(issue["title"])}</h1><p>{esc(issue["summary"])}</p><aside class="note">{esc(issue["archiveNote"])}</aside>{markdown_xhtml(issue["html"])}<section><h2 id="sources">原始来源</h2><ol>{sources}</ol></section></section>'
                files[f'EPUB/{entry}.xhtml'] = xhtml(issue['title'],body)
                manifest.append(f'<item id="{entry}" href="{entry}.xhtml" media-type="application/xhtml+xml"/>')
                spine.append(f'<itemref idref="{entry}"/>')
            package = f'''<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">{identifier}</dc:identifier><dc:title>{esc(title)}</dc:title><dc:language>zh-CN</dc:language><dc:creator>日常刊物</dc:creator><dc:description>{esc(publication["description"])}</dc:description><meta property="dcterms:modified">{modified}</meta></metadata><manifest>{''.join(manifest)}</manifest><spine>{''.join(spine)}</spine></package>'''
            ET.fromstring(package)
            files['EPUB/package.opf'] = package
            with ZipFile(output,'w') as archive:
                write_entry(archive,'mimetype','application/epub+zip',False)
                write_entry(archive,'META-INF/container.xml','<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
                for name,value in files.items(): write_entry(archive,name,value)
        catalog['editions'].append({'slug':slug,'month':month,'title':publication['title'],'file':relative,'updated_through':chapters[-1]['date'],'chapter_count':len(chapters),'source_count':sum(len(issue['sources']) for issue in chapters),'closed':closed,'modified_at':modified,'content_sha256':digest,'sha256':hashlib.sha256(output.read_bytes()).hexdigest()})

CATALOG_PATH.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Prepared {len(catalog["editions"])} monthly EPUB editions.')

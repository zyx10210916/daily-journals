export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));

function inline(text) {
  const tokens = [];
  const token = (html) => { tokens.push(html); return `\u0000${tokens.length - 1}\u0000`; };
  text = text.replace(/`([^`]+)`/g, (_, code) => token(`<code>${escapeHtml(code)}</code>`));
  text = text.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_, label, href) => {
    if (!/^https?:\/\//i.test(href)) return label;
    return token(`<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}<span class="sr-only">（新窗口）</span></a>`);
  });
  text = escapeHtml(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return text.replace(/\u0000(\d+)\u0000/g, (_, n) => tokens[Number(n)]);
}

export function renderMarkdown(markdown) {
  const blocks = []; const toc = []; let paragraph = []; let list = []; let listType = null; let code = null; let codeLanguage = ''; let section = 0;
  function flushParagraph() { if (paragraph.length) { blocks.push(`<p>${inline(paragraph.join(' '))}</p>`); paragraph = []; } }
  function flushList() { if (list.length) { blocks.push(`<${listType}>${list.map((item) => `<li>${inline(item)}</li>`).join('')}</${listType}>`); list = []; listType = null; } }
  for (const line of markdown.split('\n')) {
    const fence = line.match(/^```([\w-]*)\s*$/);
    if (fence) {
      flushParagraph(); flushList();
      if (code !== null) { blocks.push(`<pre><code${codeLanguage ? ` data-language="${escapeHtml(codeLanguage)}"` : ''}>${escapeHtml(code.join('\n'))}</code></pre>`); code = null; }
      else { code = []; codeLanguage = fence[1]; }
      continue;
    }
    if (code !== null) { code.push(line); continue; }
    if (!line.trim()) { flushParagraph(); flushList(); continue; }
    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList(); const level = heading[1].length; const id = `section-${++section}`;
      blocks.push(`<h${level} id="${id}">${inline(heading[2])}</h${level}>`);
      if (level === 2) toc.push({ id, title: heading[2].replace(/\*\*/g, '') });
      continue;
    }
    if (/^---\s*$/.test(line)) { flushParagraph(); flushList(); blocks.push('<hr>'); continue; }
    if (line.startsWith('> ')) { flushParagraph(); flushList(); blocks.push(`<blockquote><p>${inline(line.slice(2))}</p></blockquote>`); continue; }
    const item = line.match(/^(?:([-*])\s+|\d+\.\s+)(.*)$/);
    if (item) { flushParagraph(); const type = item[1] ? 'ul' : 'ol'; if (listType && listType !== type) flushList(); listType = type; list.push(item[2]); continue; }
    flushList(); paragraph.push(line.trim());
  }
  if (code !== null) throw new Error('Unclosed Markdown code fence');
  flushParagraph(); flushList(); return { html: blocks.join('\n'), toc };
}

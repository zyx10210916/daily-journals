import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { getPublications, projectRoot } from '../src/lib/publications.mjs';

const rules=getPublications().map(publication=>`body[data-journal="${publication.slug}"]{--accent:${publication.accent}}.cover-${publication.slug}{--accent:${publication.accent};border-left-color:var(--accent)}.cover-${publication.slug} .book-rule{background:var(--accent)}`).join('\n');
fs.writeFileSync(path.join(projectRoot,'public/publication-themes.css'),rules+'\n');
execFileSync('python3',[path.join(projectRoot,'scripts/build-epubs.py')],{stdio:'inherit'});

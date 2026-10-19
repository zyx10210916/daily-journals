import fs from 'node:fs';
import path from 'node:path';
import { projectRoot, getRoutes, renderDocument } from '../src/lib/publications.mjs';
const output = path.join(projectRoot, 'dist');
fs.mkdirSync(output, { recursive: true });
fs.cpSync(path.join(projectRoot, 'public'), output, { recursive: true });
const routes = getRoutes();
for (const route of routes) {
  const directory = path.join(output, route.path);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), renderDocument(route));
}
console.log(`Built ${routes.length} static pages with monthly EPUB downloads.`);

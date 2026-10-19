import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { getPublications, getIssues, projectRoot } from '../src/lib/publications.mjs';
function element(dataset={}){return{dataset,hidden:false,value:'',textContent:'',attributes:{},listeners:{},setAttribute(name,value){this.attributes[name]=value;},addEventListener(name,handler){this.listeners[name]=handler;},click(){this.listeners.click?.({currentTarget:this});}};}
const storage=new Map();
for(const publication of getPublications()){
  const issues=getIssues(publication.slug);
  const rows=issues.map(issue=>element({issue:`${issue.slug}:${issue.date}`,topics:issue.topics.join('|'),search:`${issue.title} ${issue.body}`}));
  const buttons=['all',...publication.topics].map(topic=>element({topic}));
  const search=element(),savedFilter=element(),count=element(),savedCount=element(),empty=element(),save=element({save:`${publication.slug}:${issues[0].date}`});
  const singles={'[data-search]':search,'[data-saved-filter]':savedFilter,'[data-result-count]':count,'[data-saved-count]':savedCount,'[data-empty]':empty};
  const multiples={'[data-save]':[save],'[data-topic]':buttons,'[data-issue]':rows};
  const document={body:{dataset:{journal:publication.slug}},querySelector:selector=>singles[selector]||null,querySelectorAll:selector=>multiples[selector]||[]};
  vm.runInNewContext(fs.readFileSync(`${projectRoot}/public/library.js`,'utf8'),{document,localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},window:{print(){}}});
  buttons[1].click();assert.equal(rows.filter(row=>!row.hidden).length,issues.filter(issue=>issue.topics.includes(publication.topics[0])).length);
  buttons[0].click();search.value=publication.slug==='agent'?'outcome_unknown':'白尾鹿';search.listeners.input();
  assert.equal(rows.filter(row=>!row.hidden).length,1,'Full-text search must find a unique archived detail');
  search.value='';search.listeners.input();save.click();savedFilter.click();
  assert.equal(rows.filter(row=>!row.hidden).length,1);assert.equal(rows.find(row=>!row.hidden).dataset.issue,`${publication.slug}:${issues[0].date}`);
  assert.equal(save.attributes['aria-pressed'],'true');
  save.click();assert.equal(rows.filter(row=>!row.hidden).length,0);assert.equal(empty.hidden,false);
  savedFilter.click();assert.equal(rows.filter(row=>!row.hidden).length,issues.length);
  save.click();
}
assert.equal(JSON.parse(storage.get('daily-journals:saved')).length,2,'Same date in different publications must have distinct bookmarks');
console.log('Verified both publications: topic filters, full-text search, bookmarks, empty state, and cross-publication bookmark isolation.');

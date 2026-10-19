let stored=[];
try{stored=JSON.parse(localStorage.getItem('daily-journals:saved')||localStorage.getItem('fieldnotes-saved')||'[]');}catch{}
if(!Array.isArray(stored))stored=[];
const savedDates=new Set(stored.filter(value=>typeof value==='string').map(value=>/^\d{4}-\d{2}-\d{2}$/.test(value)?`agent:${value}`:value));
const journal=document.body?.dataset?.journal||'agent';
function updateSaved(){
  document.querySelectorAll('[data-save]').forEach(button=>{const active=savedDates.has(button.dataset.save);button.setAttribute('aria-pressed',String(active));button.textContent=active?'已收藏 −':'收藏本期 +';});
  const count=document.querySelector('[data-saved-count]');
  if(count)count.textContent=String([...savedDates].filter(value=>value.startsWith(`${journal}:`)).length).padStart(2,'0');
}
let topic='all',savedOnly=false;
const input=document.querySelector('[data-search]');
function applyFilters(){const query=(input?.value||'').trim().toLocaleLowerCase();let count=0;document.querySelectorAll('[data-issue]').forEach(row=>{const match=(!query||row.dataset.search.toLocaleLowerCase().includes(query))&&(topic==='all'||row.dataset.topics.split('|').includes(topic))&&(!savedOnly||savedDates.has(row.dataset.issue));row.hidden=!match;if(match)count++;});const empty=document.querySelector('[data-empty]');if(empty)empty.hidden=count!==0;const total=document.querySelector('[data-result-count]');if(total)total.textContent=`${count} 份`;}
document.querySelectorAll('[data-save]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.save;savedDates.has(key)?savedDates.delete(key):savedDates.add(key);try{localStorage.setItem('daily-journals:saved',JSON.stringify([...savedDates]));}catch{}updateSaved();applyFilters();}));
document.querySelectorAll('[data-topic]').forEach(button=>button.addEventListener('click',()=>{topic=button.dataset.topic;document.querySelectorAll('[data-topic]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));applyFilters();}));
document.querySelector('[data-saved-filter]')?.addEventListener('click',event=>{savedOnly=!savedOnly;event.currentTarget.setAttribute('aria-pressed',String(savedOnly));applyFilters();});
input?.addEventListener('input',applyFilters);
document.querySelector('[data-print]')?.addEventListener('click',()=>window.print());
updateSaved();

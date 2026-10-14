const STORAGE_KEY='research-fieldnotes-v1';
const checkbox=document.querySelector('#topic-understood');
const status=document.querySelector('#completion-status');
const topicId=document.body.dataset.topicId;
let timer;
function notify(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>el.classList.remove('visible'),3500);}
function readProgress(){const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return {topics:{},papers:{},weeks:{},notes:{},startDate:''};const saved=JSON.parse(raw);if(!saved||typeof saved!=='object'||Array.isArray(saved))throw new Error('Invalid saved progress');if(!saved.topics||typeof saved.topics!=='object'||Array.isArray(saved.topics))saved.topics={};return saved;}
function reflectProgress(){try{checkbox.checked=readProgress().topics[topicId]===true;}catch{status.textContent='Saved progress could not be read. Use the course backup tools to restore it.';}}
reflectProgress();
checkbox.addEventListener('change',()=>{
  try{const progress=readProgress();progress.topics[topicId]=checkbox.checked;localStorage.setItem(STORAGE_KEY,JSON.stringify(progress));status.textContent=checkbox.checked?'Topic understood. Your course checklist is updated.':'Topic unchecked. Your course checklist is updated.';}
  catch{checkbox.checked=!checkbox.checked;status.textContent='Could not save in this browser. Your existing progress has not been replaced.';notify('Could not save progress. Check browser storage permissions.');}
});
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY)reflectProgress();});
window.addEventListener('pageshow',event=>{if(event.persisted)reflectProgress();});
document.querySelector('#copy-article').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(location.href);notify('Article link copied');}catch{notify('Copy the article address from your browser to share it.');}
});
if('IntersectionObserver' in window){
  const links=[...document.querySelectorAll('.article-toc a')];
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){for(const link of links){const active=link.getAttribute('href')===`#${entry.target.id}`;link.classList.toggle('current',active);if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}}},{rootMargin:'-10% 0px -65% 0px'});
  document.querySelectorAll('.article-section').forEach(section=>observer.observe(section));
}

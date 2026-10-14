const STORAGE_KEY = 'research-fieldnotes-v1';
const main = document.querySelector('#main');
const defaults = () => ({ topics: {}, papers: {}, weeks: {}, notes: {}, startDate: '' });
let modules = [], papers = [], schedule = [], state = defaults();
let curriculumFilter = 'all', curriculumQuery = '', paperModule = 'all', paperQuery = '', paperStatus = 'all';
let toastTimer;
const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
const pad = n => String(n).padStart(2, '0');
const percent = (n, total) => total ? Math.round(n / total * 100) : 0;
const modulePapers = id => papers.filter(p => p.moduleIds.includes(id));
const moduleProgress = m => m.topics.filter(t => state.topics[t.id]).length;
const priorities = m => m.priorities.map(p => `<span class="priority ${p.toLowerCase()}">${p}</span>`).join(' ');
const external = (url, label, className = '') => `<a class="${className}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
const groupLabels = { foundations: 'FOUNDATIONS / 研究基础', core: 'CORE / 核心能力', frontiers: 'FRONTIERS / 方向探索', research: 'RESEARCH / 科研实践' };
function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 3400); }
function save() { let saved=true; try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { saved=false; toast('浏览器存储不可用，请导出进度备份。'); } updateProgress(); return saved; }
function updateProgress() { const all = modules.flatMap(m => m.topics); const done = all.filter(t => state.topics[t.id]).length; const pct = percent(done, all.length); document.querySelector('#side-percent').textContent = `${pct}%`; document.querySelector('#side-progress').style.width = `${pct}%`; document.querySelector('#side-count').textContent = `${done} / ${all.length} 个知识点已完成 · 本机保存`; }
function validDate(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).valueOf()) && localISO(new Date(`${value}T12:00:00`)) === value; }
function localISO(date) { return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`; }
function normalizeState(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('无效的进度格式');
  const out = defaults();
  for (const [key, ids] of Object.entries({topics: modules.flatMap(m => m.topics.map(t => t.id)), papers: papers.map(p => p.id), weeks: schedule.map(w => String(w.week))})) {
    const source = data[key]; if (source && typeof source === 'object' && !Array.isArray(source)) for (const id of ids) if (source[id] === true) out[key][id] = true;
  }
  for (const m of modules) if (typeof data.notes?.[m.id] === 'string') out.notes[m.id] = data.notes[m.id].slice(0, 20000);
  if (validDate(data.startDate)) out.startDate = data.startDate;
  return out;
}
function weekDate(week) { if (!state.startDate) return ''; const start = new Date(`${state.startDate}T12:00:00`); start.setDate(start.getDate() + (week - 1) * 7); const end = new Date(start); end.setDate(end.getDate() + 6); const fmt = d => `${d.getMonth()+1}/${d.getDate()}`; return `${fmt(start)}–${fmt(end)}`; }
function currentWeek() { return schedule.find(w => !state.weeks[w.week]) || schedule.at(-1); }
function readingsForWeek(week) {
  if (week.readingIds?.length) return week.readingIds.map(id=>papers.find(p=>p.id===id)).filter(Boolean);
  const selected = [], limit = week.readingLimit || 2;
  for (const id of week.readingModuleIds) { const paper = modulePapers(id).find(p => p.level === 'essential' && !selected.includes(p)); if (paper && selected.length < limit) selected.push(paper); }
  for (const id of week.readingModuleIds) for (const paper of modulePapers(id)) if (!selected.includes(paper) && selected.length < limit) selected.push(paper);
  return selected;
}
function art() { return `<div class="hero-art" aria-hidden="true"><svg viewBox="0 0 440 315" fill="none"><ellipse cx="224" cy="155" rx="138" ry="86" transform="rotate(-28 224 155)" stroke="#bdc8aa"/><ellipse cx="224" cy="155" rx="130" ry="87" transform="rotate(36 224 155)" stroke="#bdc8aa"/><ellipse cx="224" cy="155" rx="73" ry="126" transform="rotate(18 224 155)" stroke="#c5ceb5"/><path d="M122 90L226 155L330 104M226 155L302 230M226 155L113 222M226 155L241 47" stroke="#a4b28d" stroke-dasharray="4 5"/><circle cx="226" cy="155" r="49" fill="#e4ebd5" stroke="#bccaa7"/><circle cx="226" cy="155" r="37" fill="#f8f9ef" stroke="#a4b58b"/><path d="M206 164L217 145L228 163L241 138M209 146L238 163" stroke="#7d9364" stroke-width="1.5"/><circle cx="206" cy="164" r="4" fill="#a1b681"/><circle cx="217" cy="145" r="4" fill="#bfcba7"/><circle cx="228" cy="163" r="4" fill="#8ea774"/><circle cx="241" cy="138" r="4" fill="#c5d5ad"/><circle cx="238" cy="163" r="4" fill="#b4c79a"/><rect x="79" y="66" width="90" height="45" rx="8" fill="#fafbf3" stroke="#ced7bd"/><text x="124" y="85" text-anchor="middle" fill="#7b896a" font-family="sans-serif" font-size="8">01 / FOUNDATIONS</text><text x="124" y="101" text-anchor="middle" fill="#4f6140" font-family="Georgia" font-style="italic" font-size="15">∇L(θ)</text><rect x="291" y="83" width="90" height="43" rx="8" fill="#eeebf4" stroke="#d1cadf"/><text x="336" y="100" text-anchor="middle" fill="#9585a6" font-family="sans-serif" font-size="8">02 / UNDERSTAND</text><text x="336" y="115" text-anchor="middle" fill="#796789" font-family="Georgia" font-size="13">Q · K · V</text><rect x="259" y="218" width="91" height="42" rx="8" fill="#f8f1e4" stroke="#ddd0b9"/><text x="304" y="235" text-anchor="middle" fill="#a69579" font-family="sans-serif" font-size="8">03 / EXPLORE</text><text x="304" y="250" text-anchor="middle" fill="#8d7b5f" font-family="Georgia" font-style="italic" font-size="13">What if ?</text><circle cx="113" cy="222" r="7" fill="#b7c599" stroke="#f3f6e8" stroke-width="3"/><circle cx="241" cy="47" r="5" fill="#b7c599"/><path d="M360 180v14m-7-7h14M150 268v10m-5-5h10" stroke="#a4b38d"/><text x="158" y="300" fill="#8b9978" font-family="sans-serif" font-size="7" letter-spacing="2">CONNECT THE DOTS.</text></svg></div>`; }
function overview() {
  const total = modules.reduce((n,m) => n+m.topics.length, 0), week = currentWeek();
  const groups = [
    {title:'Build the foundations',subtitle:'数学、工程与神经网络',priority:'P0',icon:'∑',color:'sage',ids:['01','02','03','04']},
    {title:'Understand modern AI',subtitle:'LLM、视觉与生成模型',priority:'P1',icon:'⌘',color:'lavender',ids:['05','06','07','08','09','10','11','12']},
    {title:'Find your research edge',subtitle:'长视频、记忆与具身智能',priority:'P2',icon:'✳',color:'peach',ids:['13','14']},
    {title:'Think like a researcher',subtitle:'读论文、做实验、提出好问题',priority:'P0–P1',icon:'↗',color:'sage',ids:['15']}
  ];
  main.innerHTML = `<div class="intro-line"><span class="eyebrow">A FIELD GUIDE TO AI RESEARCH</span><span class="outline-tag">MENTORSHIP · OPEN CURRICULUM</span></div><section class="hero"><div class="hero-copy"><div class="eyebrow">FROM FIRST PRINCIPLES TO YOUR FIRST PAPER</div><h1>Strong foundations.<br><em>Thoughtful research.</em></h1><p>从理解一个梯度，到提出一个值得研究的问题。<br>一份陪你从基础走向 AI 研究的学习地图。</p><div class="hero-actions"><a class="button primary" href="#curriculum">开始学习 <span>↗</span></a><a class="quiet-link" href="#schedule">查看学习日程 <span>→</span></a></div></div>${art()}</section><section class="stats" aria-label="课程统计"><div class="stat"><strong>15</strong><span><b>知识模块</b>Learning modules</span></div><div class="stat"><strong>${total}</strong><span><b>核心知识点</b>Things to understand</span></div><div class="stat"><strong>${papers.length}</strong><span><b>论文与学习材料</b>Selected readings</span></div><div class="stat"><strong>${schedule.length}</strong><span><b>周建议路径</b>At your own pace</span></div></section><div class="overview-columns"><section><div class="section-heading"><h2>你的学习地图<span>The learning path</span></h2><a class="text-link" href="#curriculum">全部模块 ↗</a></div><div class="route-grid">${groups.map(g => `<a class="route-card" href="${g.ids.length===1?'#module/15':'#curriculum'}" ${g.ids.length>1?`data-stage-link="${g.priority}"`:''}><div class="card-top"><span class="route-icon ${g.color}" aria-hidden="true">${g.icon}</span><span class="priority ${g.priority.toLowerCase()}">${g.priority}</span></div><h3>${g.title}</h3><p>${g.subtitle}</p><div class="route-card-bottom"><span>${pad(g.ids.length)} MODULE${g.ids.length>1?'S':''} <span>·</span> ${g.ids.reduce((n,id)=>n+modules.find(m=>m.id===id).topics.length,0)} 个知识点</span><b>↗</b></div></a>`).join('')}</div></section><aside class="overview-rail"><div class="focus-card"><div class="eyebrow">${schedule.every(w=>state.weeks[w.week])?'YOUR LEARNING JOURNEY':'YOUR NEXT STEP'}</div><div class="corner-spark" aria-hidden="true">✳</div><div class="week-number">Week ${pad(week.week)}</div><h3>${escape(week.title)}</h3><p>${escape(week.focus)}</p><a class="button" href="#schedule/week-${week.week}">查看本周任务 <span>↗</span></a></div><div class="mentor-note"><div class="eyebrow">A NOTE FROM YOUR MENTOR</div><p><b>理解，比打勾更重要。</b><br>每读一篇论文，试着回答：它解决了什么问题？为什么这个方法有效？我能做一个什么实验来验证它？</p></div></aside></div><section class="start-reading"><div class="section-heading"><h2>从这几篇开始<span>On your reading desk</span></h2><a class="text-link" href="#papers">打开论文书架 ↗</a></div><div class="reading-strip">${['how-to-read','attention','clip'].map((id,i) => {const p=papers.find(x=>x.id===id);return p?`<article class="mini-paper"><span class="paper-index">0${i+1}</span><div><h3>${external(p.url,`${escape(p.title)} ↗`)}</h3><p>${escape(p.authors)} · ${p.year}</p></div></article>`:''}).join('')}</div></section>`;
}
function curriculum() {
  main.innerHTML = `<div class="page-heading"><div><div class="eyebrow">THE LEARNING MAP</div><h1>把知识连成一张地图。</h1><p>先建立直觉，再动手实现。从 P0 基础到 P2 研究方向，逐个理解，逐个验证。</p></div><a class="button secondary" href="#schedule">配套学习日程 ↗</a></div><div class="toolbar"><div class="filter-tabs" aria-label="按优先级筛选">${[['all','全部模块'],['P0','P0 · 基础'],['P1','P1 · 核心'],['P2','P2 · 进阶']].map(([id,label])=>`<button data-curriculum-filter="${id}" class="${curriculumFilter===id?'active':''}" aria-pressed="${curriculumFilter===id}">${label}</button>`).join('')}</div><label class="search-wrap"><span aria-hidden="true">⌕</span><input id="curriculum-search" type="search" placeholder="搜索模块或知识点…" aria-label="搜索模块或知识点" value="${escape(curriculumQuery)}"></label></div><div id="curriculum-results"></div>`;
  curriculumResults();
}
function curriculumResults() {
  const q = curriculumQuery.toLocaleLowerCase().trim();
  const filtered = modules.filter(m => (curriculumFilter==='all'||m.priorities.includes(curriculumFilter)) && [m.title,m.subtitle,m.summary,...m.topics.map(t=>t.text)].join(' ').toLocaleLowerCase().includes(q));
  document.querySelector('#curriculum-results').innerHTML = `<div class="results-label" role="status">${filtered.length} / ${modules.length} 个模块 ${q?`· 搜索「${escape(curriculumQuery)}」`:''}</div><div class="module-list">${filtered.map(m => {const done=moduleProgress(m);return `<a href="#module/${m.id}" class="module-row"><span class="module-number">${m.id}</span><div><div class="module-title-line"><h3>${escape(m.title)}</h3>${priorities(m)}</div><p>${escape(m.summary)} · ${m.topics.length} 个知识点 · ${modulePapers(m.id).length} 份阅读材料</p></div><div class="module-meta">${done} / ${m.topics.length} 已理解<div class="progress-track"><span style="width:${percent(done,m.topics.length)}%"></span></div></div><span class="row-arrow">↗</span></a>`}).join('') || '<div class="empty"><h3>还没有匹配的知识点</h3><p>试试 Transformer、LoRA 或中文关键词，也可以切换到全部模块。</p></div>'}</div>`;
}
function paperReference(p) { return `<article class="paper-reference"><span class="paper-year">${p.year} / ${p.kind==='paper'?'PAPER':p.kind==='guide'?'GUIDE':'BOOK'} · ${p.level==='essential'?'优先阅读':'拓展阅读'}</span><h3>${external(p.url,`${escape(p.title)} ↗`)}</h3><p>${escape(p.note)}</p><label class="reading-check"><input type="checkbox" data-paper="${p.id}" ${state.papers[p.id]?'checked':''}>已阅读</label></article>`; }
function moduleDetail(id) {
  const m = modules.find(x=>x.id===id); if (!m) return notFound();
  const done = moduleProgress(m); let lastSection='';
  main.innerHTML = `<div class="module-detail-header"><a class="back-link" href="#curriculum">← 返回知识地图</a><div class="eyebrow">MODULE ${m.id} / ${groupLabels[m.group]}</div><h1>${escape(m.title)}</h1><p>${escape(m.subtitle)} <span style="padding:0 8px">·</span> ${m.topics.length} 个知识点</p>${m.note?`<div class="callout">${escape(m.note)}</div>`:''}${m.formula?`<div class="formula">${escape(m.formula)}</div>`:''}</div><div class="detail-layout"><section><div class="panel"><div class="section-heading"><h2 style="margin:0">知识清单</h2><span class="small muted" id="module-done">${done} / ${m.topics.length} 已理解</span></div><div class="checklist">${m.topics.map(t=>{let heading='';if(t.section && t.section!==lastSection){heading=`<div class="checklist-group">${escape(t.section)}</div>`;lastSection=t.section;}return `${heading}<label class="check-item ${state.topics[t.id]?'checked':''}"><input type="checkbox" data-topic="${t.id}" data-module="${m.id}" ${state.topics[t.id]?'checked':''}><span>${escape(t.text)}</span></label>`}).join('')}</div></div>${m.assessment?`<div class="panel"><h2>理解之后，动手验证。</h2><p class="small" style="line-height:2;margin-bottom:0">${escape(m.assessment)}</p></div>`:''}<div class="panel"><h2>我的研究笔记</h2><label for="module-notes" class="small muted">记录问题、实验想法，或下次和 mentor 讨论的内容。</label><textarea class="notes" id="module-notes" data-notes="${m.id}" maxlength="20000" placeholder="这部分最重要的直觉是……&#10;我还想弄清楚……" style="margin-top:12px">${escape(state.notes[m.id]||'')}</textarea><p class="small muted" style="margin:8px 0 0" id="notes-status">自动保存在当前浏览器</p></div></section><aside class="detail-aside"><div class="panel"><div class="check-progress"><span>MODULE PROGRESS</span><strong id="module-percent">${percent(done,m.topics.length)}%</strong></div><div class="progress-track"><span id="module-progress" style="width:${percent(done,m.topics.length)}%"></span></div><p class="small muted" style="margin:14px 0 0">理解后再勾选。进度属于你自己。</p></div><div class="panel"><h2>配套阅读 <span class="small muted">${modulePapers(id).length} 份</span></h2>${modulePapers(id).map(paperReference).join('')}</div><div class="panel"><h2>在学习日程中</h2>${schedule.filter(w=>w.moduleIds.includes(id)).map(w=>`<p class="small" style="margin-bottom:9px"><a href="#schedule/week-${w.week}">Week ${pad(w.week)} · ${escape(w.title)} ↗</a></p>`).join('')}</div></aside></div>`;
}
function library() {
  main.innerHTML = `<div class="page-heading"><div><div class="eyebrow">THE READING ROOM</div><h1>站在好论文的肩膀上。</h1><p>精选原始论文与官方学习材料。带着问题阅读，把方法、实验和自己的想法连起来。</p></div></div><div class="toolbar paper-toolbar"><label class="search-wrap"><span aria-hidden="true">⌕</span><input type="search" id="paper-search" placeholder="搜索标题、作者、阅读重点…" aria-label="搜索阅读材料" value="${escape(paperQuery)}"></label><select class="select-filter" id="paper-module" aria-label="按模块筛选论文"><option value="all">全部知识模块</option>${modules.map(m=>`<option value="${m.id}" ${paperModule===m.id?'selected':''}>${m.id} · ${escape(m.shortTitle)}</option>`).join('')}</select><div class="filter-tabs" aria-label="按阅读状态筛选">${[['all','全部'],['unread','未读'],['read','已读']].map(([id,label])=>`<button data-paper-status="${id}" class="${paperStatus===id?'active':''}" aria-pressed="${paperStatus===id}">${label}</button>`).join('')}</div></div><div id="paper-results"></div>`;
  paperResults();
}
function paperResults() {
  const q = paperQuery.toLocaleLowerCase().trim();
  const found = papers.filter(p=>(paperModule==='all'||p.moduleIds.includes(paperModule))&&(paperStatus==='all'||Boolean(state.papers[p.id])===(paperStatus==='read'))&&[p.title,p.authors,p.note,String(p.year)].join(' ').toLocaleLowerCase().includes(q));
  document.querySelector('#paper-results').innerHTML = `<div class="results-label" role="status">${found.length} 份阅读材料 · 已阅读 ${papers.filter(p=>state.papers[p.id]).length} / ${papers.length}</div><div class="paper-grid">${found.map(p=>`<article class="paper-card ${state.papers[p.id]?'read':''}"><div class="card-top"><span class="priority ${p.level==='further'?'p1':''}">${p.level==='essential'?'优先阅读':'拓展阅读'}</span><span class="small muted">${p.year} / ${p.kind==='paper'?'PAPER':p.kind==='book'?'BOOK':'GUIDE'}</span></div><h3>${external(p.url,`${escape(p.title)} ↗`)}</h3><div class="authors">${escape(p.authors)}</div><p style="margin-top:12px">${escape(p.note)}</p><div class="paper-card-bottom"><label class="reading-check"><input type="checkbox" data-paper="${p.id}" ${state.papers[p.id]?'checked':''}>已阅读</label><a class="text-link" href="#module/${p.moduleIds[0]}">模块 ${p.moduleIds.join(' / ')} ↗</a></div></article>`).join('')||'<div class="empty"><h3>书架上没有匹配的材料</h3><p>换个关键词或筛选条件试试。</p></div>'}</div>`;
}
function schedulePage(targetWeek) {
  const next = currentWeek();
  main.innerHTML = `<div class="page-heading"><div><div class="eyebrow">ONE WEEK AT A TIME</div><h1>研究是一场有节奏的长跑。</h1><p>24 周建议路径：理解概念 → 阅读论文 → 动手实验 → 与 mentor 讨论。可按基础与投入时间调整；P2 方向按兴趣选修。</p></div></div><div class="schedule-settings"><label for="start-date">我的开课日期</label><input type="date" id="start-date" value="${escape(state.startDate)}"><button class="button secondary" id="clear-date" ${state.startDate?'':'disabled'}>清除</button><span class="settings-note">日期仅在本机生效 · 未设置时按周次浏览 · 非固定截止日期</span></div><div class="legend-row"><span><i class="dot sage"></i>基础</span><span><i class="dot lavender"></i>核心能力</span><span><i class="dot peach"></i>研究方向</span><span>已完成 ${schedule.filter(w=>state.weeks[w.week]).length} / ${schedule.length} 周</span></div><div class="timeline">${schedule.map(w=>`<article id="week-${w.week}" class="week-card ${state.weeks[w.week]?'done':''} ${w.week===next.week?'current':''}"><div class="week-label"><span>WEEK</span><strong>${pad(w.week)}</strong><small>${weekDate(w.week)||'自主安排'}</small>${w.optional?'<span class="priority p2" style="display:inline-block;margin-top:10px">选修</span>':''}</div><div class="week-content"><h3>${escape(w.title)}</h3><p>${escape(w.focus)}</p><div class="deliverable"><b>本周产出</b>${escape(w.deliverable)}</div><div class="week-links">${w.moduleIds.map(id=>`<a href="#module/${id}">${id} · ${escape(modules.find(m=>m.id===id).shortTitle)}</a>`).join('')}</div></div><div class="week-reading"><div class="eyebrow">READ & REFLECT</div>${readingsForWeek(w).map(p=>external(p.url,`${escape(p.title)} ↗`)).join('')}<label class="week-status"><input type="checkbox" data-week="${w.week}" ${state.weeks[w.week]?'checked':''}>本周任务已完成</label></div></article>`).join('')}</div>`;
  if (targetWeek && /^week-\d+$/.test(targetWeek)) requestAnimationFrame(()=>document.getElementById(targetWeek)?.scrollIntoView({block:'start'}));
}
function notFound() { main.innerHTML = '<div class="empty"><h1>这一页还不在学习地图里。</h1><a class="button primary" href="#overview">回到课程概览 →</a></div>'; }
function route() {
  if (!modules.length || !schedule.length) return;
  const [rawView, id] = location.hash.slice(1).split('/');
  const view = rawView || 'overview';
  const nav = view==='module'?'curriculum':view;
  document.querySelectorAll('[data-nav]').forEach(a=>{ const active=a.dataset.nav===nav; a.classList.toggle('active',active); if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current'); });
  const labels={overview:'课程概览',curriculum:'知识地图',schedule:'学习日程',papers:'论文书架'};
  document.querySelector('#page-label').textContent=labels[nav]||'课程页面';
  document.title=`${view==='module'?(modules.find(m=>m.id===id)?.shortTitle||'模块'):labels[nav]||'Research'} · Research Fieldnotes`;
  if(view==='overview'||view==='')overview();else if(view==='curriculum')curriculum();else if(view==='module')moduleDetail(id);else if(view==='papers')library();else if(view==='schedule')schedulePage(id);else notFound();
  if(!id||view!=='schedule')window.scrollTo({top:0});
}
document.addEventListener('click', e=>{
  if(e.target.closest('.skip-link')){e.preventDefault();main.focus();main.scrollIntoView({block:'start'});return;}
  const stage=e.target.closest('[data-stage-link]'); if(stage){curriculumFilter=stage.dataset.stageLink;curriculumQuery='';if(location.hash==='#curriculum')curriculum();}
  const filter=e.target.closest('[data-curriculum-filter]');if(filter){curriculumFilter=filter.dataset.curriculumFilter;curriculum();}
  const status=e.target.closest('[data-paper-status]');if(status){paperStatus=status.dataset.paperStatus;library();}
  if(e.target.closest('#backup-open'))document.querySelector('#backup-dialog').showModal();
  if(e.target.closest('#import-open'))document.querySelector('#import-progress').click();
  if(e.target.closest('[data-close-dialog]'))document.querySelector('#backup-dialog').close();
  if(e.target.closest('#clear-date')){state.startDate='';save();schedulePage();}
  if(e.target.closest('#export-progress')){const blob=new Blob([JSON.stringify({source:'research-fieldnotes',version:1,exportedAt:new Date().toISOString(),data:state},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`research-fieldnotes-${localISO(new Date())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('学习进度已导出');}
});
document.addEventListener('input', e=>{
  if(e.target.id==='curriculum-search'){curriculumQuery=e.target.value;curriculumResults();}
  if(e.target.id==='paper-search'){paperQuery=e.target.value;paperResults();}
  if(e.target.dataset.notes){state.notes[e.target.dataset.notes]=e.target.value;const saved=save();document.querySelector('#notes-status').textContent=saved?'已自动保存在当前浏览器':'本机保存失败，请使用导出功能备份笔记';}
});
document.addEventListener('change', async e=>{
  const el=e.target;
  if(el.dataset.topic){state.topics[el.dataset.topic]=el.checked;save();el.closest('.check-item').classList.toggle('checked',el.checked);const m=modules.find(x=>x.id===el.dataset.module),done=moduleProgress(m),pct=percent(done,m.topics.length);document.querySelector('#module-done').textContent=`${done} / ${m.topics.length} 已理解`;document.querySelector('#module-percent').textContent=`${pct}%`;document.querySelector('#module-progress').style.width=`${pct}%`;}
  if(el.dataset.paper){state.papers[el.dataset.paper]=el.checked;save();if(location.hash==='#papers')paperResults();}
  if(el.dataset.week){state.weeks[el.dataset.week]=el.checked;save();const top=window.scrollY;schedulePage();window.scrollTo({top});}
  if(el.id==='paper-module'){paperModule=el.value;paperResults();}
  if(el.id==='start-date'){if(el.value&&!validDate(el.value)){toast('请输入有效日期');return;}state.startDate=el.value;save();schedulePage();}
  if(el.id==='import-progress'){
    const file=el.files[0];if(!file)return;
    try{if(file.size>2000000)throw new Error('文件过大，请选择课程导出的 JSON 备份');const imported=JSON.parse(await file.text());if(imported.source!=='research-fieldnotes'||imported.version!==1)throw new Error('这不是有效的课程进度备份');const parsed=normalizeState(imported.data);if(!window.confirm('导入将覆盖当前浏览器的学习进度和笔记。继续导入？'))return;state=parsed;save();route();document.querySelector('#backup-dialog').close();toast('学习进度已导入');}catch(error){toast(error.message||'导入失败，请检查 JSON 备份');}finally{el.value='';}
  }
});
window.addEventListener('hashchange',route);
window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY){try{state=e.newValue?normalizeState(JSON.parse(e.newValue)):defaults();updateProgress();if(!document.activeElement?.matches('textarea,input[type="search"]'))route();}catch{ /* Ignore malformed data from another tab. */ }}});
try {
  [modules,papers,schedule] = await Promise.all(['curriculum','papers','schedule'].map(async name=>{const r=await fetch(`./data/${name}.json`);if(!r.ok)throw new Error(`${name}: ${r.status}`);return r.json();}));
  try {const saved=localStorage.getItem(STORAGE_KEY);if(saved)state=normalizeState(JSON.parse(saved));} catch {toast('无法读取浏览器进度，已载入课程。你可以导入备份恢复。');}
  updateProgress();route();
} catch(error) { console.error('Course load failed:',error);main.innerHTML='<div class="empty"><h1>课程资料暂时未能载入。</h1><p>请检查网络后刷新。若在本地使用，请在项目目录运行 npm run dev 后打开本地地址。</p><button class="button primary" onclick="location.reload()">重新载入</button></div>'; }

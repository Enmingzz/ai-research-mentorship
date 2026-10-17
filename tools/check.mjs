import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {loadLessons,makeTopicIndex,lessonDocument,wordCount,escapeHTML,SITE_URL} from './lessons.mjs';
import {renderMathText,renderFormula} from './math.mjs';
const load=async name=>JSON.parse(await readFile(`data/${name}.json`,'utf8'));
const [modules,papers,projects]=await Promise.all(['curriculum','papers','projects'].map(load));
assert.equal(SITE_URL,'https://enmingzz.github.io/vlm-project','Canonical site follows the renamed repository');
assert.equal(modules.length,12,'The reference library contains subjects 01–12');
const ids=new Set(modules.map(m=>m.id));
assert.deepEqual([...ids],Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0')),'Removed modules are not published');
assert.deepEqual((await readdir('data/lessons')).sort(),[...ids].map(id=>`${id}.json`),'Removed lesson source files are absent');
const topics=modules.flatMap(m=>m.topics);
assert.equal(topics.length,174,'174 knowledge points in the retained modules');
assert.equal(new Set(topics.map(t=>t.id)).size,topics.length,'Unique topic IDs');
assert.equal(papers.length,29,'All 29 curated readings remain available');
assert.equal(new Set(papers.map(p=>p.id)).size,papers.length,'Unique reading IDs');
for(const m of modules){assert(m.title&&m.summary&&m.topics.length);assert(papers.filter(p=>p.moduleIds.includes(m.id)).length>=2,`Readings for ${m.id}`);for(const t of m.topics)assert(t.text?.trim()&&t.id.startsWith(`${m.id}-`),`${m.id}: complete topic metadata`);}
for(const p of papers){assert(p.title&&p.note&&p.year&&p.authors);assert.equal(new URL(p.url).protocol,'https:');for(const id of p.moduleIds)assert(ids.has(id),`Unknown paper module ${id}`);}
const html=await readFile('index.html','utf8');
const libraryHTML=await readFile('library.html','utf8');
const legacyHTML=await readFile('course.html','utf8');
const appSource=await readFile('app.js','utf8');
const lessonSource=await readFile('lesson.js','utf8');
assert(html.includes('lang="en"')&&html.includes('translate="no"')&&html.includes('name="viewport"'));
assert(libraryHTML.includes('lang="en"')&&libraryHTML.includes('translate="no"')&&libraryHTML.includes('name="viewport"'));
assert(html.includes('library.html'),'The research homepage links to the reference library');
assert(libraryHTML.includes('href="./"'),'The library links back to the group homepage');
assert(legacyHTML.includes('library.html')&&!legacyHTML.includes('src="./app.js"'),'The old course page is a lightweight library redirect');
for(const [name,content] of Object.entries({curriculum:JSON.stringify(modules),papers:JSON.stringify(papers),homepage:html,library:libraryHTML,legacy:legacyHTML,application:appSource,articleScript:lessonSource}))assert(!/\p{Script=Han}/u.test(content),`${name}: English content`);
const personalControls=/type=["']checkbox["']|id=["'](?:backup-dialog|import-progress|export-progress|start-date|module-notes|topic-understood|completion-status|side-progress|side-count)["']|data-(?:topic|paper|week|notes)=/i;
assert(!personalControls.test(libraryHTML),'The reference library has no personal tracking controls');
assert(!/href=["']#(?:schedule|curriculum|fieldnotes|module)(?:[\/"'])/.test(libraryHTML),'Library navigation uses canonical reference routes');
for(const [name,content] of Object.entries({application:appSource,articleScript:lessonSource}))assert(!/\b(?:localStorage|sessionStorage|indexedDB)\b/.test(content),`${name}: no browser storage access`);
execFileSync(process.execPath,['--check','app.js']);
execFileSync(process.execPath,['--check','lesson.js']);
execFileSync(process.execPath,['--check','projects.js']);
assert(Array.isArray(projects.projects)&&Array.isArray(projects.tasks),'Research content has projects and tasks arrays');
const projectIds=new Set(projects.projects.map(p=>p.id));
assert.equal(projectIds.size,projects.projects.length,'Unique project IDs');
assert.equal(new Set(projects.tasks.map(t=>t.id)).size,projects.tasks.length,'Unique task IDs');
const checkDate=value=>value===undefined||value===''||(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value);
const checkLinks=(links,label)=>{assert(Array.isArray(links),`${label}: links array`);for(const link of links){assert(link.label?.trim(),`${label}: link label`);assert.equal(new URL(link.url).protocol,'https:',`${label}: HTTPS source`);}};
for(const project of projects.projects){assert(/^[a-z0-9-]+$/.test(project.id));assert(project.title?.trim()&&project.summary?.trim());assert(['planned','active','completed'].includes(project.status));assert(Array.isArray(project.tags)&&project.tags.every(t=>typeof t==='string'&&t.trim()));assert(checkDate(project.updated));checkLinks(project.links,project.id);}
for(const task of projects.tasks){assert(/^[a-z0-9-]+$/.test(task.id));assert(task.title?.trim()&&task.description?.trim());assert(['open','in-progress','done'].includes(task.status));assert(['normal','high'].includes(task.priority));assert(task.projectId==null||projectIds.has(task.projectId),`${task.id}: valid project`);assert(task.assignee===undefined||typeof task.assignee==='string');assert(checkDate(task.dueDate));checkLinks(task.links,task.id);}
const course=await loadLessons();
const topicIds=new Set(topics.map(t=>t.id));
const lessonIds=new Set(course.lessons.map(l=>l.topicId));
assert.equal(course.lessons.length,topics.length,'One complete article per topic');
assert.deepEqual(lessonIds,topicIds,'Article coverage matches every curriculum topic');
assert.equal(Object.keys(makeTopicIndex(course)).length,topics.length);
for(const lesson of course.lessons){
  const label=lesson.topicId;
  assert(lesson.title?.trim()&&lesson.summary?.trim(),`${label}: title and summary`);
  assert(Array.isArray(lesson.prerequisites),`${label}: prerequisites`);
  for(const id of lesson.prerequisites)assert(topicIds.has(id)&&id!==label,`${label}: valid prerequisite ${id}`);
  assert(lesson.sections.length>=3,`${label}: substantive explanation sections`);
  const sourceReading=lesson.sections.find(section=>section.id==='source-reading');
  assert(sourceReading?.paragraphs?.length>=2,`${label}: original-source reading explanation`);
  assert.equal(new Set(lesson.sections.map(s=>s.id)).size,lesson.sections.length,`${label}: unique section anchors`);
  for(const section of lesson.sections){assert(/^[a-z0-9-]+$/.test(section.id),`${label}: safe section anchor`);assert(section.title?.trim());assert(section.paragraphs?.length&&section.paragraphs.every(p=>typeof p==='string'&&p.trim()),`${label}: section prose`);}
  assert(lesson.exercise?.prompt?.trim()&&lesson.exercise?.answer?.trim(),`${label}: exercise and worked answer`);
  assert(lesson.takeaways?.length>=2,`${label}: takeaways`);
  assert(wordCount(lesson)>=220,`${label}: complete explanation (got ${wordCount(lesson)} words)`);
  assert(lesson.references?.length>=1,`${label}: topic-specific source`);
  for(const ref of lesson.references){assert(ref.title?.trim()&&ref.note?.trim());assert(['paper','guide','book'].includes(ref.kind));assert.equal(new URL(ref.url).protocol,'https:');}
  assert(!/\p{Script=Han}/u.test(JSON.stringify(lesson)),`${label}: English article`);
  const page=lessonDocument(lesson,course);
  assert(page.includes('lang="en" translate="no"'),`${label}: keep the English original`);
  for(const section of lesson.sections){assert(page.includes(`id="section-${section.id}"`));assert(page.includes(`href="#section-${section.id}"`));}
  assert(page.includes(`data-topic-id="${label}"`)&&page.includes('<h1>')&&page.includes('id="references"'));
  assert(page.includes('href="../../style.css"')&&page.includes('src="../../lesson.js"'));
  assert(page.includes(`href="../../library.html#subject/${label.slice(0,2)}"`),'Articles return to their subject in the reference library');
  assert(page.includes(`rel="canonical" href="${SITE_URL}/learn/${label}/"`),`${label}: canonical article URL`);
  assert(!personalControls.test(page),`${label}: reference articles have no personal tracking controls`);
  assert(!page.includes('course.html')&&!page.includes('#schedule')&&!page.includes('ai-research-mentorship'),`${label}: current library navigation and repository`);
  assert(!/\bP[012]\b/.test(page),`${label}: no curriculum priority badges`);
  const structured=JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]||'null');
  assert(structured&&['Article','TechArticle'].includes(structured['@type']),`${label}: article structured data`);
  assert.equal(structured.url,`${SITE_URL}/learn/${label}/`);
  assert.equal(structured.isPartOf?.url,`${SITE_URL}/library.html`);
  for(const section of lesson.sections){for(const paragraph of section.paragraphs)assert(page.includes(renderMathText(paragraph)),`${label}: full explanatory prose and inline mathematics`);if(section.code)assert(page.includes(escapeHTML(section.code)),`${label}: code example`);if(section.formula)assert(page.includes(renderFormula(section.formula,{displayMode:true})),`${label}: typeset formula`);for(const bullet of section.bullets||[])assert(page.includes(renderMathText(bullet)),`${label}: explanatory list`);}
  assert(page.includes(renderMathText(lesson.exercise.prompt))&&page.includes(renderMathText(lesson.exercise.answer)),`${label}: example and answer preserved`);
  for(const takeaway of lesson.takeaways)assert(page.includes(renderMathText(takeaway)),`${label}: takeaway preserved`);
  for(const ref of lesson.references){assert(page.includes(`href="${escapeHTML(ref.url)}" target="_blank" rel="noopener noreferrer"`),`${label}: safe source link`);assert(page.includes(escapeHTML(ref.note)),`${label}: source reading focus`);}
  for(const id of lesson.prerequisites)assert(page.includes(`href="../${id}/"`),`${label}: related concept navigation`);
  assert(!/href="\.\.\/undefined\//.test(page),`${label}: valid article navigation`);
}
assert.equal(escapeHTML('<script>"&'), '&lt;script&gt;&quot;&amp;','Article content is escaped');
execFileSync(process.execPath,['tools/check-interactions.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['tools/check-projects.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['tools/check-math.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['tools/check-subject-map.mjs'],{stdio:'inherit'});
console.log(`PASS · ${modules.length} subjects · ${topics.length} complete articles · ${papers.length} curated readings · references, navigation, content and JavaScript`);

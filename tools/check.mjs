import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {loadLessons,makeTopicIndex,lessonDocument,wordCount,escapeHTML} from './lessons.mjs';
const load=async name=>JSON.parse(await readFile(`data/${name}.json`,'utf8'));
const [modules,papers,schedule,projects]=await Promise.all(['curriculum','papers','schedule','projects'].map(load));
assert.equal(modules.length,12,'The course contains modules 01–12');
const ids=new Set(modules.map(m=>m.id));
assert.deepEqual([...ids],Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0')),'Removed modules are not published');
assert.deepEqual((await readdir('data/lessons')).sort(),[...ids].map(id=>`${id}.json`),'Removed lesson source files are absent');
const topics=modules.flatMap(m=>m.topics);
assert.equal(topics.length,174,'174 knowledge points in the retained modules');
assert.equal(new Set(topics.map(t=>t.id)).size,topics.length,'Unique topic IDs');
assert.equal(new Set(papers.map(p=>p.id)).size,papers.length,'Unique reading IDs');
for(const m of modules){assert(m.title&&m.topics.length&&m.priorities.length);assert(papers.filter(p=>p.moduleIds.includes(m.id)).length>=2,`Readings for ${m.id}`);}
for(const p of papers){assert(p.title&&p.note&&p.year&&p.authors);assert.equal(new URL(p.url).protocol,'https:');for(const id of p.moduleIds)assert(ids.has(id),`Unknown paper module ${id}`);}
assert.equal(schedule.length,20,'20 suggested weeks for modules 01–12');
schedule.forEach((w,i)=>{assert.equal(w.week,i+1);assert(w.title&&w.focus&&w.deliverable);for(const id of [...w.moduleIds,...w.readingModuleIds])assert(ids.has(id),`Unknown schedule module ${id}`);for(const id of w.readingIds||[])assert(papers.some(p=>p.id===id),`Unknown week ${w.week} reading: ${id}`);});
for(const id of ids)assert(schedule.some(w=>w.moduleIds.includes(id)),`Schedule covers module ${id}`);
const html=await readFile('index.html','utf8');
const courseHTML=await readFile('course.html','utf8');
assert(html.includes('lang="en"')&&html.includes('translate="no"')&&html.includes('name="viewport"'));
assert(courseHTML.includes('lang="en"')&&courseHTML.includes('translate="no"'));
assert(html.includes('course.html'),'The research homepage links to the learning course');
assert(courseHTML.includes('href="./"'),'The course links back to the group homepage');
for(const [name,content] of Object.entries({curriculum:JSON.stringify(modules),papers:JSON.stringify(papers),schedule:JSON.stringify(schedule),homepage:html,course:courseHTML,application:await readFile('app.js','utf8')}))assert(!/\p{Script=Han}/u.test(content),`${name}: English course content`);
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
  assert(page.includes(`href="../../course.html#module/${label.slice(0,2)}"`),'Articles return to their module in the learning course');
  assert(!/href="\.\.\/undefined\//.test(page),`${label}: valid article navigation`);
}
assert.equal(escapeHTML('<script>"&'), '&lt;script&gt;&quot;&amp;','Article content is escaped');
execFileSync(process.execPath,['tools/check-interactions.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['tools/check-projects.mjs'],{stdio:'inherit'});
console.log(`PASS · ${modules.length} modules · ${topics.length} topics and articles · ${papers.length} core readings · ${schedule.length} weeks · references, navigation, content and JavaScript`);

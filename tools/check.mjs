import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const load=async name=>JSON.parse(await readFile(`data/${name}.json`,'utf8'));
const [modules,papers,schedule]=await Promise.all(['curriculum','papers','schedule'].map(load));
assert.equal(modules.length,15,'15 syllabus modules must be retained');
const ids=new Set(modules.map(m=>m.id));
const topics=modules.flatMap(m=>m.topics);
assert.equal(topics.length,216,'216 original knowledge points must be retained');
assert.equal(new Set(topics.map(t=>t.id)).size,topics.length,'Unique topic IDs');
assert.equal(new Set(papers.map(p=>p.id)).size,papers.length,'Unique reading IDs');
for(const m of modules){assert(m.title&&m.topics.length&&m.priorities.length);assert(papers.filter(p=>p.moduleIds.includes(m.id)).length>=2,`Readings for ${m.id}`);}
for(const p of papers){assert(p.title&&p.note&&p.year&&p.authors);assert.equal(new URL(p.url).protocol,'https:');for(const id of p.moduleIds)assert(ids.has(id),`Unknown paper module ${id}`);}
assert.equal(schedule.length,24,'24 suggested weeks');
schedule.forEach((w,i)=>{assert.equal(w.week,i+1);assert(w.title&&w.focus&&w.deliverable);for(const id of [...w.moduleIds,...w.readingModuleIds])assert(ids.has(id),`Unknown schedule module ${id}`);for(const id of w.readingIds||[])assert(papers.some(p=>p.id===id),`Unknown week ${w.week} reading: ${id}`);});
for(const id of ids)assert(schedule.some(w=>w.moduleIds.includes(id)),`Schedule covers module ${id}`);
const html=await readFile('index.html','utf8');
assert(html.includes('lang="en"')&&html.includes('name="viewport"'));
execFileSync(process.execPath,['--check','app.js']);
console.log(`PASS · ${modules.length} modules · ${topics.length} topics · ${papers.length} readings · ${schedule.length} weeks · valid references and JavaScript`);

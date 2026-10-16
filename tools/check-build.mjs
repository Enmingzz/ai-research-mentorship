import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root=resolve('dist');
const index=JSON.parse(await readFile(resolve(root,'data/topic-index.json'),'utf8'));
const topicIds=Object.keys(index).sort();
const siteURL='https://enmingzz.github.io/vlm-project';
assert.equal(topicIds.length,174,'All 174 reference articles are published');
assert.deepEqual((await readdir(resolve(root,'learn'))).sort(),topicIds,'Only active article directories are published');
assert.deepEqual((await readdir(resolve(root,'data/lessons'))).sort(),[...new Set(topicIds.map(id=>id.slice(0,2)+'.json'))].sort(),'Removed lesson data is not published');
assert.equal(new Set(topicIds.map(id=>id.slice(0,2))).size,12,'All 12 subjects remain available');
assert.equal(JSON.parse(await readFile(resolve(root,'data/papers.json'),'utf8')).length,29,'All 29 readings are published');
await assert.rejects(access(resolve(root,'data/schedule.json')),{code:'ENOENT'},'The retired schedule is not published');
const files=['index.html','library.html','course.html',...topicIds.map(id=>`learn/${id}/index.html`)];
const htmlPages=new Map(await Promise.all(files.map(async file=>[file,await readFile(resolve(root,file),'utf8')])));
const assetVersions=new Set();
let targets=0;
for(const file of files){
  const filename=resolve(root,file);
  const html=htmlPages.get(file);
  assert(html.includes('lang="en" translate="no"'),`${file}: English original`);
  assert(!/\p{Script=Han}/u.test(html),`${file}: English interface and content`);
  assert(!html.includes('Research Fieldnotes'),`${file}: current group name`);
  assert(!html.includes('ai-research-mentorship'),`${file}: renamed repository URLs`);
  if(file==='library.html'||file.startsWith('learn/')){
    assert(!/type=["']checkbox["']|id=["'](?:topic-understood|completion-status|backup-dialog|module-notes|start-date)["']/.test(html),`${file}: no personal tracking interface`);
    assert(!/href=["'][^"']*(?:#schedule|course\.html)/.test(html),`${file}: reference navigation excludes the retired course`);
  }
  for(const [tag] of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g))assert(/rel="[^"]*noopener[^\"]*noreferrer/.test(tag),`${file}: external links isolate the new tab`);
  for(const [,href] of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    if(href.startsWith('#')){
      if(file.startsWith('learn/'))assert(html.includes(`id="${href.slice(1)}"`),`${file}: section anchor ${href}`);
      continue;
    }
    const target=new URL(href.replaceAll('&amp;','&'),pathToFileURL(filename));
    if(target.protocol!=='file:')continue;
    if(/\.(css|js)$/.test(target.pathname)){
      const version=target.searchParams.get('v')||'';
      assert(/^[a-f0-9]{12}$/.test(version),`${file}: versioned asset ${href}`);
      assetVersions.add(version);
    }
    target.hash='';target.search='';
    if(target.pathname.endsWith('/'))target.pathname+='index.html';
    const location=fileURLToPath(target),inside=relative(root,location);
    assert(!inside.startsWith('..')&&!isAbsolute(inside),`${file}: link stays inside published site`);
    await access(location);targets++;
  }
}
assert.equal(assetVersions.size,1,'Every published page references the same asset version');
for(const file of ['app.js','projects.js']){
  const source=await readFile(resolve(root,file),'utf8');
  assert(source.includes(`const BUILD_VERSION = '${[...assetVersions][0]}';`),`${file}: data and assets share the build version`);
}
for(const file of ['app.js','lesson.js'])assert(!/\b(?:localStorage|sessionStorage|indexedDB)\b/.test(await readFile(resolve(root,file),'utf8')),`${file}: published reference code never touches personal storage`);
const sitemap=await readFile(resolve(root,'sitemap.xml'),'utf8');
const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
assert.deepEqual(new Set(urls),new Set([`${siteURL}/`,`${siteURL}/library.html`,...topicIds.map(id=>`${siteURL}/learn/${id}/`)]),'Sitemap contains only canonical research, library and article URLs');
assert.equal(urls.length,new Set(urls).size,'Sitemap URLs are unique');
console.log(`PASS · ${files.length} published pages · ${targets} local link and asset targets · canonical library URLs and no retired schedule`);

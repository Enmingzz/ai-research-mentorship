import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root=resolve('dist');
const index=JSON.parse(await readFile(resolve(root,'data/topic-index.json'),'utf8'));
const topicIds=Object.keys(index).sort();
assert.deepEqual((await readdir(resolve(root,'learn'))).sort(),topicIds,'Only active article directories are published');
assert.deepEqual((await readdir(resolve(root,'data/lessons'))).sort(),[...new Set(topicIds.map(id=>id.slice(0,2)+'.json'))].sort(),'Removed lesson data is not published');
const files=['index.html','course.html',...topicIds.map(id=>`learn/${id}/index.html`)];
let targets=0;
for(const file of files){
  const filename=resolve(root,file);
  const html=await readFile(filename,'utf8');
  assert(html.includes('lang="en" translate="no"'),`${file}: English original`);
  assert(!/\p{Script=Han}/u.test(html),`${file}: English interface and content`);
  assert(!html.includes('Research Fieldnotes'),`${file}: current group name`);
  for(const [,href] of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    if(href.startsWith('#'))continue;
    const target=new URL(href.replaceAll('&amp;','&'),pathToFileURL(filename));
    if(target.protocol!=='file:')continue;
    if(/\.(css|js)$/.test(target.pathname))assert(/^[a-f0-9]{12}$/.test(target.searchParams.get('v')||''),`${file}: versioned asset ${href}`);
    target.hash='';target.search='';
    if(target.pathname.endsWith('/'))target.pathname+='index.html';
    const location=fileURLToPath(target),inside=relative(root,location);
    assert(!inside.startsWith('..')&&!isAbsolute(inside),`${file}: link stays inside published site`);
    await access(location);targets++;
  }
}
console.log(`PASS · ${files.length} published pages · ${targets} local link and asset targets · no removed modules`);

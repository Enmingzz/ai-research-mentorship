import { mkdir, readFile, cp, writeFile, realpath, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname, basename } from 'node:path';
import {loadLessons,makeTopicIndex,lessonDocument,SITE_URL} from './lessons.mjs';
const workspace=await realpath(process.cwd());
const output=resolve(workspace,'dist');
if(dirname(output)!==workspace||basename(output)!=='dist')throw new Error('Build output must be the workspace dist directory');
try{if(await realpath(output)!==output)throw new Error('Build output cannot be a link outside the workspace');}catch(error){if(error.code!=='ENOENT')throw error;}
await rm(output,{recursive:true,force:true});
await mkdir(output, { recursive: true });
await cp('data', 'dist/data', { recursive: true, filter: source => basename(source) !== 'schedule.json' });
await mkdir('dist/vendor/katex',{recursive:true});
for(const file of ['katex.min.css','LICENSE'])await cp(`vendor/katex/${file}`,`dist/vendor/katex/${file}`);
await cp('vendor/katex/fonts','dist/vendor/katex/fonts',{recursive:true});
const course=await loadLessons();
const index=makeTopicIndex(course);
const expected=course.modules.reduce((total,m)=>total+m.topics.length,0);
if(course.lessons.length!==expected||Object.keys(index).length!==expected)throw new Error('Every library topic needs one complete article before publication');
const files=['index.html','library.html','course.html','style.css','app.js','lesson.css','lesson.js','projects.css','projects.js'];
const sources=await Promise.all(files.map(file=>readFile(file,'utf8')));
const readingData=await Promise.all(['papers','projects'].map(name=>readFile(`data/${name}.json`,'utf8')));
const mathAssets=await Promise.all(['tools/math.mjs','vendor/katex/VENDOR.json','vendor/katex/katex.min.css'].map(file=>readFile(file,'utf8')));
const version=createHash('sha256').update(JSON.stringify([course,sources,readingData,mathAssets])).digest('hex').slice(0,12);
const versionAssets=html=>html.replace(/((?:src|href)="[^"]+\.(?:css|js))"/g,`$1?v=${version}"`);
for(let i=0;i<files.length;i++){
  let content=sources[i];
  if(files[i].endsWith('.html'))content=versionAssets(content);
  if(['app.js','projects.js'].includes(files[i]))content=content.replace("const BUILD_VERSION = 'development';",`const BUILD_VERSION = '${version}';`);
  await writeFile(`dist/${files[i]}`,content);
}
await writeFile('dist/data/topic-index.json',JSON.stringify(index));
for(const lesson of course.lessons){
  const directory=`dist/learn/${lesson.topicId}`;
  await mkdir(directory,{recursive:true});
  await writeFile(`${directory}/index.html`,versionAssets(lessonDocument(lesson,course)));
}
await writeFile('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}/</loc></url><url><loc>${SITE_URL}/library.html</loc></url>${course.lessons.map(l=>`<url><loc>${SITE_URL}/learn/${l.topicId}/</loc></url>`).join('')}</urlset>`);
await writeFile('dist/.nojekyll', '');
await import('./check-build.mjs');
console.log(`Built enming group, reference library + ${course.lessons.length} articles → dist/ (version ${version})`);

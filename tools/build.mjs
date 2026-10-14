import { mkdir, readFile, cp, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {loadLessons,makeTopicIndex,lessonDocument,SITE_URL} from './lessons.mjs';
await mkdir('dist', { recursive: true });
await cp('data', 'dist/data', { recursive: true });
const course=await loadLessons();
const index=makeTopicIndex(course);
const expected=course.modules.reduce((total,m)=>total+m.topics.length,0);
if(course.lessons.length!==expected||Object.keys(index).length!==expected)throw new Error('Every curriculum topic needs one complete lesson before publication');
const files=['index.html','style.css','app.js','lesson.css','lesson.js'];
const sources=await Promise.all(files.map(file=>readFile(file,'utf8')));
const readingData=await Promise.all(['papers','schedule'].map(name=>readFile(`data/${name}.json`,'utf8')));
const version=createHash('sha256').update(JSON.stringify([course,sources,readingData])).digest('hex').slice(0,12);
const versionAssets=html=>html.replace(/((?:src|href)="[^"]+\.(?:css|js))"/g,`$1?v=${version}"`);
for(let i=0;i<files.length;i++){
  let content=sources[i];
  if(files[i]==='index.html')content=versionAssets(content);
  if(files[i]==='app.js')content=content.replace("const BUILD_VERSION = 'development';",`const BUILD_VERSION = '${version}';`);
  await writeFile(`dist/${files[i]}`,content);
}
await writeFile('dist/data/topic-index.json',JSON.stringify(index));
for(const lesson of course.lessons){
  const directory=`dist/learn/${lesson.topicId}`;
  await mkdir(directory,{recursive:true});
  await writeFile(`${directory}/index.html`,versionAssets(lessonDocument(lesson,course)));
}
await writeFile('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}/</loc></url>${course.lessons.map(l=>`<url><loc>${SITE_URL}/learn/${l.topicId}/</loc></url>`).join('')}</urlset>`);
await writeFile('dist/.nojekyll', '');
console.log(`Built course + ${course.lessons.length} standalone topic articles → dist/ (version ${version})`);

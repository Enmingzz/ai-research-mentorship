import { mkdir, copyFile, cp, writeFile } from 'node:fs/promises';
import {loadLessons,makeTopicIndex,lessonDocument,SITE_URL} from './lessons.mjs';
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'style.css', 'app.js','lesson.css','lesson.js']) await copyFile(file, `dist/${file}`);
await cp('data', 'dist/data', { recursive: true });
const course=await loadLessons();
const index=makeTopicIndex(course);
const expected=course.modules.reduce((total,m)=>total+m.topics.length,0);
if(course.lessons.length!==expected||Object.keys(index).length!==expected)throw new Error('Every curriculum topic needs one complete lesson before publication');
await writeFile('dist/data/topic-index.json',JSON.stringify(index));
for(const lesson of course.lessons){
  const directory=`dist/learn/${lesson.topicId}`;
  await mkdir(directory,{recursive:true});
  await writeFile(`${directory}/index.html`,lessonDocument(lesson,course));
}
await writeFile('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}/</loc></url>${course.lessons.map(l=>`<url><loc>${SITE_URL}/learn/${l.topicId}/</loc></url>`).join('')}</urlset>`);
await writeFile('dist/.nojekyll', '');
console.log(`Built course + ${course.lessons.length} standalone topic articles → dist/`);

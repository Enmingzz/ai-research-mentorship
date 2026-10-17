import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import {loadLessons,makeTopicIndex,lessonDocument} from './lessons.mjs';
const root=process.cwd();
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{
  try{
    let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname==='/data/topic-index.json'){
      const course=await loadLessons({partial:true});res.writeHead(200,{'Content-Type':types['.json'],'Cache-Control':'no-store'});res.end(JSON.stringify(makeTopicIndex(course)));return;
    }
    const lessonMatch=pathname.match(/^\/learn\/(\d{2}-\d{2})(\/|\/index\.html)?$/);
    if(lessonMatch){
      if(!lessonMatch[2]){res.writeHead(302,{'Location':pathname+'/'});res.end();return;}
      const course=await loadLessons({partial:true});const lesson=course.lessons.find(l=>l.topicId===lessonMatch[1]);if(!lesson)throw new Error('Unknown lesson');
      res.writeHead(200,{'Content-Type':types['.html'],'Cache-Control':'no-store'});res.end(lessonDocument(lesson,course));return;
    }
    if(pathname.endsWith('/'))pathname+='index.html';
    const target=path.resolve(root,`.${pathname}`);
    const relative=path.relative(root,target);
    if(relative.startsWith('..')||path.isAbsolute(relative)||relative.split(path.sep).some(p=>p.startsWith('.'))){res.writeHead(403);res.end('Forbidden');return;}
    if(!(await stat(target)).isFile())throw new Error('Not a file');
    res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(target));
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${server.address().port}`));

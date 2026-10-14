import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {loadLessons,makeTopicIndex} from './lessons.mjs';

// Unit-check shared progress without depending on a browser or replacing browser QA.
const source=await readFile('lesson.js','utf8');
const key='research-fieldnotes-v1';
function harness(initial,{blocked=false}={}){
  const storage=new Map(initial===undefined?[]:[[key,initial]]);
  const elements=new Map();const events=new Map();
  function element(id){if(!elements.has(id))elements.set(id,{checked:false,textContent:'',listeners:{},classList:{add(){},remove(){}},addEventListener(type,fn){this.listeners[type]=fn;}});return elements.get(id);}
  vm.runInNewContext(source,{
    document:{body:{dataset:{topicId:'04-03'}},querySelector:element},
    localStorage:{getItem(k){if(blocked)throw new Error('Blocked');return storage.get(k)||null;},setItem(k,v){if(blocked)throw new Error('Blocked');storage.set(k,v);}},
    window:{addEventListener(type,fn){events.set(type,fn);}},
    navigator:{clipboard:{writeText:async()=>{}}},location:{href:'https://example.com/learn/04-03/'},
    setTimeout:()=>1,clearTimeout:()=>{}
  });
  return {storage,element,events};
}
const original={topics:{'01-01':true},papers:{attention:true},weeks:{1:true},notes:{'04':'Keep this existing note, including 数学 and <symbols>.'},startDate:'2026-10-01'};
const test=harness(JSON.stringify(original));
const checkbox=test.element('#topic-understood');
assert.equal(checkbox.checked,false);
checkbox.checked=true;checkbox.listeners.change();
assert.deepEqual(JSON.parse(test.storage.get(key)),{...original,topics:{...original.topics,'04-03':true}},'Article completion preserves notes, readings, schedule and previous topics');
checkbox.checked=false;checkbox.listeners.change();
assert.equal(JSON.parse(test.storage.get(key)).topics['04-03'],false);
test.storage.set(key,JSON.stringify({...original,topics:{'04-03':true}}));test.events.get('storage')({key});
assert.equal(checkbox.checked,true,'An update in the course tab is reflected in the article');
test.storage.set(key,JSON.stringify(original));test.events.get('pageshow')({persisted:true});
assert.equal(checkbox.checked,false,'Browser back/forward restores current progress from storage');
const corrupted=harness('{broken');corrupted.element('#topic-understood').checked=true;corrupted.element('#topic-understood').listeners.change();
assert.equal(corrupted.storage.get(key),'{broken','Malformed progress is never overwritten');
assert.equal(corrupted.element('#topic-understood').checked,false);
const blocked=harness(undefined,{blocked:true});blocked.element('#topic-understood').checked=true;blocked.element('#topic-understood').listeners.change();
assert.equal(blocked.element('#topic-understood').checked,false,'Failed writes are not shown as saved');
const fresh=harness();fresh.element('#topic-understood').checked=true;fresh.element('#topic-understood').listeners.change();
assert.equal(JSON.parse(fresh.storage.get(key)).topics['04-03'],true,'New readers can save progress');
console.log('PASS · article progress preserves existing data, synchronizes across tabs, and handles unavailable or corrupt storage');

const course=await loadLessons({partial:true});
const topicIndex=makeTopicIndex(course);
const fixtures={curriculum:course.modules,'topic-index':topicIndex,papers:JSON.parse(await readFile('data/papers.json','utf8')),schedule:JSON.parse(await readFile('data/schedule.json','utf8'))};
const uiElements=new Map(),uiEvents=new Map(),windowEvents=new Map();
function uiElement(selector){if(!uiElements.has(selector))uiElements.set(selector,{innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},scrollIntoView(){},focus(){}});return uiElements.get(selector);}
const appSource=await readFile('app.js','utf8');
const location={hash:''};
const uiStorage=new Map();
const app=await vm.runInNewContext(`(async()=>{${appSource}\nreturn {route,fieldnotes};})()`,{
  document:{querySelector:uiElement,querySelectorAll:()=>[],addEventListener(type,fn){uiEvents.set(type,fn);},getElementById:id=>uiElement('#'+id)},
  localStorage:{getItem:key=>uiStorage.get(key)||null,setItem:(key,val)=>uiStorage.set(key,val)},
  fetch:async (url,options)=>{assert(url.endsWith('?v=development'),'Course data requests include the build version');assert.equal(options.cache,'no-cache','Course data is revalidated');return {ok:true,json:async()=>fixtures[url.split('?')[0].replace('./data/','').replace('.json','')]};},
  window:{addEventListener(type,fn){windowEvents.set(type,fn);},scrollTo(){}},location,console,
  requestAnimationFrame:fn=>fn(),setTimeout:()=>1,clearTimeout:()=>{}
});
assert(uiElement('#main').innerHTML.includes('TOPIC EXPLAINERS'),'Homepage links to the article collection');
assert(uiElement('#main').innerHTML.includes('<strong>12</strong>')&&uiElement('#main').innerHTML.includes('<strong>174</strong>'),'Course overview reflects the retained syllabus');
location.hash='#schedule';app.route();
assert.equal((uiElement('#main').innerHTML.match(/class="week-card/g)||[]).length,20,'Schedule contains twenty weeks');
location.hash='#module/13';app.route();
assert(uiElement('#main').innerHTML.includes('This page is not on the map.'),'Removed modules cannot be opened');
const readyModule=course.modules.find(m=>m.topics.every(t=>topicIndex[t.id]));
assert(readyModule,'At least one module is complete for interaction checks');
location.hash=`#module/${readyModule.id}`;app.route();
const checklistHTML=uiElement('#main').innerHTML;
for(const topic of readyModule.topics){assert(checklistHTML.includes(`href="./learn/${topic.id}/"`));assert(checklistHTML.includes(topicIndex[topic.id].references[0].url.replaceAll('&','&amp;')));}
assert(!/<label[^>]*>[\s\S]*?class="topic-title"[\s\S]*?<\/label>/.test(checklistHTML),'Article links are outside checkbox labels');
uiStorage.set(key,JSON.stringify({...original,topics:{[readyModule.topics[0].id]:true}}));
windowEvents.get('pageshow')({persisted:true});
assert(uiElement('#main').innerHTML.includes(`id="topic-label-${readyModule.topics[0].id}"`));
assert(uiElement('#main').innerHTML.includes('1 / '+readyModule.topics.length+' understood'),'Returning to a cached course page reflects article progress');
uiStorage.set(key,JSON.stringify({...original,topics:{'01-01':true,'13-01':true},papers:{attention:true,moviechat:true},weeks:{1:true,21:true},notes:{'04':'Retained note','13':'Archived personal note'}}));
windowEvents.get('pageshow')({persisted:true});
uiEvents.get('input')({target:{dataset:{notes:'01'},value:'A new learning note'}});
const preserved=JSON.parse(uiStorage.get(key));
assert.equal(preserved.topics['13-01'],true);assert.equal(preserved.notes['13'],'Archived personal note');assert.equal(preserved.weeks['21'],true);assert.equal(preserved.papers.moviechat,true);
assert(uiElement('#side-count').textContent.startsWith('1 / 174'),'Dormant progress is preserved without contributing to course totals');
location.hash='#fieldnotes';app.route();
assert.equal((uiElement('#guide-results').innerHTML.match(/class="guide-card"/g)||[]).length,Math.min(24,course.lessons.length),'Guide collection is paginated');
uiEvents.get('input')({target:{id:'guide-search',value:'zzzz-unmatched-lesson-query',dataset:{}}});
assert(uiElement('#guide-results').innerHTML.includes('No matching guides'),'Guide search has a usable empty state');
uiEvents.get('input')({target:{id:'guide-search',value:'',dataset:{}}});
await uiEvents.get('change')({target:{id:'guide-module',value:readyModule.id,dataset:{}}});
assert.equal((uiElement('#guide-results').innerHTML.match(/class="guide-card"/g)||[]).length,readyModule.topics.length,'Module filtering selects the expected articles');
console.log('PASS · curriculum source links, standalone article links, search, pagination and module filtering render correctly');

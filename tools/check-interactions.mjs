import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {loadLessons,makeTopicIndex,lessonDocument,escapeHTML} from './lessons.mjs';

// Exercise the real handlers with a small DOM adapter; this is not browser layout QA.
const course=await loadLessons();
const topicIndex=makeTopicIndex(course);
const fixtures={curriculum:course.modules,'topic-index':topicIndex,papers:JSON.parse(await readFile('data/papers.json','utf8')),'subject-map':JSON.parse(await readFile('data/subject-map.json','utf8'))};
const subjectMap=fixtures['subject-map'];
const [appSource,lessonSource,libraryHTML,legacyHTML]=await Promise.all(['app.js','lesson.js','library.html','course.html'].map(file=>readFile(file,'utf8')));
function storageGuard(context){
  const accesses=[];
  // Throw on property access, including a read caught by application error handling.
  // Existing valid, corrupt, or unrelated records cannot be touched without this access.
  for(const target of [context,context.window])for(const name of ['localStorage','sessionStorage','indexedDB'])Object.defineProperty(target,name,{get(){accesses.push(name);throw new Error('Reference pages must not access browser storage');}});
  return ()=>assert.deepEqual(accesses,[],'Browsing never accesses browser storage, even for reads');
}
function element(){
  const attributes=new Map(),classes=new Set(),listeners=new Map();
  return {innerHTML:'',textContent:'',style:{},dataset:{},value:'',disabled:false,
    classList:{add:(...items)=>items.forEach(item=>classes.add(item)),remove:(...items)=>items.forEach(item=>classes.delete(item)),contains:item=>classes.has(item),toggle(item,force){const add=force??!classes.has(item);add?classes.add(item):classes.delete(item);return add;}},
    setAttribute:(name,value)=>attributes.set(name,String(value)),getAttribute:name=>attributes.get(name)??null,removeAttribute:name=>attributes.delete(name),
    addEventListener(type,fn){listeners.set(type,fn);},listeners,focusCount:0,focus(options){this.focusCount++;this.focusOptions=options?{...options}:undefined;},scrollIntoView(){},matches(){return false;}
  };
}
const personalUI=/type=["']checkbox["']|id=["'](?:backup-dialog|import-progress|export-progress|start-date|module-notes|topic-understood|completion-status|side-progress|side-count)["']|data-(?:topic|paper|week|notes)=|My research notes|Mark as read|Save progress/i;
function assertReferenceUI(markup){assert(!personalUI.test(markup),'Reference views have no progress, checklist, notes, backup, or reading-status controls');assert(!/href=["'][^"']*#schedule/.test(markup),'No schedule navigation is rendered');}

async function libraryHarness({data=fixtures,fail=false}={}){
  const elements=new Map(),events=new Map(),windowEvents=new Map(),requests=[],errors=[],scrollCalls=[];
  const get=selector=>{if(!elements.has(selector))elements.set(selector,element());return elements.get(selector);};
  const navigation=[...libraryHTML.matchAll(/data-library-nav="([^"]+)"/g)].map(match=>{const link=element();link.dataset.libraryNav=match[1];return link;});
  const location={hash:'',href:'https://enmingzz.github.io/vlm-project/library.html',search:'',reload(){}};
  const context={
    document:{querySelector:get,querySelectorAll:selector=>selector==='[data-library-nav]'?navigation:[],getElementById:id=>get('#'+id),addEventListener:(type,fn)=>events.set(type,fn),title:''},
    window:{addEventListener:(type,fn)=>windowEvents.set(type,fn),scrollTo:options=>scrollCalls.push({...options})},location,URL,AbortController,
    fetch:async(url,options)=>{
      requests.push(url);assert(url.endsWith('?v=development'),'Library requests carry the build version');assert.equal(options.cache,'no-cache','Library data is revalidated');
      const name=url.split('?')[0].replace('./data/','').replace('.json','');
      assert(Object.hasOwn(data,name),`Only reference data is fetched, got ${name}`);
      if(fail)throw new Error('Temporary connection failure');
      return {ok:true,json:async()=>structuredClone(data[name])};
    },console:{error:(...args)=>errors.push(args),warn:(...args)=>errors.push(args),log(){}},
    requestAnimationFrame:fn=>fn(),setTimeout:()=>1,clearTimeout(){}
  };
  const assertStorageUntouched=storageGuard(context);
  const api=await vm.runInNewContext(`(async()=>{${appSource}\nawait ready; return {route};})()`,context,{filename:'app.js'});
  const go=hash=>{location.hash=hash;api.route();assertReferenceUI(get('#main').innerHTML);};
  const dispatch=async(type,target,eventFields={})=>{assert(events.has(type),`${type} handler exists`);await events.get(type)({...eventFields,target:{dataset:{},...target},preventDefault(){}});assertReferenceUI([...elements.values()].map(el=>el.innerHTML).join(''));};
  const click=async dataset=>dispatch('click',{dataset,closest(selector){const key=selector.match(/^\[data-([\w-]+)\]$/)?.[1]?.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());return key&&Object.hasOwn(dataset,key)?this:null;}});
  return {get,go,dispatch,click,requests,errors,scrollCalls,windowEvents,location,navigation,assertStorageUntouched};
}
const library=await libraryHarness();
const markup=selector=>library.get(selector).innerHTML;
const ids=(selector,attribute)=>[...markup(selector).matchAll(new RegExp(`data-${attribute}="([^"]+)"`,'g'))].map(match=>match[1]);
const attribute=(tag,name)=>tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1]??null;
const tagsWith=(content,tagName,name)=>[...content.matchAll(new RegExp(`<${tagName}\\b[^>]*>`,'g'))].map(match=>match[0]).filter(tag=>attribute(tag,name)!==null);
const sameIds=(actual,expected,message)=>assert.deepEqual([...actual].sort(),[...expected].sort(),message);
assert.equal(library.errors.length,0,'Library loads without runtime errors');
assert.deepEqual(library.requests.map(url=>url.split('?')[0]).sort(),['./data/curriculum.json','./data/papers.json','./data/subject-map.json','./data/topic-index.json'],'Only reference data and the subject map are fetched');
assertReferenceUI(libraryHTML+markup('#main'));
assert.equal(library.get('#main').focusCount,0,'Initial loading does not steal keyboard focus');
assert.deepEqual(library.navigation.map(link=>link.dataset.libraryNav),['subjects','articles','papers'],'The library has one Subjects entry, with no duplicate Library navigation');
const defaultLanding=markup('#main');
assert(defaultLanding.includes('id="subject-map"'),'The default library landing contains the subject map');
for(const count of [12,174,29])assert(defaultLanding.includes(`<strong>${count}</strong>`),`Subjects landing shows ${count} reference resources`);
assert(defaultLanding.includes('href="#subject-index"'),'The graph offers a conventional full subject index');
assert(/<form\b[^>]*id="library-search-form"/.test(defaultLanding),'The Subjects landing retains the article search form');
for(const hash of ['#subjects','#overview','#curriculum','#schedule','#schedule/week-5']){
  library.go(hash);assert.equal(markup('#main'),defaultLanding,`${hash}: opens the same Subjects landing`);
  assert.equal(library.navigation.find(link=>link.dataset.libraryNav==='subjects')?.getAttribute('aria-current'),'page',`${hash}: Subjects is the active navigation entry`);
}
function assertMap(pathId='all'){
  const page=markup('#main'),nodes=tagsWith(page,'a','data-map-subject'),directions=tagsWith(page,'a','data-map-path');
  sameIds(nodes.map(node=>attribute(node,'data-map-subject')),course.modules.map(subject=>subject.id),'All 12 subjects remain in the map for every direction');
  for(const node of nodes){
    const id=attribute(node,'data-map-subject');
    assert.equal(attribute(node,'href'),`#subject/${id}`,`${id}: map node links directly to its subject`);
    assert(!/\s(?:hidden|inert)(?:\s|=|>)/.test(node)&&attribute(node,'aria-hidden')!=='true',`${id}: direction selection does not hide a subject`);
    assert(!/(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(attribute(node,'style')||''),`${id}: node has no inline hiding style`);
    assert(!(attribute(node,'class')||'').split(/\s+/).includes('hidden'),`${id}: node has no hidden class`);
  }
  sameIds(directions.map(link=>attribute(link,'data-map-path')),['all',...subjectMap.paths.map(path=>path.id)],'Every direction is a native link');
  for(const link of directions){
    const id=attribute(link,'data-map-path');
    assert.equal(attribute(link,'href'),id==='all'?'#subjects':`#subjects/${id}`,`${id}: direction is shareable by URL`);
    assert.equal(attribute(link,'aria-current'),id===pathId?'true':null,`${id}: only the selected direction has aria-current`);
  }
  const selected=subjectMap.paths.find(path=>path.id===pathId);
  sameIds(nodes.filter(node=>(attribute(node,'class')||'').split(/\s+/).includes('is-on-path')).map(node=>attribute(node,'data-map-subject')),selected?.stages.flat()||[],'Only main direction stages receive the path highlight');
  if(selected){
    assert(page.includes(escapeHTML(selected.description)),`${pathId}: selected direction is explained`);
    for(const id of [...selected.stages.flat(),...selected.extensions]){
      assert([...page.matchAll(new RegExp(`href="#subject/${id}"`,'g'))].length>=2,`${pathId}: direction information also links to subject ${id}`);
    }
  }
  assert(/<svg\b[^>]*\baria-hidden="true"[^>]*>/.test(page),'Decorative map connections are hidden from assistive technology');
  assert(!/\brole="tree(?:item)?"/.test(page),'The graph does not pretend to be an interactive tree widget');
}
library.go('#subjects');
assertMap();
for(const path of subjectMap.paths){library.go(`#subjects/${path.id}`);assertMap(path.id);}
library.go('#subjects');assertMap();

// Observe focus and scroll requests through the real click/hashchange handlers.
// Native anchor navigation is simulated explicitly; this adapter has no browser layout.
const focusNavigation=await libraryHarness();
async function clickPath(id,eventFields={}){
  const link=tagsWith(focusNavigation.get('#main').innerHTML,'a','data-map-path').find(tag=>attribute(tag,'data-map-path')===id);
  assert(link,`${id}: the path link is present before activation`);
  const target={dataset:{mapPath:id},getAttribute:name=>attribute(link,name),closest:selector=>selector==='[data-map-path]'?target:null};
  await focusNavigation.dispatch('click',target,{button:0,...eventFields});
  return attribute(link,'href');
}
function hashchange(hash){focusNavigation.location.hash=hash;focusNavigation.windowEvents.get('hashchange')({type:'hashchange'});}
const focusMain=focusNavigation.get('#main'),selectedPill=focusNavigation.get('[data-map-path="vlm"]');
const initialScrollCalls=focusNavigation.scrollCalls.length;
hashchange(await clickPath('vlm'));
assert.equal(focusMain.focusCount,0,'Changing a reading direction does not move focus to the main heading');
assert.equal(focusNavigation.scrollCalls.length,initialScrollCalls,'A path-link activation does not request page scrolling');
assert.equal(selectedPill.focusCount,1,'Changing a reading direction focuses the newly rendered selected path link');
assert.equal(selectedPill.focusOptions?.preventScroll,true,'Restoring path-link focus explicitly prevents scrolling');
hashchange('#subjects');
assert.equal(focusMain.focusCount,1,'Subsequent generic Subjects navigation focuses the main content');
assert.equal(focusNavigation.scrollCalls.length,initialScrollCalls+1,'Generic Subjects navigation requests normal page scrolling');
assert.deepEqual(focusNavigation.scrollCalls.at(-1),{top:0},'Generic navigation scrolls to the page start');
assert.equal(focusNavigation.get('[data-map-path="all"]').focusCount,0,'Generic navigation does not focus the Full map path selector');
assert.equal(selectedPill.focusCount,1,'A prior path-link activation does not leak focus behavior into later navigation');
await clickPath('language',{ctrlKey:true});
hashchange('#subjects/language');
assert.equal(focusMain.focusCount,2,'A modified link click does not change focus handling for later generic navigation');
assert.equal(focusNavigation.get('[data-map-path="language"]').focusCount,0,'Modified path clicks do not arm selected-pill focus');
assert.equal(focusNavigation.scrollCalls.length,initialScrollCalls+2,'Later generic path navigation still requests page scrolling');
focusNavigation.assertStorageUntouched();

library.go('#subject-index');
assert.equal(library.navigation.find(link=>link.dataset.libraryNav==='subjects')?.getAttribute('aria-current'),'page','The full index belongs to Subjects navigation');
assert.deepEqual(ids('#subject-results','subject-id'),course.modules.map(subject=>subject.id),'Every subject can be browsed');
await library.dispatch('input',{id:'subject-search',value:'TRANSFORMER'});
assert(markup('#subject-results').includes('Transformer'),'Subject search ignores case and finds subject/topic text');
await library.dispatch('input',{id:'subject-search',value:'zzzz-unmatched-subject'});
assert.deepEqual(ids('#subject-results','subject-id'),[],'Subject search can show an empty result');
await library.click({clearFilter:'subjects'});
assert.deepEqual(ids('#subject-results','subject-id'),course.modules.map(subject=>subject.id),'Clearing subject search restores all subjects');
for(const subject of course.modules){
  library.go(`#subject/${subject.id}`);
  const page=markup('#main');
  assert(page.includes(escapeHTML(subject.title)),`${subject.id}: subject heading`);
  for(const topic of subject.topics){
    assert(page.includes(`href="./learn/${topic.id}/"`),`${topic.id}: standalone article link`);
    for(const reference of topicIndex[topic.id].references)assert(page.includes(`href="${escapeHTML(reference.url)}"`),`${topic.id}: original source link`);
  }
  const before=subjectMap.edges.filter(([,to])=>to===subject.id).map(([from])=>from),next=subjectMap.edges.filter(([from])=>from===subject.id).map(([,to])=>to);
  const connections=page.match(/<nav\b[^>]*class="subject-connections"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
  if(before.length)assert(/useful background/i.test(connections),`${subject.id}: background connections are labelled`);
  if(next.length)assert(/explore next/i.test(connections),`${subject.id}: onward connections are labelled`);
  sameIds([...connections.matchAll(/href="#subject\/([^"]+)"/g)].map(match=>match[1]),[...before,...next],`${subject.id}: related subject links match the published graph`);
  assert(!/\bP[012]\b/.test(page),`${subject.id}: no course priority badges`);
}
library.go('#subject/13');assert(!markup('#main').includes('href="./learn/13-'),'Removed subjects cannot be opened');
assert(/not found|not in the library/i.test(markup('#main')),'Unknown subject has a useful missing-page message');
library.go('#articles');
const articleIds=Object.keys(topicIndex);
assert.deepEqual(ids('#article-results','topic-id'),articleIds.slice(0,24),'Articles are paginated');
await library.click({articlePage:'2'});
assert.deepEqual(ids('#article-results','topic-id'),articleIds.slice(24,48),'Next page shows distinct articles');
assert.equal(library.get('#article-results').getAttribute('tabindex'),'-1','Updated article results can receive programmatic focus');
assert.equal(library.get('#article-results').focusCount,1,'Pagination moves focus to the new article results');
await library.click({articlePage:'1'});
assert.deepEqual(ids('#article-results','topic-id'),articleIds.slice(0,24),'Previous page returns to the first articles');
await library.dispatch('input',{id:'article-search',value:'zzzz-unmatched-article'});
assert.deepEqual(ids('#article-results','topic-id'),[]);
assert(/no matching|no articles/i.test(markup('#article-results')),'Article search has a usable empty state');
await library.dispatch('input',{id:'article-search',value:''});
await library.dispatch('change',{id:'article-subject',value:'04'});
assert.deepEqual(ids('#article-results','topic-id'),course.modules.find(subject=>subject.id==='04').topics.map(topic=>topic.id),'Subject filtering selects the expected articles');
await library.dispatch('input',{id:'article-search',value:'zzzz-unmatched-article'});
assert.deepEqual(ids('#article-results','topic-id'),[],'Article search combines with the subject filter');
await library.click({clearFilter:'articles'});
assert.deepEqual(ids('#article-results','topic-id'),articleIds.slice(0,24),'Clearing article filters restores the complete collection');
await library.dispatch('input',{id:'article-search',value:'ATTENTION'});
assert(ids('#article-results','topic-id').some(id=>id.startsWith('04-')),'Article search ignores case');
await library.dispatch('input',{id:'article-search',value:''});
library.go('#overview');library.get('#library-search').value='ATTENTION';
await library.dispatch('submit',{id:'library-search-form'});
assert.equal(library.location.hash,'#articles','Subjects landing search opens the article collection');
library.windowEvents.get('hashchange')({type:'hashchange'});
assert(ids('#article-results','topic-id').some(id=>id.startsWith('04-')),'Subjects landing search query is applied');
assert.equal(library.get('#main').focusCount,1,'Reference navigation moves keyboard focus to the new page');
await library.click({clearFilter:'articles'});
library.go('#papers');
assert.deepEqual(ids('#paper-results','paper-id'),fixtures.papers.map(paper=>paper.id),'All curated readings remain browseable');
for(const paper of fixtures.papers)assert(markup('#paper-results').includes(`href="${escapeHTML(paper.url)}"`),`${paper.id}: paper source link`);
await library.dispatch('input',{id:'paper-search',value:'ATTENTION IS ALL YOU NEED'});
assert.deepEqual(ids('#paper-results','paper-id'),['attention'],'Paper search ignores case');
await library.dispatch('change',{id:'paper-subject',value:'01'});
assert.deepEqual(ids('#paper-results','paper-id'),[],'Paper search combines with the subject filter');
await library.dispatch('input',{id:'paper-search',value:''});
assert.deepEqual(ids('#paper-results','paper-id'),fixtures.papers.filter(paper=>paper.moduleIds.includes('01')).map(paper=>paper.id),'Paper subject filter selects relevant readings');
await library.click({clearFilter:'papers'});
assert.deepEqual(ids('#paper-results','paper-id'),fixtures.papers.map(paper=>paper.id),'Clearing paper filters restores the collection');
for(const [legacy,canonical] of [['#overview','#subjects'],['#curriculum','#subjects'],['#fieldnotes','#articles'],['#module/04','#subject/04'],['#schedule','#subjects'],['#schedule/week-5','#subjects']]){
  library.go(canonical);const expected=markup('#main');library.go(legacy);assert.equal(markup('#main'),expected,`${legacy}: old bookmark opens the canonical library view`);
}
const unsafe='<img src=x onerror="window.injected=true"> & "quoted"';
library.go('#articles');await library.dispatch('input',{id:'article-search',value:unsafe});
assert(!markup('#article-results').includes(unsafe),'Search text is not interpreted as HTML');
const escapedData=structuredClone(fixtures);escapedData.curriculum[0].title=unsafe;escapedData['topic-index']['01-01'].title=unsafe;escapedData.papers[0].title=unsafe;escapedData['subject-map'].nodes[0].label=unsafe;escapedData['subject-map'].nodes[0].caption=unsafe;escapedData['subject-map'].paths[0].description=unsafe;
const escaped=await libraryHarness({data:escapedData});
for(const [hash,selector] of [['#subjects','#main'],['#subjects/vlm','#main'],['#subject-index','#subject-results'],['#articles','#article-results'],['#papers','#paper-results']]){
  escaped.go(hash);const content=escaped.get(selector).innerHTML;assert(content.includes(escapeHTML(unsafe))&&!content.includes(unsafe),'Reference metadata is escaped before HTML insertion');
}
escaped.assertStorageUntouched();
const failed=await libraryHarness({fail:true});assert(/could not|unable|failed/i.test(failed.get('#main').innerHTML),'Unavailable reference data has a meaningful error state');failed.assertStorageUntouched();
for(const type of ['pageshow','storage'])library.windowEvents.get(type)?.({persisted:true,key:'research-fieldnotes-v1',newValue:'{broken'});
library.assertStorageUntouched();

// Copy-link and section indicators remain useful without a personal state store.
async function articleHarness({clipboardFails=false,resizeObserver=true}={}){
  const controls=new Map(),events=new Map(),documentEvents=new Map(),fontEvents=new Map(),copied=[],observed=[],observedMath=[];let observeEntries,resizeEntries,resolveFonts;
  const get=selector=>{if(!controls.has(selector))controls.set(selector,element());return controls.get(selector);};
  const toc=[element(),element(),element(),element()];toc.forEach((link,i)=>link.setAttribute('href',i%2?'#references':'#section-intuition'));
  const sections=[{id:'section-intuition'},{id:'references'}];
  // Dimensions are supplied by the adapter: these assertions test state changes, not browser layout.
  const math=[element(),element(),element()];
  Object.assign(math[0],{clientWidth:240,scrollWidth:240});
  Object.assign(math[1],{clientWidth:240,scrollWidth:480});
  Object.assign(math[2],{clientWidth:0,scrollWidth:0});
  math[2].setAttribute('tabindex','0');math[2].setAttribute('role','region');math[2].setAttribute('aria-label','Mathematical formula');
  const fontsReady=new Promise(resolve=>{resolveFonts=resolve;});
  class IntersectionObserver{constructor(callback){observeEntries=callback;}observe(section){observed.push(section.id);}}
  class ResizeObserver{constructor(callback){resizeEntries=callback;}observe(container){observedMath.push(container);}}
  const context={document:{querySelector:get,querySelectorAll:selector=>selector==='.article-section'?sections:selector==='.article-toc a, .mobile-toc nav a'?toc:selector==='.math-inline, .math-in-prose-display, .article-formula'?math:[],addEventListener:(type,fn,capture)=>{if(type==='toggle')assert.equal(capture,true,'Non-bubbling details toggle events are captured');documentEvents.set(type,fn);},fonts:{ready:fontsReady,addEventListener:(type,fn)=>fontEvents.set(type,fn)}},window:{IntersectionObserver,...(resizeObserver?{ResizeObserver}:{}),addEventListener:(type,fn)=>events.set(type,fn)},IntersectionObserver,
    navigator:{clipboard:{async writeText(value){if(clipboardFails)throw new Error('Unavailable');copied.push(value);}}},location:{href:'https://enmingzz.github.io/vlm-project/learn/04-03/#references'},setTimeout:()=>1,clearTimeout(){}};
  const assertStorageUntouched=storageGuard(context);
  vm.runInNewContext(lessonSource,context,{filename:'lesson.js'});
  await get('#copy-article').listeners.get('click')();
  if(clipboardFails)assert(/copy.*address|browser/i.test(get('#toast').textContent),'Unavailable clipboard has a useful fallback');
  else assert.deepEqual(copied,[context.location.href],'Copy link preserves the exact article section URL');
  assert.deepEqual(observed,sections.map(section=>section.id),'All article sections are observed');
  observeEntries([{isIntersecting:true,target:sections[1]}]);
  toc.forEach((link,i)=>assert.equal(link.getAttribute('aria-current'),i%2?'location':null,'Desktop and mobile section navigation indicate the current location'));
  const assertScrollable=(container,expected,message)=>{
    assert.equal(container.getAttribute('tabindex'),expected?'0':null,message);
    assert.equal(container.getAttribute('role'),expected?'region':null,'Only a clipped formula creates a named scroll region');
    assert.equal(container.getAttribute('aria-label'),expected?'Scrollable mathematical expression':null,'Keyboard scroll targets have an accessible name');
  };
  assertScrollable(math[0],false,'Fitting inline math adds no tab stop');
  assertScrollable(math[1],true,'Overflowing inline math is keyboard-focusable');
  assertScrollable(math[2],false,'Hidden math loses a stale static tab stop');
  if(resizeObserver)assert.deepEqual(observedMath,math,'Every math container is observed for layout changes');
  else assert(events.has('resize'),'Window resize provides the no-ResizeObserver fallback');
  const resized=()=>resizeObserver?resizeEntries([]):events.get('resize')();
  math[0].scrollWidth=400;math[1].scrollWidth=240;resized();
  assertScrollable(math[0],true,'A fitting expression becomes focusable when it overflows');
  assertScrollable(math[1],false,'An expression that stops overflowing loses its tab stop and region name');
  math[2].clientWidth=200;math[2].scrollWidth=350;resolveFonts();await fontsReady;
  assertScrollable(math[2],true,'Font readiness refreshes overflow state');
  math[0].scrollWidth=240;fontEvents.get('loadingdone')();
  assertScrollable(math[0],false,'Later font loading also refreshes overflow state');
  math[1].clientWidth=200;math[1].scrollWidth=350;documentEvents.get('toggle')();
  assertScrollable(math[1],true,'Opening details refreshes math scroll targets');
  math[1].clientWidth=0;math[1].scrollWidth=0;documentEvents.get('toggle')();
  assertScrollable(math[1],false,'Closing details removes hidden math tab stops');
  assert(math.every(container=>container.focusCount===0),'Overflow updates never move keyboard focus');
  for(const type of ['pageshow','storage'])events.get(type)?.({persisted:true,key:'research-fieldnotes-v1'});
  assertStorageUntouched();
}
assert(lessonDocument(course.lessons[0],course).includes('id="copy-article"'),'The tested copy-link button is rendered');
await articleHarness();await articleHarness({clipboardFails:true,resizeObserver:false});

const inlineScripts=[...legacyHTML.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]).filter(script=>script.trim());
assert(inlineScripts.length,'Old course bookmarks have a redirect script');
for(const hash of ['','#overview','#curriculum','#module/04','#schedule/week-5','#papers','#fieldnotes']){
  const redirects=[],fallback={href:''};
  for(const source of inlineScripts)vm.runInNewContext(source,{location:{hash,search:'?from=saved',replace:url=>redirects.push(url)},document:{getElementById:id=>{assert.equal(id,'library-redirect-link');return fallback;}}});
  assert.deepEqual(redirects,['./library.html?from=saved'+hash],'The course compatibility page preserves search and hash');
  assert.equal(fallback.href,'./library.html?from=saved'+hash,'The visible fallback preserves the old bookmark destination');
}
console.log('PASS · Subjects map and direction routes, full index, legacy links, browse/search/combined filters, pagination, source links, safe text, article controls, math overflow state transitions (DOM adapter, not layout QA), and zero browser-storage access');

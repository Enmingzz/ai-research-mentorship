import { readFile } from 'node:fs/promises';

export const SITE_URL = 'https://enmingzz.github.io/vlm-project';
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const e = escapeHTML;
export function wordCount(lesson) {
  return [lesson.summary, ...lesson.sections.flatMap(s=>[...(s.paragraphs||[]), ...(s.bullets||[])]), lesson.exercise.prompt, lesson.exercise.answer, ...lesson.takeaways].join(' ').split(/\s+/).filter(Boolean).length;
}
export function readingMinutes(lesson) { return Math.max(2, Math.ceil(wordCount(lesson)/190)); }
export async function loadLessons({partial=false}={}) {
  const modules=JSON.parse(await readFile('data/curriculum.json','utf8'));
  const lessons=[];
  for(const module of modules) {
    try { lessons.push(...JSON.parse(await readFile(`data/lessons/${module.id}.json`,'utf8'))); }
    catch(error) { if(partial && error.code==='ENOENT')continue; throw error; }
  }
  return {modules,lessons};
}
export function makeTopicIndex({modules,lessons}) {
  const byId=new Map(lessons.map(l=>[l.topicId,l]));
  return Object.fromEntries(modules.flatMap(m=>m.topics.flatMap(t=>{
    const lesson=byId.get(t.id);if(!lesson)return [];
    return [[t.id,{topicId:t.id,moduleId:m.id,title:lesson.title,topic:t.text,summary:lesson.summary,minutes:readingMinutes(lesson),references:lesson.references}]];
  })));
}
const external = r => `<a href="${e(r.url)}" target="_blank" rel="noopener noreferrer">${e(r.title)} <span aria-hidden="true">↗</span></a>`;

export function lessonDocument(lesson,library) {
  const {modules,lessons}=library;
  const subject=modules.find(m=>m.topics.some(t=>t.id===lesson.topicId));
  if(!subject)throw new Error(`Unknown topic ${lesson.topicId}`);
  const index=makeTopicIndex(library),allIds=Object.keys(index),position=allIds.indexOf(lesson.topicId);
  const previous=index[allIds[position-1]],next=index[allIds[position+1]];
  const url=`${SITE_URL}/learn/${lesson.topicId}/`;
  const primaryPapers=lesson.references.filter(reference=>reference.kind==='paper');
  const leadSources=primaryPapers.length?primaryPapers:lesson.references;
  const sectionLinks=[{id:'original-sources',title:primaryPapers.length?'Original papers':'Original sources'},...lesson.sections.map(s=>({id:`section-${s.id}`,title:s.title})),{id:'worked-example',title:'Worked example'},{id:'takeaways',title:'Key points'},{id:'references',title:'References & further reading'}];
  const toc=sectionLinks.map(s=>`<a href="#${e(s.id)}">${e(s.title)}</a>`).join('');
  const linkedTopic=(id)=>`<a href="../${e(id)}/">${e(index[id]?.title || id)} <span aria-hidden="true">↗</span></a>`;
  const adjacent=(entry,label)=>entry?`<a class="article-adjacent" href="../${e(entry.topicId)}/"><span class="eyebrow">${label}</span><strong>${e(entry.title)}</strong><span class="small">Subject ${e(entry.moduleId)} · ${entry.minutes} min read</span></a>`:'';
  return `<!doctype html>
<html lang="en" translate="no">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#f6f5f0"><title>${e(lesson.title)} · enming group</title>
<meta name="description" content="${e(lesson.summary)}"><link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:title" content="${e(lesson.title)}"><meta property="og:description" content="${e(lesson.summary)}"><meta property="og:url" content="${url}">
<link rel="stylesheet" href="../../style.css"><link rel="stylesheet" href="../../lesson.css"><script type="module" src="../../lesson.js"></script>
<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'TechArticle',headline:lesson.title,description:lesson.summary,inLanguage:'en',url,isPartOf:{'@type':'CollectionPage',name:'enming group · AI reference library',url:SITE_URL+'/library.html'}}).replace(/</g,'\\u003c')}</script>
</head>
<body class="lesson-page" data-topic-id="${e(lesson.topicId)}">
<a class="skip-link" href="#article-content">Skip to the article</a>
<aside class="sidebar" aria-label="Library navigation">
<a class="brand" href="../../"><span class="brand-mark">e<span>g</span></span><span>enming<br><b>group</b></span></a>
<div class="space-label">ENMING GROUP / REFERENCE LIBRARY</div>
<nav><a href="../../"><span aria-hidden="true">◈</span>Research projects</a><a href="../../library.html#overview"><span aria-hidden="true">◈</span>Library overview</a><a href="../../library.html#subjects"><span aria-hidden="true">▤</span>Subjects</a><a class="active" href="../../library.html#articles"><span aria-hidden="true">▦</span>Articles</a><a href="../../library.html#papers"><span aria-hidden="true">↗</span>Papers & resources</a></nav>
<div class="side-path"><div class="eyebrow">BROWSE THE LIBRARY</div><a href="../../library.html#articles">All ${lessons.length} articles <span>↗</span></a><a href="../../library.html#subject/${subject.id}">Subject ${subject.id} <span>↗</span></a></div>
<div class="sidebar-bottom"><div class="eyebrow">IDEAS, METHODS & SOURCES</div><p>Technical explanations and original references.</p></div>
</aside>
<div class="workspace">
<header class="topbar"><div class="breadcrumb"><a href="../../library.html#subjects">Subjects</a><span>/</span><a href="../../library.html#subject/${subject.id}">Subject ${subject.id}</a><span>/</span><b>Article ${lesson.topicId}</b></div><div class="top-actions"><button class="button secondary" id="copy-article">Copy link ↗</button></div></header>
<main id="article-content" tabindex="-1">
<div class="article-topline"><a class="back-link" href="../../library.html#subject/${subject.id}">← ${e(subject.shortTitle)}</a><span class="outline-tag">REFERENCE ARTICLE</span></div>
<header class="article-header"><div class="eyebrow">ARTICLE ${lesson.topicId.replace('-','.')} / ${e(subject.shortTitle.toUpperCase())}</div><h1>${e(lesson.title)}</h1><p class="article-dek">${e(lesson.summary)}</p><div class="article-meta"><span>enming group</span><span>${readingMinutes(lesson)} min read</span><span>${lesson.references.length} ${lesson.references.length===1?'source':'sources'}</span></div></header>
<section class="article-primary-sources" id="original-sources" aria-labelledby="original-sources-title"><div class="eyebrow">${primaryPapers.length?'READ THE RESEARCH':'GO TO THE SOURCE'}</div><h2 id="original-sources-title">${primaryPapers.length?'Papers behind this idea':'Original sources for this topic'}</h2><p>${primaryPapers.length?'Read the original work alongside the explanation. The source-reading section below connects its ideas, assumptions, and examples.':'The authoritative text or documentation provides the definitions and details used in this explanation.'}</p><ol>${leadSources.map(reference=>`<li><span class="reference-kind">${e(reference.kind.toUpperCase())}</span><h3>${external(reference)}</h3><p>${e(reference.note)}</p></li>`).join('')}</ol></section>
<div class="article-layout"><article class="article-body">
${lesson.prerequisites.length?`<aside class="related-concepts"><span class="eyebrow">RELATED CONCEPTS</span><p>Background on the ideas used in this article.</p><div>${lesson.prerequisites.map(linkedTopic).join('')}</div></aside>`:''}
<details class="mobile-toc"><summary>On this page</summary><nav aria-label="Article sections on mobile">${toc}</nav></details>
${lesson.sections.map((section,i)=>`<section class="article-section" id="section-${e(section.id)}"><div class="section-kicker">${String(i+1).padStart(2,'0')} / EXPLANATION</div><h2>${e(section.title)}</h2>${(section.paragraphs||[]).map(p=>`<p>${e(p)}</p>`).join('')}${section.formula?`<pre class="article-formula" aria-label="Formula">${e(section.formula)}</pre>`:''}${section.code?`<div class="article-code"><div>${e(section.language||'Example')}</div><pre><code>${e(section.code)}</code></pre></div>`:''}${section.bullets?.length?`<ul>${section.bullets.map(b=>`<li>${e(b)}</li>`).join('')}</ul>`:''}</section>`).join('')}
<section class="article-section article-example" id="worked-example"><div class="eyebrow">EXAMPLE</div><h2>Worked example</h2><p>${e(lesson.exercise.prompt)}</p><details class="worked-answer" open><summary>Explanation <span aria-hidden="true">+</span></summary><div>${e(lesson.exercise.answer)}</div></details></section>
<section class="article-section" id="takeaways"><div class="section-kicker">AT A GLANCE</div><h2>Key points</h2><ul class="takeaway-list">${lesson.takeaways.map(t=>`<li>${e(t)}</li>`).join('')}</ul></section>
<section class="article-section article-references" id="references"><div class="section-kicker">ORIGINAL SOURCES</div><h2>References & further reading</h2><p class="reference-intro">Original papers, books, and official documentation, with a suggested focus for each.</p><ol>${lesson.references.map(r=>`<li><span class="reference-kind">${e(r.kind.toUpperCase())}</span><h3>${external(r)}</h3><p>${e(r.note)}</p></li>`).join('')}</ol></section>
<nav class="article-pagination" aria-label="Previous and next articles">${adjacent(previous,'← PREVIOUS ARTICLE')}${adjacent(next,'NEXT ARTICLE →')}</nav>
</article><aside class="article-rail"><div class="article-rail-sticky"><div class="eyebrow">ON THIS PAGE</div><nav class="article-toc" aria-label="Article sections">${toc}</nav><div class="article-related-nav"><span class="eyebrow">REFERENCE NAVIGATION</span><a href="../../library.html#subject/${subject.id}">Browse ${e(subject.shortTitle)} ↗</a><a href="#references">Original sources ↓</a><a href="../../library.html#articles">All ${lessons.length} articles ↗</a></div></div></aside></div>
</main>
<footer><span>ENMING GROUP · Ideas, methods & original sources.</span><span><a href="../../library.html#articles">All articles ↗</a></span></footer>
</div><div id="toast" role="status" aria-live="polite"></div><noscript>The full article and source links are available without JavaScript.</noscript>
</body></html>`;
}

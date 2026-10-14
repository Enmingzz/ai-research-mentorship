import { readFile } from 'node:fs/promises';

export const SITE_URL = 'https://enmingzz.github.io/ai-research-mentorship';
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

export function lessonDocument(lesson,course) {
  const {modules,lessons}=course;
  const module=modules.find(m=>m.topics.some(t=>t.id===lesson.topicId));
  if(!module)throw new Error(`Unknown topic ${lesson.topicId}`);
  const index=makeTopicIndex(course),allIds=Object.keys(index),position=allIds.indexOf(lesson.topicId);
  const previous=index[allIds[position-1]],next=index[allIds[position+1]];
  const url=`${SITE_URL}/learn/${lesson.topicId}/`;
  const sectionLinks=[...lesson.sections.map(s=>({id:`section-${s.id}`,title:s.title})),{id:'practice',title:'Check your understanding'},{id:'takeaways',title:'Key takeaways'},{id:'references',title:'Papers & further reading'}];
  const toc=sectionLinks.map(s=>`<a href="#${e(s.id)}">${e(s.title)}</a>`).join('');
  const linkedTopic=(id)=>`<a href="../${e(id)}/">${e(index[id]?.title || id)} <span aria-hidden="true">↗</span></a>`;
  const adjacent=(entry,label)=>entry?`<a class="article-adjacent" href="../${e(entry.topicId)}/"><span class="eyebrow">${label}</span><strong>${e(entry.title)}</strong><span class="small">Module ${e(entry.moduleId)} · ${entry.minutes} min read</span></a>`:'';
  return `<!doctype html>
<html lang="en" translate="no">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#f6f5f0"><title>${e(lesson.title)} · Research Fieldnotes</title>
<meta name="description" content="${e(lesson.summary)}"><link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:title" content="${e(lesson.title)}"><meta property="og:description" content="${e(lesson.summary)}"><meta property="og:url" content="${url}">
<link rel="stylesheet" href="../../style.css"><link rel="stylesheet" href="../../lesson.css"><script type="module" src="../../lesson.js"></script>
<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'LearningResource',name:lesson.title,description:lesson.summary,inLanguage:'en',learningResourceType:'Concept explanation',url,isPartOf:{'@type':'Course',name:'AI Research Mentorship',url:SITE_URL+'/'}}).replace(/</g,'\\u003c')}</script>
</head>
<body class="lesson-page" data-topic-id="${e(lesson.topicId)}">
<a class="skip-link" href="#article-content">Skip to the article</a>
<aside class="sidebar" aria-label="Course navigation">
<a class="brand" href="../../#overview"><span class="brand-mark">r<span>f</span></span><span>RESEARCH<br><b>FIELDNOTES</b></span></a>
<div class="space-label">ENMINGZZ / MENTORSHIP</div>
<nav><a href="../../#overview"><span aria-hidden="true">◈</span>Overview</a><a class="active" href="../../#curriculum"><span aria-hidden="true">▤</span>Curriculum</a><a href="../../#schedule"><span aria-hidden="true">▦</span>Schedule</a><a href="../../#papers"><span aria-hidden="true">↗</span>Reading room</a></nav>
<div class="side-path"><div class="eyebrow">EXPLORE THE FIELDNOTES</div><a href="../../#fieldnotes">All ${lessons.length} topic guides <span>↗</span></a><a href="../../#module/${module.id}">Back to module ${module.id} <span>↗</span></a></div>
<div class="sidebar-bottom"><div class="eyebrow">A LITTLE PROGRESS, EVERY DAY.</div><p>Read with a question.<br>Test with an experiment.</p><a class="github-link" href="https://github.com/Enmingzz/ai-research-mentorship" target="_blank" rel="noopener noreferrer">Course on GitHub <span>↗</span></a></div>
</aside>
<div class="workspace">
<header class="topbar"><div class="breadcrumb"><a href="../../#curriculum">Curriculum</a><span>/</span><a href="../../#module/${module.id}">Module ${module.id}</a><span>/</span><b>Fieldnote ${lesson.topicId}</b></div><div class="top-actions"><button class="button secondary" id="copy-article">Copy link ↗</button></div></header>
<main id="article-content" tabindex="-1">
<div class="article-topline"><a class="back-link" href="../../#module/${module.id}">← ${e(module.shortTitle)}</a><span class="outline-tag">CONCEPT GUIDE</span></div>
<header class="article-header"><div class="eyebrow">FIELDNOTE ${lesson.topicId.replace('-','.')} / ${e(module.group.toUpperCase())}</div><h1>${e(lesson.title)}</h1><p class="article-dek">${e(lesson.summary)}</p><div class="article-meta"><span>Research Fieldnotes</span><span>${readingMinutes(lesson)} min read</span><span>${lesson.references.length} primary ${lesson.references.length===1?'source':'sources'}</span><span>${module.priorities.join(' / ')}</span></div></header>
<div class="article-layout"><article class="article-body">
${lesson.prerequisites.length?`<aside class="prerequisite-box"><span class="eyebrow">BEFORE YOU BEGIN</span><p>It helps to be comfortable with:</p><div>${lesson.prerequisites.map(linkedTopic).join('')}</div></aside>`:''}
<details class="mobile-toc"><summary>On this page</summary><nav aria-label="Article sections on mobile">${toc}</nav></details>
${lesson.sections.map((section,i)=>`<section class="article-section" id="section-${e(section.id)}"><div class="section-kicker">${String(i+1).padStart(2,'0')} / UNDERSTAND</div><h2>${e(section.title)}</h2>${(section.paragraphs||[]).map(p=>`<p>${e(p)}</p>`).join('')}${section.formula?`<pre class="article-formula" aria-label="Formula">${e(section.formula)}</pre>`:''}${section.code?`<div class="article-code"><div>${e(section.language||'Example')}</div><pre><code>${e(section.code)}</code></pre></div>`:''}${section.bullets?.length?`<ul>${section.bullets.map(b=>`<li>${e(b)}</li>`).join('')}</ul>`:''}</section>`).join('')}
<section class="article-section article-practice" id="practice"><div class="eyebrow">PAUSE & TRY IT</div><h2>Check your understanding.</h2><p>${e(lesson.exercise.prompt)}</p><details class="worked-answer"><summary>Show a worked answer <span aria-hidden="true">+</span></summary><div>${e(lesson.exercise.answer)}</div></details></section>
<section class="article-section" id="takeaways"><div class="section-kicker">KEEP THESE IN MIND</div><h2>Key takeaways</h2><ul class="takeaway-list">${lesson.takeaways.map(t=>`<li>${e(t)}</li>`).join('')}</ul></section>
<section class="article-section article-references" id="references"><div class="section-kicker">GO TO THE SOURCE</div><h2>Papers & further reading</h2><p class="reference-intro">Read the original source with the focus below. Books and official guides are labeled separately from research papers.</p><ol>${lesson.references.map(r=>`<li><span class="priority">${e(r.kind.toUpperCase())}</span><h3>${external(r)}</h3><p>${e(r.note)}</p></li>`).join('')}</ol></section>
<div class="article-completion"><div><strong>Ready to move on?</strong><p>Mark this topic when you can explain it in your own words.</p></div><label><input type="checkbox" id="topic-understood"> I understand this topic</label><span class="completion-status" role="status" id="completion-status">Saved in this browser, alongside your course progress.</span></div>
<nav class="article-pagination" aria-label="Previous and next topics">${adjacent(previous,'← PREVIOUS FIELDNOTE')}${adjacent(next,'NEXT FIELDNOTE →')}</nav>
</article><aside class="article-rail"><div class="article-rail-sticky"><div class="eyebrow">ON THIS PAGE</div><nav class="article-toc" aria-label="Article sections">${toc}</nav><div class="article-rail-note"><span class="eyebrow">LEARN WITH INTENT</span><p>A useful question to take to your mentor: which assumption in this explanation would you test first?</p><a href="../../#module/${module.id}">Open module notes ↗</a></div></div></aside></div>
</main>
<footer><span>RESEARCH FIELDNOTES · Understand. Implement. Question.</span><span><a href="../../#fieldnotes">All topic guides ↗</a></span></footer>
</div><div id="toast" role="status" aria-live="polite"></div><noscript>The full article and source links work without JavaScript. Enable JavaScript to save your progress.</noscript>
</body></html>`;
}

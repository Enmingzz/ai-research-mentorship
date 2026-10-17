const BUILD_VERSION = 'development';
const PAGE_SIZE = 24;
const main = document.querySelector('#main');
let subjects = [], papers = [], articles = [], topicIndex = {}, subjectMap = {nodes:[],edges:[],paths:[]};
let loaded = false, loading = false;
let currentView = '', pathNavigationHash = '', mapObserver;
const filters = { subjects: '', articles: '', articleSubject: 'all', articlePage: 1, papers: '', paperSubject: 'all' };
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const plural = (count, singular, multiple = singular + 's') => `${count} ${count === 1 ? singular : multiple}`;
const subjectPapers = id => papers.filter(paper => paper.moduleIds.includes(id));
const subjectName = id => subjects.find(subject => subject.id === id)?.shortTitle || '';
const articleURL = id => `./learn/${encodeURIComponent(id)}/`;
const matches = (values, query) => {
  const text = values.join(' ').toLocaleLowerCase('en');
  return query.trim().toLocaleLowerCase('en').split(/\s+/).filter(Boolean).every(term => text.includes(term));
};

function external(url, label, className = '') {
  if (!/^https?:\/\//i.test(url)) return `<span>${escape(label)}</span>`;
  return `<a class="${escape(className)}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)} <span aria-hidden="true">↗</span></a>`;
}

function subjectOptions(selected) {
  return `<option value="all">All subjects</option>${subjects.map(subject => `<option value="${escape(subject.id)}" ${selected === subject.id ? 'selected' : ''}>${escape(subject.shortTitle)}</option>`).join('')}`;
}

function subjectCard(subject) {
  return `<a class="library-subject-card" data-subject-id="${escape(subject.id)}" href="#subject/${encodeURIComponent(subject.id)}"><span class="library-subject-number" aria-hidden="true">${escape(subject.id)}</span><h3>${escape(subject.title)}</h3><p>${escape(subject.summary)}</p><span class="library-card-meta">${plural(subject.topics.length, 'article')} <span aria-hidden="true">·</span> ${plural(subjectPapers(subject.id).length, 'reading')}<span class="library-arrow" aria-hidden="true">↗</span></span></a>`;
}

function emptyResults(kind) {
  return `<div class="library-empty"><h2>No matching ${kind}.</h2><p>Try another keyword or clear the filters.</p><button type="button" class="library-button" data-clear-filter="${kind}">Clear search and filters</button></div>`;
}

function featuredPaper(paper) {
  return `<article class="library-featured-paper"><p class="library-paper-meta">${escape(paper.year)} <span aria-hidden="true">/</span> PAPER</p><h3>${external(paper.url,paper.title)}</h3><p class="library-paper-authors">${escape(paper.authors)}</p><p>${escape(paper.note)}</p><div class="library-paper-subjects">${paper.moduleIds.map(id=>`<a href="#subject/${encodeURIComponent(id)}">Explore ${escape(subjectName(id))} <span aria-hidden="true">→</span></a>`).join('')}</div></article>`;
}

function articleSource(article) {
  const source=article.references.find(reference=>reference.kind==='paper')||article.references[0];
  return source?`<div class="library-card-source"><span class="library-kind">${source.kind==='paper'?'PAPER':source.kind==='book'?'BOOK':'DOCUMENTATION'}</span>${external(source.url,source.title)}</div>`:'';
}

const mapLayout = [
  ['01',1,2,1],['02',1,3,1],['03',2,2,2],['04',3,2,2],['09',3,4,1],
  ['05',4,1,1],['08',4,2,1],['07',4,3,1],['11',4,4,1],
  ['06',5,1,1],['12',5,2,1],['10',5,3,2]
];
const branchLabels = {foundations:'Foundations',language:'Language',vision:'Vision & language',generative:'Generation',efficiency:'Efficiency'};
const mapSubjectLink = id => `<a href="#subject/${encodeURIComponent(id)}"><span>${escape(id)}</span> ${escape(subjectMap.nodes.find(node=>node.id===id)?.label||subjectName(id))}</a>`;

function mapNode([id,row,column,span],path) {
  const node=subjectMap.nodes.find(item=>item.id===id),subject=subjects.find(item=>item.id===id);
  const onPath=path?.stages.flat().includes(id),extension=path?.extensions.includes(id);
  const before=subjectMap.edges.filter(([,to])=>to===id).map(([from])=>from);
  return `<a class="map-node map-branch-${escape(node.branch)}${onPath?' is-on-path':''}${extension?' is-extension':''}" data-map-subject="${id}" href="#subject/${id}" style="--map-row:${row};--map-column:${column};--map-span:${span}"><div class="map-node-top"><span class="map-number">${id}</span><span class="map-branch-label">${escape(branchLabels[node.branch])}</span><span class="map-node-arrow" aria-hidden="true">↗</span></div><h3>${escape(node.label)}</h3><p>${escape(node.caption)}</p><div class="map-node-bottom"><span>${plural(subject.topics.length,'article')}</span><span>${before.length?`Builds on ${before.join(' + ')}`:'A place to begin'}</span></div>${onPath?'<span class="map-path-label">On this route</span>':extension?'<span class="map-path-label">Optional connection</span>':''}</a>`;
}

function readingPath(path) {
  if(!path)return `<p class="map-start-note">Begin with <a href="#subject/01">01 · Mathematics</a> and <a href="#subject/02">02 · Engineering</a> in parallel, then follow the connections. Each subject opens its articles and original papers.</p>`;
  return `<div class="map-route-intro"><div><p class="library-eyebrow">SUGGESTED READING ROUTE</p><h2>${escape(path.label)}</h2><p>${escape(path.description)}</p></div><div class="map-route-aside"><span class="map-route-aside-label">Related directions</span>${path.extensions.map(mapSubjectLink).join('')}</div></div><ol class="map-route-stages" style="--route-stages:${path.stages.length}" aria-label="Suggested reading order">${path.stages.map(stage=>`<li>${stage.map(mapSubjectLink).join('<span class="map-parallel" aria-label="in parallel">+</span>')}${stage.length>1?'<small>Read in parallel</small>':''}</li>`).join('')}</ol>`;
}

function subjectsHome(pathId) {
  const path=subjectMap.paths.find(item=>item.id===pathId);
  main.innerHTML=`<header class="map-intro"><div><p class="library-eyebrow">THE LIBRARY / SUBJECTS 01—12</p><h1>Find your path <br><em>through AI.</em></h1></div><div class="map-intro-copy"><p>A connected library of ideas, from the mathematics underneath a model to the papers that move it forward.</p><p>Start with the foundations, follow a research direction, or open the subject you need.</p><div class="library-totals" aria-label="Library contents"><a href="#subjects"><strong>${subjects.length}</strong> subjects</a><a href="#articles"><strong>${articles.length}</strong> articles</a><a href="#papers"><strong>${papers.length}</strong> readings</a></div></div></header><section class="map-section" aria-labelledby="map-title"><div class="map-section-heading"><div><p class="library-eyebrow">THE SUBJECT MAP</p><h2 id="map-title">One foundation. Many directions.</h2></div><a class="library-text-link" href="#subject-index">Browse as a list <span aria-hidden="true">↗</span></a></div><nav class="map-paths" aria-label="Suggested reading routes"><a href="#subjects" data-map-path="all" ${!path?'aria-current="true"':''}>Full map</a>${subjectMap.paths.map(item=>`<a href="#subjects/${escape(item.id)}" data-map-path="${escape(item.id)}" ${path?.id===item.id?'aria-current="true"':''}>${escape(item.label)}</a>`).join('')}</nav>${readingPath(path)}<div class="map-canvas" id="subject-map" aria-label="Connected subjects"><svg class="map-connections" aria-hidden="true" role="presentation" focusable="false"></svg>${mapLayout.map(position=>mapNode(position,path)).join('')}</div><p class="map-caption"><span aria-hidden="true">↳</span> ${escape(subjectMap.note)}</p></section><section class="map-lookup" aria-labelledby="lookup-title"><div><p class="library-eyebrow">LOOKING FOR SOMETHING SPECIFIC?</p><h2 id="lookup-title">An idea, a method, a paper.</h2></div><form class="library-search-form" id="library-search-form" role="search"><label for="library-search" class="library-visually-hidden">Search library articles</label><input id="library-search" type="search" placeholder="Search a concept or method…"><button type="submit" class="library-button library-button-dark">Search articles <span aria-hidden="true">→</span></button></form></section><section class="library-section library-featured" aria-labelledby="featured-papers-title"><div class="library-section-heading"><div><p class="library-eyebrow">KEEP THE PAPERS CLOSE</p><h2 id="featured-papers-title">Vision-language research, at the source.</h2></div><a class="library-text-link" href="#papers">All papers &amp; guides <span aria-hidden="true">→</span></a></div><div class="library-featured-grid">${['clip','blip2','llava','qwen25vl'].map(id=>papers.find(paper=>paper.id===id)).filter(Boolean).map(featuredPaper).join('')}</div></section>`;
  mountSubjectMap(path);
}

function mountSubjectMap(path) {
  const canvas=document.querySelector('#subject-map');
  // The DOM adapter has no layout; real element geometry is required for decorative curves.
  if(!canvas?.getBoundingClientRect)return;
  const svg=canvas.querySelector('.map-connections');
  const active=new Set(path?.stages.flat()||[]);
  const draw=()=>{
    if(!canvas.isConnected)return;
    const bounds=canvas.getBoundingClientRect();
    if(!bounds.width||getComputedStyle(svg).display==='none'){svg.innerHTML='';return;}
    svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);
    svg.innerHTML=`<defs><marker id="map-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M1 1L7 4L1 7" fill="none" stroke="#819474" stroke-width="1.2"/></marker></defs>`+subjectMap.edges.map(([from,to])=>{
      const a=canvas.querySelector(`[data-map-subject="${from}"]`).getBoundingClientRect();
      const b=canvas.querySelector(`[data-map-subject="${to}"]`).getBoundingClientRect();
      const x1=a.left+a.width/2-bounds.left,y1=a.bottom-bounds.top+2,x2=b.left+b.width/2-bounds.left,y2=b.top-bounds.top-8;
      const middle=(y1+y2)/2;
      return `<path class="map-edge${active.has(from)&&active.has(to)?' is-on-path':''}" data-map-edge="${from}-${to}" d="M${x1},${y1} C${x1},${middle} ${x2},${middle} ${x2},${y2}" marker-end="url(#map-arrow)"/>`;
    }).join('');
  };
  draw();
  if('ResizeObserver' in window){mapObserver=new window.ResizeObserver(draw);mapObserver.observe(canvas);}
  document.fonts?.ready.then(draw);
  canvas.redrawConnections=draw;
}

window.addEventListener('resize',()=>document.querySelector('#subject-map')?.redrawConnections?.());

function subjectList() {
  main.innerHTML = `<header class="library-page-heading"><a class="library-back-link" href="#subjects">← Subject map</a><p class="library-eyebrow">SUBJECT INDEX</p><h1>Explore a subject.</h1><p>Browse ${subjects.length} areas of AI, from mathematical foundations to vision-language models. Each subject gathers its articles and relevant reading in one place.</p></header><div class="library-toolbar"><label class="library-search-control" for="subject-search"><span class="library-visually-hidden">Search subjects or topics</span><input id="subject-search" type="search" placeholder="Search subjects or topics…" value="${escape(filters.subjects)}"></label></div><div id="subject-results"></div>`;
  subjectResults();
}

function subjectResults() {
  const results = subjects.filter(subject => matches([subject.title, subject.shortTitle, subject.summary, ...subject.topics.map(topic => topic.text)], filters.subjects));
  document.querySelector('#subject-results').innerHTML = `<p class="library-results-label" role="status" aria-live="polite">${plural(results.length, 'subject')}</p><div class="library-subject-grid">${results.map(subjectCard).join('') || emptyResults('subjects')}</div>`;
}

function topicReferences(references) {
  return `<ul class="library-source-list">${references.map(reference => `<li><span class="library-kind">${escape(reference.kind === 'book' ? 'Book' : reference.kind === 'guide' ? 'Guide' : 'Paper')}</span>${external(reference.url, reference.title)}${reference.note ? `<p>${escape(reference.note)}</p>` : ''}</li>`).join('')}</ul>`;
}

function subjectConnections(id) {
  const before=subjectMap.edges.filter(([,to])=>to===id).map(([from])=>from);
  const after=subjectMap.edges.filter(([from])=>from===id).map(([,to])=>to);
  return `<nav class="subject-connections" aria-label="Suggested subject connections"><div><p class="library-eyebrow">USEFUL BACKGROUND</p>${before.length?before.map(mapSubjectLink).join(''):'<p>This is a starting point. Pair Mathematics with Engineering as you explore.</p>'}</div><div><p class="library-eyebrow">EXPLORE NEXT</p>${after.length?after.map(mapSubjectLink).join(''):'<a href="#subjects">Return to the map and choose another direction <span aria-hidden="true">↗</span></a>'}</div></nav>`;
}

function subjectDetail(id) {
  const subject = subjects.find(item => item.id === id);
  if (!subject) return notFound();
  let currentSection = '';
  const topics = subject.topics.map(topic => {
    const article = topicIndex[topic.id];
    let heading = '';
    if (topic.section && topic.section !== currentSection) {
      currentSection = topic.section;
      heading = `<h2 class="library-topic-section">${escape(currentSection)}</h2>`;
    }
    return `${heading}<article class="library-topic" data-topic-id="${escape(topic.id)}"><div class="library-topic-heading"><h3><a href="${articleURL(topic.id)}">${escape(topic.text)}</a></h3><a class="library-text-link" href="${articleURL(topic.id)}" aria-label="Read article: ${escape(topic.text)}">Read article <span aria-hidden="true">→</span></a></div>${article?.summary ? `<p class="library-topic-summary">${escape(article.summary)}</p>` : ''}${topicReferences(article?.references || [])}</article>`;
  }).join('');
  const related = subjectPapers(id);
  main.innerHTML = `<header class="library-page-heading library-subject-heading"><a class="library-back-link" href="#subjects">← Subject map</a><p class="library-eyebrow">SUBJECT ${escape(subject.id)}</p><h1>${escape(subject.title)}</h1><p>${escape(subject.summary)}</p><p class="library-subject-count">${plural(subject.topics.length, 'article')} <span aria-hidden="true">·</span> ${plural(related.length, 'reading')}</p></header>${subjectConnections(id)}<div class="library-subject-layout"><section class="library-topic-list" aria-label="Articles and topic sources">${topics}</section><aside class="library-related" aria-labelledby="related-reading-title"><h2 id="related-reading-title">Related reading</h2>${related.map(paper => `<article class="library-related-paper"><p class="library-paper-meta">${escape(paper.year)} <span aria-hidden="true">·</span> ${escape(paper.kind)}</p><h3>${external(paper.url, paper.title)}</h3><p>${escape(paper.note)}</p></article>`).join('')}<a class="library-text-link" href="#papers">All papers &amp; guides <span aria-hidden="true">→</span></a></aside></div>`;
}

function articleList() {
  main.innerHTML = `<header class="library-page-heading"><p class="library-eyebrow">ARTICLE INDEX</p><h1>Look up an idea.</h1><p>${articles.length} articles with clear explanations, worked examples, and links to original sources.</p></header><div class="library-toolbar"><label class="library-search-control" for="article-search"><span class="library-visually-hidden">Search articles</span><input type="search" id="article-search" placeholder="Search concepts, methods, or sources…" value="${escape(filters.articles)}"></label><label class="library-select-control" for="article-subject"><span class="library-visually-hidden">Filter articles by subject</span><select id="article-subject">${subjectOptions(filters.articleSubject)}</select></label></div><div id="article-results"></div>`;
  articleResults();
}

function articleResults() {
  const results = articles.filter(article => (filters.articleSubject === 'all' || article.moduleId === filters.articleSubject) && matches([article.title, article.topic, article.summary, subjectName(article.moduleId), ...article.references.map(reference => reference.title)], filters.articles));
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  filters.articlePage = Math.max(1, Math.min(filters.articlePage, pages));
  const visible = results.slice((filters.articlePage - 1) * PAGE_SIZE, filters.articlePage * PAGE_SIZE);
  document.querySelector('#article-results').innerHTML = `<p class="library-results-label" role="status" aria-live="polite">${plural(results.length, 'article')}${results.length > PAGE_SIZE ? ` <span aria-hidden="true">·</span> Page ${filters.articlePage} of ${pages}` : ''}</p><div class="library-article-grid">${visible.map(article => `<article class="library-article-card" data-topic-id="${escape(article.topicId)}"><a class="library-article-subject" href="#subject/${encodeURIComponent(article.moduleId)}">${escape(subjectName(article.moduleId))}</a><h2><a href="${articleURL(article.topicId)}">${escape(article.title)}</a></h2><p>${escape(article.summary)}</p>${articleSource(article)}<div class="library-article-meta"><span>${escape(article.minutes)} min read <span aria-hidden="true">·</span> ${plural(article.references.length, 'source')}</span><a href="${articleURL(article.topicId)}" aria-label="Read article: ${escape(article.title)}">Read article <span aria-hidden="true">↗</span></a></div></article>`).join('') || emptyResults('articles')}</div>${results.length > PAGE_SIZE ? `<nav class="library-pagination" aria-label="Article pages"><button type="button" class="library-button" data-article-page="${filters.articlePage - 1}" ${filters.articlePage === 1 ? 'disabled' : ''}>← Previous</button><span>Page ${filters.articlePage} of ${pages}</span><button type="button" class="library-button" data-article-page="${filters.articlePage + 1}" ${filters.articlePage === pages ? 'disabled' : ''}>Next →</button></nav>` : ''}`;
}

function paperList() {
  main.innerHTML = `<header class="library-page-heading"><p class="library-eyebrow">READING COLLECTION</p><h1>Go to the source.</h1><p>${papers.length} papers, books, and guides connected to the subjects in this library.</p></header><div class="library-toolbar"><label class="library-search-control" for="paper-search"><span class="library-visually-hidden">Search papers and guides</span><input type="search" id="paper-search" placeholder="Search titles, authors, or ideas…" value="${escape(filters.papers)}"></label><label class="library-select-control" for="paper-subject"><span class="library-visually-hidden">Filter papers by subject</span><select id="paper-subject">${subjectOptions(filters.paperSubject)}</select></label></div><div id="paper-results"></div>`;
  paperResults();
}

function paperResults() {
  const results = papers.filter(paper => (filters.paperSubject === 'all' || paper.moduleIds.includes(filters.paperSubject)) && matches([paper.title, paper.authors, paper.note, paper.year, ...paper.moduleIds.map(subjectName)], filters.papers));
  document.querySelector('#paper-results').innerHTML = `<p class="library-results-label" role="status" aria-live="polite">${plural(results.length, 'reading')}</p><div class="library-paper-grid">${results.map(paper => `<article class="library-paper-card" data-paper-id="${escape(paper.id)}"><p class="library-paper-meta">${escape(paper.year)} <span aria-hidden="true">·</span> ${escape(paper.kind === 'book' ? 'Book' : paper.kind === 'guide' ? 'Guide' : 'Paper')}</p><h2>${external(paper.url, paper.title)}</h2><p class="library-paper-authors">${escape(paper.authors)}</p><p>${escape(paper.note)}</p><div class="library-paper-subjects">${paper.moduleIds.map(id => `<a href="#subject/${encodeURIComponent(id)}">${escape(subjectName(id))}</a>`).join('')}</div></article>`).join('') || emptyResults('papers')}</div>`;
}

function notFound() {
  main.innerHTML = '<section class="library-empty"><h1>This page is not in the library.</h1><p>Browse the subject map or search the article collection.</p><a class="library-button" href="#subjects">Back to the subject map</a></section>';
}

function route(event) {
  if (!loaded) return;
  const [rawView, id] = location.hash.slice(1).split('/');
  const aliases = { overview: 'subjects', curriculum: 'subjects', fieldnotes: 'articles', module: 'subject', schedule: 'subjects' };
  const view = aliases[rawView] || rawView || 'subjects';
  const stayOnMap=currentView==='subjects'&&view==='subjects'&&event?.type==='hashchange'&&location.hash===pathNavigationHash;
  pathNavigationHash='';
  mapObserver?.disconnect();
  const activeNav = ['subject','subject-index'].includes(view) ? 'subjects' : view;
  document.querySelectorAll('[data-library-nav]').forEach(link => {
    const active = link.dataset.libraryNav === activeNav;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const titles = { subjects: 'Subjects', 'subject-index': 'Subject index', articles: 'Articles', papers: 'Papers' };
  const title = view === 'subject' ? subjects.find(subject => subject.id === id)?.shortTitle || 'Subject' : titles[view] || 'Library';
  document.title = `${title} · enming group`;
  document.querySelector('#library-page-label').textContent = title;
  if (view === 'subjects') subjectsHome(rawView==='subjects'?id:undefined);
  else if (view === 'subject-index') subjectList();
  else if (view === 'subject') subjectDetail(id);
  else if (view === 'articles') articleList();
  else if (view === 'papers') paperList();
  else notFound();
  if(stayOnMap)document.querySelector(`[data-map-path="${subjectMap.paths.some(path=>path.id===id)?id:'all'}"]`)?.focus({preventScroll:true});
  else{
    if (event?.type === 'hashchange') main.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }
  currentView=view;
}

function clearFilter(kind) {
  if (kind === 'subjects') { filters.subjects = ''; subjectList(); document.querySelector('#subject-search').focus(); }
  if (kind === 'articles') { filters.articles = ''; filters.articleSubject = 'all'; filters.articlePage = 1; articleList(); document.querySelector('#article-search').focus(); }
  if (kind === 'papers') { filters.papers = ''; filters.paperSubject = 'all'; paperList(); document.querySelector('#paper-search').focus(); }
}

document.addEventListener('submit', event => {
  if (event.target.id !== 'library-search-form') return;
  event.preventDefault();
  filters.articles = document.querySelector('#library-search').value;
  filters.articleSubject = 'all';
  filters.articlePage = 1;
  location.hash = '#articles';
});

document.addEventListener('input', event => {
  if (event.target.id === 'subject-search') { filters.subjects = event.target.value; subjectResults(); }
  if (event.target.id === 'article-search') { filters.articles = event.target.value; filters.articlePage = 1; articleResults(); }
  if (event.target.id === 'paper-search') { filters.papers = event.target.value; paperResults(); }
});

document.addEventListener('change', event => {
  if (event.target.id === 'article-subject') { filters.articleSubject = event.target.value; filters.articlePage = 1; articleResults(); }
  if (event.target.id === 'paper-subject') { filters.paperSubject = event.target.value; paperResults(); }
});

document.addEventListener('click', event => {
  const pathLink=event.target.closest('[data-map-path]');
  if(pathLink&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey&&(!event.button||event.button===0))pathNavigationHash=pathLink.getAttribute('href')===location.hash?'':pathLink.getAttribute('href');
  if (event.target.closest('.skip-link')) { event.preventDefault(); main.focus(); main.scrollIntoView({ block: 'start' }); return; }
  const clear = event.target.closest('[data-clear-filter]');
  if (clear) clearFilter(clear.dataset.clearFilter);
  const page = event.target.closest('[data-article-page]');
  if (page && !page.disabled) {
    const requested = Number(page.dataset.articlePage);
    if (Number.isInteger(requested)) {
      filters.articlePage = requested;
      articleResults();
      const results = document.querySelector('#article-results');
      results.setAttribute('tabindex', '-1');
      results.focus({ preventScroll: true });
      results.scrollIntoView({ block: 'start' });
    }
  }
  if (event.target.closest('[data-library-retry]')) loadLibrary();
});

window.addEventListener('hashchange', route);

async function loadLibrary() {
  if (loading) return;
  loading = true;
  main.setAttribute('aria-busy', 'true');
  main.innerHTML = '<p class="library-loading" role="status">Opening the library…</p>';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const data = await Promise.all(['curriculum', 'papers', 'topic-index', 'subject-map'].map(async name => {
      const response = await fetch(`./data/${name}.json?v=${BUILD_VERSION}`, { cache: 'no-cache', signal: controller.signal });
      if (!response.ok) throw new Error(`${name}: ${response.status}`);
      return response.json();
    }));
    if (!Array.isArray(data[0]) || !Array.isArray(data[1]) || !data[2] || typeof data[2] !== 'object' || !Array.isArray(data[3]?.nodes) || !Array.isArray(data[3]?.edges) || !Array.isArray(data[3]?.paths)) throw new Error('Invalid library data.');
    [subjects, papers, topicIndex, subjectMap] = data;
    articles = subjects.flatMap(subject => subject.topics.map(topic => topicIndex[topic.id]).filter(Boolean));
    if (articles.length !== subjects.reduce((total, subject) => total + subject.topics.length, 0)) throw new Error('The article index is incomplete.');
    loaded = true;
    route();
  } catch (error) {
    loaded = false;
    console.error('Library loading failed:', error);
    main.innerHTML = '<section class="library-empty" role="alert"><h1>The library could not be opened.</h1><p>Check your connection and try again.</p><button type="button" class="library-button" data-library-retry>Try again</button></section>';
  } finally {
    clearTimeout(timeout);
    loading = false;
    main.setAttribute('aria-busy', 'false');
  }
}

const ready = loadLibrary();

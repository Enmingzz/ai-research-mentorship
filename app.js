const BUILD_VERSION = 'development';
const PAGE_SIZE = 24;
const main = document.querySelector('#main');
let subjects = [], papers = [], articles = [], topicIndex = {};
let loaded = false, loading = false;
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

function overview() {
  main.innerHTML = `<header class="library-intro"><p class="library-eyebrow">THE REFERENCE LIBRARY</p><h1>A place to understand<br>the ideas behind AI.</h1><p>Explanations, worked examples, and original sources, organized by subject. Find a concept, follow a question, or return to a useful paper.</p><form class="library-search-form" id="library-search-form" role="search"><label for="library-search" class="library-visually-hidden">Search library articles</label><input id="library-search" type="search" placeholder="Search a concept or method…"><button type="submit" class="library-button library-button-dark">Search articles <span aria-hidden="true">→</span></button></form><div class="library-totals" aria-label="Library contents"><a href="#subjects"><strong>${subjects.length}</strong> subjects</a><a href="#articles"><strong>${articles.length}</strong> articles</a><a href="#papers"><strong>${papers.length}</strong> papers &amp; guides</a></div></header><section class="library-section" aria-labelledby="overview-subjects-title"><div class="library-section-heading"><div><p class="library-eyebrow">BROWSE BY SUBJECT</p><h2 id="overview-subjects-title">From foundations to multimodal models.</h2></div><a class="library-text-link" href="#subjects">Explore subjects <span aria-hidden="true">→</span></a></div><div class="library-subject-grid">${subjects.map(subjectCard).join('')}</div></section><section class="library-reading-note"><div><p class="library-eyebrow">ORIGINAL SOURCES</p><h2>Keep the papers close.</h2><p>The reading collection brings together foundational papers, books, and practical guides. Each article also links to sources for its particular topic.</p></div><a class="library-button" href="#papers">Browse papers <span aria-hidden="true">↗</span></a></section>`;
}

function subjectList() {
  main.innerHTML = `<header class="library-page-heading"><p class="library-eyebrow">SUBJECT INDEX</p><h1>Explore a subject.</h1><p>Browse ${subjects.length} areas of AI, from mathematical foundations to vision-language models. Each subject gathers its articles and relevant reading in one place.</p></header><div class="library-toolbar"><label class="library-search-control" for="subject-search"><span class="library-visually-hidden">Search subjects or topics</span><input id="subject-search" type="search" placeholder="Search subjects or topics…" value="${escape(filters.subjects)}"></label></div><div id="subject-results"></div>`;
  subjectResults();
}

function subjectResults() {
  const results = subjects.filter(subject => matches([subject.title, subject.shortTitle, subject.summary, ...subject.topics.map(topic => topic.text)], filters.subjects));
  document.querySelector('#subject-results').innerHTML = `<p class="library-results-label" role="status" aria-live="polite">${plural(results.length, 'subject')}</p><div class="library-subject-grid">${results.map(subjectCard).join('') || emptyResults('subjects')}</div>`;
}

function topicReferences(references) {
  return `<ul class="library-source-list">${references.map(reference => `<li><span class="library-kind">${escape(reference.kind === 'book' ? 'Book' : reference.kind === 'guide' ? 'Guide' : 'Paper')}</span>${external(reference.url, reference.title)}${reference.note ? `<p>${escape(reference.note)}</p>` : ''}</li>`).join('')}</ul>`;
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
  main.innerHTML = `<header class="library-page-heading library-subject-heading"><a class="library-back-link" href="#subjects">← All subjects</a><p class="library-eyebrow">SUBJECT ${escape(subject.id)}</p><h1>${escape(subject.title)}</h1><p>${escape(subject.summary)}</p><p class="library-subject-count">${plural(subject.topics.length, 'article')} <span aria-hidden="true">·</span> ${plural(related.length, 'reading')}</p></header><div class="library-subject-layout"><section class="library-topic-list" aria-label="Articles and topic sources">${topics}</section><aside class="library-related" aria-labelledby="related-reading-title"><h2 id="related-reading-title">Related reading</h2>${related.map(paper => `<article class="library-related-paper"><p class="library-paper-meta">${escape(paper.year)} <span aria-hidden="true">·</span> ${escape(paper.kind)}</p><h3>${external(paper.url, paper.title)}</h3><p>${escape(paper.note)}</p></article>`).join('')}<a class="library-text-link" href="#papers">All papers &amp; guides <span aria-hidden="true">→</span></a></aside></div>`;
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
  document.querySelector('#article-results').innerHTML = `<p class="library-results-label" role="status" aria-live="polite">${plural(results.length, 'article')}${results.length > PAGE_SIZE ? ` <span aria-hidden="true">·</span> Page ${filters.articlePage} of ${pages}` : ''}</p><div class="library-article-grid">${visible.map(article => `<article class="library-article-card" data-topic-id="${escape(article.topicId)}"><a class="library-article-subject" href="#subject/${encodeURIComponent(article.moduleId)}">${escape(subjectName(article.moduleId))}</a><h2><a href="${articleURL(article.topicId)}">${escape(article.title)}</a></h2><p>${escape(article.summary)}</p><div class="library-article-meta"><span>${escape(article.minutes)} min read <span aria-hidden="true">·</span> ${plural(article.references.length, 'source')}</span><a href="${articleURL(article.topicId)}" aria-label="Read article: ${escape(article.title)}">Read article <span aria-hidden="true">↗</span></a></div></article>`).join('') || emptyResults('articles')}</div>${results.length > PAGE_SIZE ? `<nav class="library-pagination" aria-label="Article pages"><button type="button" class="library-button" data-article-page="${filters.articlePage - 1}" ${filters.articlePage === 1 ? 'disabled' : ''}>← Previous</button><span>Page ${filters.articlePage} of ${pages}</span><button type="button" class="library-button" data-article-page="${filters.articlePage + 1}" ${filters.articlePage === pages ? 'disabled' : ''}>Next →</button></nav>` : ''}`;
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
  main.innerHTML = '<section class="library-empty"><h1>This page is not in the library.</h1><p>Browse the subject index or search the article collection.</p><a class="library-button" href="#overview">Back to the library</a></section>';
}

function route(event) {
  if (!loaded) return;
  const [rawView, id] = location.hash.slice(1).split('/');
  const aliases = { curriculum: 'subjects', fieldnotes: 'articles', module: 'subject', schedule: 'overview' };
  const view = aliases[rawView] || rawView || 'overview';
  const activeNav = view === 'subject' ? 'subjects' : view;
  document.querySelectorAll('[data-library-nav]').forEach(link => {
    const active = link.dataset.libraryNav === activeNav;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const titles = { overview: 'Library', subjects: 'Subjects', articles: 'Articles', papers: 'Papers' };
  const title = view === 'subject' ? subjects.find(subject => subject.id === id)?.shortTitle || 'Subject' : titles[view] || 'Library';
  document.title = `${title} · enming group`;
  document.querySelector('#library-page-label').textContent = title;
  if (view === 'overview') overview();
  else if (view === 'subjects') subjectList();
  else if (view === 'subject') subjectDetail(id);
  else if (view === 'articles') articleList();
  else if (view === 'papers') paperList();
  else notFound();
  if (event?.type === 'hashchange') main.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
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
    const data = await Promise.all(['curriculum', 'papers', 'topic-index'].map(async name => {
      const response = await fetch(`./data/${name}.json?v=${BUILD_VERSION}`, { cache: 'no-cache', signal: controller.signal });
      if (!response.ok) throw new Error(`${name}: ${response.status}`);
      return response.json();
    }));
    if (!Array.isArray(data[0]) || !Array.isArray(data[1]) || !data[2] || typeof data[2] !== 'object') throw new Error('Invalid library data.');
    [subjects, papers, topicIndex] = data;
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

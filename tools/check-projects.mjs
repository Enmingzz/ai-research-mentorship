import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const [source, html, production, example] = await Promise.all([
  readFile('projects.js', 'utf8'),
  readFile('index.html', 'utf8'),
  readFile('data/projects.json', 'utf8').then(JSON.parse),
  readFile('examples/projects.example.json', 'utf8').then(JSON.parse)
]);

// A small DOM tree exercises the real event handlers and rendered records.
// It deliberately does not implement the application's filtering or data rules.
function createDocument() {
  const markupWrites = [];
  const dataKey = name => name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  class Element {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.children = [];
      this.parentNode = null;
      this.dataset = {};
      this.style = {};
      this.attributes = new Map();
      this.listeners = new Map();
      this.className = '';
      this.id = '';
      this.value = '';
      this.open = false;
      this._text = '';
      this.classList = {
        contains: value => this.className.split(/\s+/).includes(value),
        add: (...values) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...values])].join(' '); },
        remove: (...values) => { this.className = this.className.split(/\s+/).filter(value => !values.includes(value)).join(' '); }
      };
    }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
    set textContent(value) { this.replaceChildren(); this._text = String(value); }
    set innerHTML(value) { this.replaceChildren(); markupWrites.push(String(value)); }
    append(...children) {
      if (this._text) {
        const text = new Element('#text');
        text._text = this._text;
        text.parentNode = this;
        this.children.push(text);
        this._text = '';
      }
      for (let child of children) {
        if (typeof child === 'string') { const text = new Element('#text'); text._text = child; child = text; }
        if (child.parentNode) child.parentNode.children = child.parentNode.children.filter(item => item !== child);
        child.parentNode = this;
        this.children.push(child);
      }
    }
    replaceChildren(...children) {
      for (const child of this.children) child.parentNode = null;
      this.children = [];
      this._text = '';
      this.append(...children);
    }
    setAttribute(name, value) {
      value = String(value);
      this.attributes.set(name, value);
      if (name.startsWith('data-')) this.dataset[dataKey(name)] = value;
      else if (['id', 'class', 'value'].includes(name)) this[name === 'class' ? 'className' : name] = value;
    }
    getAttribute(name) {
      if (name.startsWith('data-')) return this.dataset[dataKey(name)] ?? null;
      if (name === 'class') return this.className;
      return this.attributes.get(name) ?? this[name] ?? null;
    }
    removeAttribute(name) { this.attributes.delete(name); }
    addEventListener(type, listener) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(listener);
    }
    dispatch(type, extra = {}) {
      const event = { target: this, currentTarget: this, preventDefault() {}, ...extra };
      for (const listener of this.listeners.get(type) || []) listener(event);
    }
    click() { this.dispatch('click'); }
    focus() { document.activeElement = this; }
    showModal() { this.open = true; }
    close() { this.open = false; this.dispatch('close'); }
    getBoundingClientRect() { return { left: 0, top: 0, right: 500, bottom: 500 }; }
    get options() { return this.children.filter(child => child.tagName === 'OPTION'); }
    matches(selector) {
      const tag = selector.match(/^[a-z][a-z0-9-]*/i)?.[0];
      if (tag && this.tagName !== tag.toUpperCase()) return false;
      const id = selector.match(/#([\w-]+)/)?.[1];
      if (id && this.id !== id) return false;
      for (const [, name] of selector.matchAll(/\.([\w-]+)/g)) if (!this.classList.contains(name)) return false;
      for (const [, name, value] of selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)) {
        const actual = this.getAttribute(name);
        if (actual === null || (value !== undefined && actual !== value)) return false;
      }
      return true;
    }
    querySelectorAll(selector) {
      const results = [];
      const visit = parent => {
        for (const child of parent.children) {
          if (child.matches(selector)) results.push(child);
          visit(child);
        }
      };
      visit(this);
      return results;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  }
  const document = {
    body: new Element('body'),
    activeElement: null,
    createElement: tag => new Element(tag),
    createTextNode: text => { const node = new Element('#text'); node.textContent = text; return node; },
    querySelector(selector) { return this.body.querySelector(selector); },
    querySelectorAll(selector) { return this.body.querySelectorAll(selector); }
  };
  // Read controls from the real HTML so selector changes do not silently pass.
  for (const [, tag, attributes] of html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
    if (!/\bid="|\bdata-(?:project-status|task-status|section-nav)=/.test(attributes)) continue;
    const node = document.createElement(tag);
    for (const [, name, value] of attributes.matchAll(/([\w-]+)="([^"]*)"/g)) node.setAttribute(name, value);
    document.body.append(node);
  }
  const dialog = document.querySelector('#board-detail');
  for (const selector of ['#detail-kind', '#detail-close', '#detail-content']) dialog.append(document.querySelector(selector));
  return { document, markupWrites };
}

async function harness(data, { hash = '', failFirst = false } = {}) {
  const dom = createDocument();
  const requests = [];
  const redirects = [];
  const warnings = [];
  const windowEvents = new Map();
  const location = {
    href: 'https://example.test/research/?from=bookmark' + hash,
    search: '?from=bookmark', hash,
    replace: url => redirects.push(url)
  };
  vm.runInNewContext(source, {
    document: dom.document, location, URL, AbortController,
    window: { addEventListener: (name, listener) => windowEvents.set(name, listener) },
    console: { warn: (...args) => warnings.push(args), log() {} },
    setTimeout: () => 1, clearTimeout() {},
    fetch: async (url, options) => {
      requests.push({ url, options });
      assert.equal(url, './data/projects.json?v=development', 'Board data carries the build version');
      assert.equal(options.cache, 'no-cache', 'Board data is revalidated');
      if (failFirst && requests.length === 1) throw new Error('Temporary connection failure');
      return { ok: true, json: async () => structuredClone(data) };
    }
  }, { filename: 'projects.js' });
  const flush = () => new Promise(resolve => setImmediate(resolve));
  await flush();
  const get = selector => { const element = dom.document.querySelector(selector); assert(element, 'Expected control: ' + selector); return element; };
  const ids = (container, selector, key) => get(container).querySelectorAll(selector).map(node => node.dataset[key]);
  return { ...dom, get, ids, requests, redirects, warnings, location, windowEvents, flush };
}

const empty = await harness({ projects: [], tasks: [] });
assert.deepEqual(empty.ids('#project-results', '.project-card[data-project-id]', 'projectId'), []);
assert.deepEqual(empty.ids('#task-results', '.task-row[data-task-id]', 'taskId'), []);
assert(empty.get('#project-results').querySelector('[data-empty-state="projects"]'));
assert(empty.get('#task-results').querySelector('[data-empty-state="tasks"]'));
assert.equal(empty.get('#project-total').textContent, '0');
assert.equal(empty.get('#task-open-count').textContent, '0');
assert.equal(empty.get('#project-results').getAttribute('aria-busy'), 'false');
assert.equal(empty.warnings.length, 0, 'Empty data is a valid board, not a load failure');

// Production is empty initially, but adding real records must not break this check.
const live = await harness(production);
assert.equal(live.get('#project-total').textContent, String(production.projects.length));
assert.equal(live.ids('#task-results', '.task-row[data-task-id]', 'taskId').length, production.tasks.length);

const board = await harness(example);
const project = example.projects[0];
const linked = example.tasks.find(task => task.projectId === project.id);
const independent = example.tasks.find(task => task.projectId == null);
assert(project && linked && independent, 'The example demonstrates a project, a linked task, and an independent task');
const projectIds = () => board.ids('#project-results', '.project-card[data-project-id]', 'projectId');
const taskIds = () => board.ids('#task-results', '.task-row[data-task-id]', 'taskId');
const input = (selector, value, type = 'input') => { const element = board.get(selector); element.value = value; element.dispatch(type); };
assert.deepEqual(projectIds(), example.projects.map(item => item.id));
assert.deepEqual(taskIds(), example.tasks.map(item => item.id));
input('#project-search', 'VISUAL EFFICIENCY');
assert.deepEqual(projectIds(), [project.id], 'Project search combines title and tag terms, ignoring case');
board.get('[data-project-status="active"]').click();
assert.deepEqual(projectIds(), [], 'Project status combines with search');
assert.equal(board.get('[data-project-status="active"]').getAttribute('aria-pressed'), 'true');
board.get('[data-clear-board="projects"]').click();
assert.deepEqual(projectIds(), example.projects.map(item => item.id));
assert.equal(board.get('#project-search').value, '', 'Clear filters also clears the search control');
input('#project-search', 'zzzz-no-such-project');
assert.deepEqual(projectIds(), []);
board.get('[data-clear-board="projects"]').click();

input('#task-search', 'RESOLUTION');
assert.deepEqual(taskIds(), [linked.id], 'Task search includes the description');
board.get('[data-task-status="in-progress"]').click();
assert.deepEqual(taskIds(), [], 'Task status combines with search');
board.get('[data-clear-board="tasks"]').click();
board.get('[data-task-status="open"]').click();
assert.deepEqual(taskIds(), [linked.id]);
board.get('[data-task-status="all"]').click();
input('#task-project-filter', 'independent', 'change');
assert.deepEqual(taskIds(), [independent.id]);
input('#task-project-filter', 'project:' + project.id, 'change');
assert.deepEqual(taskIds(), [linked.id]);
input('#task-search', 'Example researcher');
assert.deepEqual(taskIds(), [linked.id], 'Task search includes the assignee');
input('#task-search', 'zzzz-no-such-task');
assert.deepEqual(taskIds(), []);
board.get('[data-clear-board="tasks"]').click();
assert.deepEqual(taskIds(), example.tasks.map(item => item.id));
assert.equal(board.get('#task-project-filter').value, 'all');

board.get('#project-results').querySelector('.project-title-button').click();
assert.equal(board.get('#board-detail').open, true);
assert.equal(board.get('#detail-title').textContent, project.title);
assert(board.get('#detail-content').textContent.includes(project.summary));
const resource = board.get('#detail-content').querySelector('a');
assert.equal(resource.href, project.links[0].url);
assert.equal(resource.target, '_blank');
assert(resource.rel.includes('noopener') && resource.rel.includes('noreferrer'));
board.get('[data-related-task="' + linked.id + '"]').click();
assert.equal(board.get('#detail-title').textContent, linked.title, 'Related tasks open their own details');
assert(board.get('#detail-content').textContent.includes(linked.description));
board.get('.detail-project-button').click();
assert.equal(board.get('#detail-title').textContent, project.title, 'Task details link back to their project');
board.get('#detail-close').click();
assert.equal(board.get('#board-detail').open, false);
assert.equal(board.document.body.classList.contains('group-dialog-open'), false);

const escapedData = structuredClone(example);
const unsafeText = '<img src=x onerror="window.injected=true"> & "quoted"';
escapedData.projects[0].title = unsafeText;
escapedData.projects[0].summary = unsafeText;
escapedData.projects[0].links[0] = { label: unsafeText, url: 'https://example.com/notes?tag=%3Ctest%3E&mode=read' };
const escaped = await harness(escapedData);
escaped.get('.project-title-button').click();
assert.equal(escaped.get('#detail-title').textContent, unsafeText, 'Content is displayed literally');
assert.equal(escaped.document.querySelector('img'), null, 'Text does not become an element');
assert(!escaped.markupWrites.some(markup => markup.includes(unsafeText)), 'User-provided strings are never inserted as HTML');
assert.equal(escaped.get('#detail-content').querySelector('a').href, escapedData.projects[0].links[0].url);

const recovery = await harness(example, { failFirst: true });
assert(recovery.get('#project-results').querySelector('[data-empty-state="error"]'));
recovery.get('[data-retry-board]').click();
await recovery.flush();
assert.equal(recovery.requests.length, 2);
assert.equal(recovery.get('#project-total').textContent, String(example.projects.length), 'Retry recovers without reloading the page');

for (const hash of ['#overview', '#subjects', '#articles', '#subject/04', '#papers', '#curriculum', '#module/04', '#schedule/week-5', '#fieldnotes']) {
  const legacy = await harness(example, { hash });
  assert.deepEqual(legacy.redirects, ['./library.html?from=bookmark' + hash], 'Library and legacy bookmarks preserve search and hash');
  assert.equal(legacy.requests.length, 0, 'A redirected page does not load the project board');
}
const inlineScripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]).filter(script => script.trim());
assert(inlineScripts.length, 'The early legacy redirect remains available before module loading');
for (const hash of ['#module/04', '#subject/04', '#articles', '#projects', '#tasks']) {
  const redirects = [];
  for (const script of inlineScripts) vm.runInNewContext(script, { location: { hash, search: '?from=saved', replace: url => redirects.push(url) } });
  assert.deepEqual(redirects, ['#module/04','#subject/04','#articles'].includes(hash) ? ['./library.html?from=saved'+hash] : []);
}
board.location.hash = '#tasks';
board.windowEvents.get('hashchange')();
assert.equal(board.get('[data-section-nav="tasks"]').getAttribute('aria-current'), 'location');
assert.deepEqual(board.redirects, [], 'Homepage project/task anchors remain on the board');

console.log('PASS · project/task empty and populated states, search and combined filters, details, literal content, retry, legacy links, and versioned data requests');

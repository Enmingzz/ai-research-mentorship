const BUILD_VERSION = 'development';
const MANAGE_URL = 'https://github.com/Enmingzz/ai-research-mentorship/edit/main/data/projects.json';
const PROJECT_STATUSES = { planned: 'Planned', active: 'Active', completed: 'Completed' };
const TASK_STATUSES = { open: 'Open', 'in-progress': 'In progress', done: 'Done' };
const state = { data: null, loading: false, projectQuery: '', projectStatus: 'all', taskQuery: '', taskStatus: 'all', taskProject: 'all' };
const $ = (selector) => document.querySelector(selector);

function redirectLegacyCourse() {
  if (/^#(?:overview|curriculum|module|schedule|papers|fieldnotes)(?:\/|$)/.test(location.hash)) {
    location.replace('./course.html' + location.search + location.hash);
    return true;
  }
  return false;
}

function node(tag, className = '', text = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== '') element.textContent = text;
  return element;
}

function button(text, className, action) {
  const element = node('button', className, text);
  element.type = 'button';
  element.addEventListener('click', action);
  return element;
}

function safeURL(raw) {
  if (typeof raw !== 'string' || !raw.trim()) throw new Error('A link needs a URL.');
  const url = new URL(raw, location.href);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Unsupported link protocol.');
  return url.href;
}

function externalLink(label, url, className = '') {
  const link = node('a', className);
  link.href = safeURL(url);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.append(node('span', '', label));
  const arrow = node('span', '', '↗');
  arrow.setAttribute('aria-hidden', 'true');
  link.append(arrow);
  return link;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z'));
}

function requiredText(value, field, allowEmpty = false) {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) throw new Error('Invalid ' + field + '.');
  return value.trim();
}

function optionalDate(value, field) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || !validDate(value)) throw new Error('Invalid ' + field + '.');
  return value;
}

function normalizeLinks(value) {
  if (!Array.isArray(value)) throw new Error('Links must be a list.');
  return value.map(link => ({ label: requiredText(link?.label, 'link label'), url: safeURL(link?.url) }));
}

function normalizeData(raw) {
  if (!raw || !Array.isArray(raw.projects) || !Array.isArray(raw.tasks)) throw new Error('Invalid board data.');
  const projectIds = new Set();
  const projects = raw.projects.map(item => {
    const id = requiredText(item?.id, 'project ID');
    if (projectIds.has(id)) throw new Error('Duplicate project ID.');
    projectIds.add(id);
    if (!Object.hasOwn(PROJECT_STATUSES, item.status)) throw new Error('Invalid project status.');
    if (!Array.isArray(item.tags)) throw new Error('Project tags must be a list.');
    return { id, title: requiredText(item.title, 'project title'), summary: requiredText(item.summary, 'project summary', true), status: item.status, tags: item.tags.map(tag => requiredText(tag, 'project tag')), links: normalizeLinks(item.links), updated: optionalDate(item.updated, 'updated date') };
  });
  const taskIds = new Set();
  const tasks = raw.tasks.map(item => {
    const id = requiredText(item?.id, 'task ID');
    if (taskIds.has(id)) throw new Error('Duplicate task ID.');
    taskIds.add(id);
    if (!Object.hasOwn(TASK_STATUSES, item.status)) throw new Error('Invalid task status.');
    if (!['normal', 'high'].includes(item.priority)) throw new Error('Invalid task priority.');
    const projectId = item.projectId === undefined || item.projectId === null ? null : requiredText(item.projectId, 'task project');
    if (projectId !== null && !projectIds.has(projectId)) throw new Error('Unknown task project.');
    const assignee = item.assignee === undefined || item.assignee === null ? '' : requiredText(item.assignee, 'assignee', true);
    return { id, title: requiredText(item.title, 'task title'), description: requiredText(item.description, 'task description', true), projectId, status: item.status, priority: item.priority, assignee, dueDate: optionalDate(item.dueDate, 'due date'), links: normalizeLinks(item.links) };
  });
  return { projects, tasks };
}

function badge(status, type) {
  return node('span', 'status-badge status-' + status, (type === 'project' ? PROJECT_STATUSES : TASK_STATUSES)[status]);
}

function tags(items) {
  const group = node('div', 'project-tags');
  for (const tag of items) group.append(node('span', 'project-tag', tag));
  return group;
}

function emptySymbol(kind) {
  const wrapper = node('span', 'empty-symbol');
  wrapper.setAttribute('aria-hidden', 'true');
  // Only these fixed decorative SVGs are inserted as markup. Board content uses textContent.
  wrapper.innerHTML = kind === 'tasks'
    ? '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zM9 11l1 1 2-2M14 11h2M9 16l1 1 2-2M14 16h2"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 012-2h5l2 3h7a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7Z"/><path d="M8 14h8M12 10v8"/></svg>';
  return wrapper;
}

function emptyState(kind, filtered = false) {
  const panel = node('div', 'board-empty');
  panel.dataset.emptyState = filtered ? 'filtered' : kind;
  panel.append(emptySymbol(kind));
  panel.append(node('h3', '', filtered ? 'No matches this time.' : kind === 'projects' ? 'The next question starts here.' : 'A clear board. Room for what’s next.'));
  panel.append(node('p', '', filtered ? 'Try a different search or clear the filters to see everything.' : kind === 'projects' ? 'No projects have been added yet. This space is ready for our research questions, experiments, and results.' : 'No tasks have been added yet. Project actions and independent to-dos will find a home here.'));
  if (filtered) {
    const clear = button('Clear search and filters', 'board-clear', () => resetBoard(kind));
    clear.dataset.clearBoard = kind;
    panel.append(clear);
  } else {
    panel.append(externalLink('Manage on GitHub', MANAGE_URL, 'group-text-link'));
    const corner = node('span', 'empty-corner', kind === 'projects' ? '↗' : '✳');
    corner.setAttribute('aria-hidden', 'true');
    panel.append(corner);
  }
  return panel;
}

function resetBoard(kind) {
  if (kind === 'projects') {
    state.projectQuery = '';
    state.projectStatus = 'all';
    $('#project-search').value = '';
    syncFilters('project');
    renderProjects();
    $('#project-search').focus();
  } else {
    state.taskQuery = '';
    state.taskStatus = 'all';
    state.taskProject = 'all';
    $('#task-search').value = '';
    $('#task-project-filter').value = 'all';
    syncFilters('task');
    renderTasks();
    $('#task-search').focus();
  }
}

function syncFilters(kind) {
  for (const control of document.querySelectorAll('[data-' + kind + '-status]')) {
    control.setAttribute('aria-pressed', String(control.dataset[kind + 'Status'] === state[kind + 'Status']));
  }
}

function matching(text, query) {
  const terms = query.toLocaleLowerCase('en').trim().split(/\s+/).filter(Boolean);
  const haystack = text.toLocaleLowerCase('en');
  return terms.every(term => haystack.includes(term));
}

function projectFor(task) {
  return state.data.projects.find(project => project.id === task.projectId);
}

function projectCard(project) {
  const card = node('article', 'project-card');
  card.dataset.projectId = project.id;
  const top = node('div', 'project-card-top');
  const glyph = node('span', 'project-glyph', '↗');
  glyph.setAttribute('aria-hidden', 'true');
  top.append(glyph, badge(project.status, 'project'));
  const title = node('h3');
  title.append(button(project.title, 'project-title-button', () => openProject(project.id)));
  title.style.margin = '0';
  card.append(top, title, node('p', 'project-summary', project.summary));
  if (project.tags.length) card.append(tags(project.tags));
  const bottom = node('div', 'project-card-bottom');
  const meta = node('div', 'project-card-meta');
  const relatedCount = state.data.tasks.filter(task => task.projectId === project.id).length;
  meta.append(node('span', '', relatedCount + (relatedCount === 1 ? ' linked task' : ' linked tasks')));
  if (project.updated) meta.append(node('span', '', 'Updated ' + formatDate(project.updated)));
  const open = button('View project ↗', 'project-open', () => openProject(project.id));
  open.setAttribute('aria-label', 'View project: ' + project.title);
  bottom.append(meta, open);
  card.append(bottom);
  return card;
}

function renderProjects() {
  if (!state.data) return;
  const container = $('#project-results');
  const projects = state.data.projects.filter(project => (state.projectStatus === 'all' || project.status === state.projectStatus) && matching([project.title, project.summary, ...project.tags].join(' '), state.projectQuery));
  $('#project-results-label').textContent = state.data.projects.length ? projects.length + ' of ' + state.data.projects.length + (state.data.projects.length === 1 ? ' project' : ' projects') : '';
  container.replaceChildren(...(projects.length ? projects.map(projectCard) : [emptyState('projects', state.data.projects.length > 0)]));
  container.setAttribute('aria-busy', 'false');
}

function taskRow(task) {
  const row = node('article', 'task-row');
  row.dataset.taskId = task.id;
  const icon = node('span', 'task-state-icon ' + task.status, task.status === 'done' ? '✓' : '');
  icon.setAttribute('aria-hidden', 'true');
  const info = node('div', 'task-row-info');
  const title = node('h3');
  title.style.margin = '0';
  title.append(button(task.title, 'task-title-button', () => openTask(task.id)));
  info.append(title);
  const secondary = node('div', 'task-secondary');
  const project = projectFor(task);
  secondary.append(node('span', '', project ? project.title : 'Independent task'));
  if (task.assignee) secondary.append(node('span', '', task.assignee));
  if (task.dueDate) secondary.append(node('span', '', 'Due ' + formatDate(task.dueDate)));
  info.append(secondary);
  const end = node('div', 'task-row-end');
  if (task.priority === 'high') end.append(node('span', 'task-priority', 'High priority'));
  end.append(badge(task.status, 'task'));
  const arrow = button('↗', 'project-open task-chevron', () => openTask(task.id));
  arrow.setAttribute('aria-label', 'View task: ' + task.title);
  end.append(arrow);
  row.append(icon, info, end);
  return row;
}

function renderTasks() {
  if (!state.data) return;
  const container = $('#task-results');
  const tasks = state.data.tasks.filter(task => {
    const matchesProject = state.taskProject === 'all' || (state.taskProject === 'independent' ? task.projectId === null : 'project:' + task.projectId === state.taskProject);
    return matchesProject && (state.taskStatus === 'all' || task.status === state.taskStatus) && matching([task.title, task.description, task.assignee, projectFor(task)?.title || ''].join(' '), state.taskQuery);
  });
  $('#task-results-label').textContent = state.data.tasks.length ? tasks.length + ' of ' + state.data.tasks.length + (state.data.tasks.length === 1 ? ' task' : ' tasks') : '';
  container.replaceChildren(...(tasks.length ? tasks.map(taskRow) : [emptyState('tasks', state.data.tasks.length > 0)]));
  container.setAttribute('aria-busy', 'false');
}

function addDetailLinks(content, links) {
  if (!links.length) return;
  const section = node('section', 'detail-section');
  section.append(node('h3', '', 'Links & resources'));
  const group = node('div', 'detail-links');
  for (const link of links) group.append(externalLink(link.label, link.url));
  section.append(group);
  content.append(section);
}

function detailMeta(items) {
  const meta = node('div', 'detail-meta');
  for (const [label, value] of items) {
    if (!value) continue;
    const item = node('span');
    item.append(node('strong', '', label));
    item.append(typeof value === 'string' ? document.createTextNode(value) : value);
    meta.append(item);
  }
  return meta;
}

function showDetail(kind, record, content) {
  $('#detail-kind').textContent = kind.toUpperCase();
  const heading = node('h2', '', record.title);
  heading.id = 'detail-title';
  $('#detail-content').replaceChildren(badge(record.status, kind), heading, ...content);
  const dialog = $('#board-detail');
  dialog.dataset.detailType = kind;
  dialog.dataset.detailId = record.id;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  document.body.classList.add('group-dialog-open');
  $('#detail-close').focus();
}

function openProject(id) {
  const project = state.data?.projects.find(item => item.id === id);
  if (!project) return;
  const content = node('div');
  content.append(node('p', 'detail-description', project.summary));
  if (project.tags.length) content.append(tags(project.tags));
  if (project.updated) content.append(detailMeta([['Updated', formatDate(project.updated)]]));
  addDetailLinks(content, project.links);
  const related = state.data.tasks.filter(task => task.projectId === id);
  const relatedSection = node('section', 'detail-section');
  relatedSection.append(node('h3', '', 'Related tasks · ' + related.length));
  if (related.length) {
    for (const task of related) {
      const control = button('', 'detail-task-button', () => openTask(task.id));
      control.dataset.relatedTask = task.id;
      control.append(node('span', '', task.title), badge(task.status, 'task'));
      relatedSection.append(control);
    }
  } else {
    relatedSection.append(node('p', 'detail-description', 'No tasks have been linked to this project yet.'));
  }
  content.append(relatedSection);
  showDetail('project', project, [content]);
}

function openTask(id) {
  const task = state.data?.tasks.find(item => item.id === id);
  if (!task) return;
  const content = node('div');
  content.append(node('p', 'detail-description', task.description));
  const project = projectFor(task);
  const projectLink = project ? button(project.title, 'detail-project-button', () => openProject(project.id)) : 'Independent task';
  content.append(detailMeta([['Project', projectLink], ['Priority', task.priority === 'high' ? 'High' : 'Normal'], ['Assignee', task.assignee], ['Due', task.dueDate ? formatDate(task.dueDate) : '']]));
  addDetailLinks(content, task.links);
  showDetail('task', task, [content]);
}

function populateProjectFilter() {
  const select = $('#task-project-filter');
  const all = node('option', '', 'All projects');
  all.value = 'all';
  const independent = node('option', '', 'Independent tasks');
  independent.value = 'independent';
  select.replaceChildren(all, independent);
  for (const project of state.data.projects) {
    const option = node('option', '', project.title);
    option.value = 'project:' + project.id;
    select.append(option);
  }
  if (![...select.options].some(option => option.value === state.taskProject)) state.taskProject = 'all';
  select.value = state.taskProject;
}

function renderLoadError() {
  for (const kind of ['project', 'task']) {
    const panel = node('div', 'board-empty');
    panel.dataset.emptyState = 'error';
    if (kind === 'project') panel.setAttribute('role', 'alert');
    panel.append(node('h3', '', 'The board couldn’t be loaded.'), node('p', '', 'Please try again in a moment. The learning course is still available.'));
    const retry = button('Try again', 'group-button', loadBoard);
    retry.dataset.retryBoard = '';
    panel.append(retry);
    $('#' + kind + '-results').replaceChildren(panel);
    $('#' + kind + '-results').setAttribute('aria-busy', 'false');
    $('#' + kind + '-results-label').textContent = '';
  }
}

async function loadBoard() {
  if (state.loading) return;
  state.loading = true;
  for (const kind of ['project', 'task']) {
    const container = $('#' + kind + '-results');
    container.setAttribute('aria-busy', 'true');
    container.replaceChildren(node('div', 'board-loading', 'Gathering the ' + kind + 's…'));
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`./data/projects.json?v=${BUILD_VERSION}`, { cache: 'no-cache', signal: controller.signal });
    if (!response.ok) throw new Error('Board request failed: ' + response.status);
    state.data = normalizeData(await response.json());
    $('#project-total').textContent = String(state.data.projects.length);
    $('#project-count').textContent = String(state.data.projects.length);
    $('#task-count').textContent = String(state.data.tasks.length);
    $('#task-open-count').textContent = String(state.data.tasks.filter(task => task.status !== 'done').length);
    populateProjectFilter();
    renderProjects();
    renderTasks();
  } catch (error) {
    state.data = null;
    for (const id of ['project-total', 'project-count', 'task-count', 'task-open-count']) $('#' + id).textContent = '—';
    console.warn('The research board could not be loaded.', error);
    renderLoadError();
  } finally {
    clearTimeout(timeout);
    state.loading = false;
  }
}

function syncNavigation() {
  for (const link of document.querySelectorAll('[data-section-nav]')) {
    if (location.hash === '#' + link.dataset.sectionNav) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}

function initializeBoard() {
  $('#project-search').addEventListener('input', event => { state.projectQuery = event.target.value; renderProjects(); });
  $('#task-search').addEventListener('input', event => { state.taskQuery = event.target.value; renderTasks(); });
  $('#task-project-filter').addEventListener('change', event => { state.taskProject = event.target.value; renderTasks(); });
  for (const kind of ['project', 'task']) {
    for (const control of document.querySelectorAll('[data-' + kind + '-status]')) {
      control.addEventListener('click', () => { state[kind + 'Status'] = control.dataset[kind + 'Status']; syncFilters(kind); kind === 'project' ? renderProjects() : renderTasks(); });
    }
  }
  const dialog = $('#board-detail');
  $('#detail-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => document.body.classList.remove('group-dialog-open'));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  syncNavigation();
  loadBoard();
}

window.addEventListener('hashchange', () => { if (!redirectLegacyCourse()) syncNavigation(); });
if (!redirectLegacyCourse()) initializeBoard();

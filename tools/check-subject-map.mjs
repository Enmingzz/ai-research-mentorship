import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Check the suggested connections as data, independently of the SVG layout.
function validateSubjectMap(map, subjects) {
  assert(map && typeof map === 'object', 'The subject map is an object');
  const text = (value, label) => assert(typeof value === 'string' && value.trim(), `${label}: nonempty text`);
  text(map.note, 'Map note');
  assert(Array.isArray(map.nodes) && Array.isArray(map.edges) && Array.isArray(map.paths), 'The map contains nodes, edges, and paths');
  const subjectIds = subjects.map(subject => subject.id).sort();
  const nodeIds = map.nodes.map(node => node.id);
  assert.equal(new Set(nodeIds).size, nodeIds.length, 'Every subject appears once in the map');
  assert.deepEqual([...nodeIds].sort(), subjectIds, 'The map covers exactly the published subjects');
  const ids = new Set(nodeIds), incoming = new Map(nodeIds.map(id => [id, []])), outgoing = new Map(nodeIds.map(id => [id, []]));
  for (const node of map.nodes) {
    text(node.label, `${node.id} label`);
    text(node.caption, `${node.id} caption`);
    assert(typeof node.branch === 'string' && /^[a-z][a-z-]*$/.test(node.branch), `${node.id}: a valid branch name`);
  }
  const edgeKeys = new Set();
  for (const edge of map.edges) {
    assert(Array.isArray(edge) && edge.length === 2, 'Each connection has exactly two endpoints');
    const [from, to] = edge, key = `${from}/${to}`;
    assert(ids.has(from) && ids.has(to), `${key}: connection endpoints are published subjects`);
    assert.notEqual(from, to, `${key}: no self connection`);
    assert(!edgeKeys.has(key), `${key}: no duplicate connection`);
    edgeKeys.add(key);
    incoming.get(to).push(from);
    outgoing.get(from).push(to);
  }
  const roots = nodeIds.filter(id => !incoming.get(id).length).sort();
  assert.deepEqual(roots, ['01', '02'], 'Mathematics and engineering are independent starting points');
  const remaining = new Map(nodeIds.map(id => [id, incoming.get(id).length])), queue = [...roots], visited = [];
  while (queue.length) {
    const id = queue.shift();
    visited.push(id);
    for (const next of outgoing.get(id)) {
      remaining.set(next, remaining.get(next) - 1);
      if (!remaining.get(next)) queue.push(next);
    }
  }
  assert.equal(visited.length, nodeIds.length, 'Suggested connections form a directed acyclic graph reachable from the foundations');
  const pathIds = map.paths.map(path => path.id);
  assert.equal(new Set(pathIds).size, pathIds.length, 'Suggested directions have unique IDs');
  assert.deepEqual([...pathIds].sort(), ['generative', 'language', 'vlm'], 'All three suggested directions are available');
  for (const path of map.paths) {
    text(path.label, `${path.id} label`);
    text(path.description, `${path.id} description`);
    assert(Array.isArray(path.stages) && path.stages.length >= 2, `${path.id}: stages define a route`);
    for (const stage of path.stages) {
      assert(Array.isArray(stage) && stage.length, `${path.id}: no empty stage`);
      for (const id of stage) assert(ids.has(id), `${path.id}: stage subject ${id} exists`);
    }
    const routeIds = path.stages.flat();
    assert.equal(new Set(routeIds).size, routeIds.length, `${path.id}: a subject occurs in only one stage`);
    assert.deepEqual([...path.stages[0]].sort(), roots, `${path.id}: both foundations can be explored in parallel`);
    for (let index = 1; index < path.stages.length; index++) {
      const before = path.stages[index - 1], after = path.stages[index];
      for (const id of after) assert(before.some(previous => edgeKeys.has(`${previous}/${id}`)), `${path.id}: ${id} connects from the preceding stage`);
      for (const id of before) assert(after.some(next => edgeKeys.has(`${id}/${next}`)), `${path.id}: ${id} connects to the next stage`);
    }
    assert(Array.isArray(path.extensions), `${path.id}: optional extensions are an array`);
    assert.equal(new Set(path.extensions).size, path.extensions.length, `${path.id}: optional extensions are unique`);
    const reachable = new Set(routeIds), pending = [...routeIds];
    while (pending.length) for (const next of outgoing.get(pending.shift())) if (!reachable.has(next)) { reachable.add(next); pending.push(next); }
    for (const id of path.extensions) {
      assert(ids.has(id), `${path.id}: extension ${id} exists`);
      assert(!routeIds.includes(id), `${path.id}: extension ${id} is distinct from the main stages`);
      assert(reachable.has(id), `${path.id}: extension ${id} connects to the direction`);
    }
  }
}

const [map, subjects] = await Promise.all(['data/subject-map.json', 'data/curriculum.json'].map(async file => JSON.parse(await readFile(file, 'utf8'))));
validateSubjectMap(map, subjects);

// A few invalid fixtures establish that the invariants reject the mistakes they name.
const rejects = (change, pattern) => { const invalid = structuredClone(map); change(invalid); assert.throws(() => validateSubjectMap(invalid, subjects), pattern); };
rejects(invalid => invalid.nodes.pop(), /exactly the published subjects/);
rejects(invalid => invalid.edges.push(['04', '99']), /endpoints are published subjects/);
rejects(invalid => invalid.edges.push([...invalid.edges[0]]), /duplicate connection/);
rejects(invalid => invalid.edges.push(['10', '04']), /directed acyclic graph/);
rejects(invalid => invalid.paths[0].stages[2] = ['09'], /preceding stage|next stage/);
rejects(invalid => invalid.paths[0].extensions.push(invalid.paths[0].stages.at(-1)[0]), /distinct from the main stages/);
console.log(`PASS · subject map: ${map.nodes.length} subjects, ${map.edges.length} directed connections, two foundation roots, and ${map.paths.length} valid staged directions (data checks, not SVG layout QA)`);

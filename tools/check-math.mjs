import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {loadLessons} from './lessons.mjs';
import {mathSegments,renderMathText,renderFormula} from './math.mjs';

const inline=renderMathText(String.raw`Keep <script> literal; \(x_i^2+\frac{1}{2}\) is mathematics; $5 is text.`);
assert(inline.includes('&lt;script&gt;')&&!inline.includes('<script>'),'Prose is escaped');
assert(inline.includes('<msubsup>')&&inline.includes('<mfrac>'),'Indices, exponents and fractions have mathematical structure');
assert(inline.includes('class="katex-mathml"')&&inline.includes('aria-hidden="true"'),'Accessible MathML accompanies visual HTML');
assert(inline.includes('$5'),'Currency is never treated as a math delimiter');
const matrix=renderFormula(String.raw`\begin{bmatrix}1&2\\3&4\end{bmatrix}`,{displayMode:true});
assert(matrix.includes('<mtable')&&matrix.includes('katex-display'),'Matrices are typeset in display mode');
for(const invalid of [String.raw`\frac{1}`,String.raw`\unknowncommand{x}`,String.raw`\href{https://example.com}{x}`])assert.throws(()=>renderFormula(invalid),'Invalid or non-mathematical markup fails the build');
for(const invalid of [String.raw`missing \(x`,String.raw`closing x\)`,String.raw`nested \(x\(y\)`,String.raw`wrong \[x\)`])assert.throws(()=>renderMathText(invalid),'Unmatched or nested delimiters fail the build');
assert.deepEqual(mathSegments(String.raw`a \(x\) b`).map(s=>s.type),['text','math','text']);

const {lessons}=await loadLessons();
let display=0,inlineCount=0,articles=0;
for(const lesson of lessons){
  let count=0;
  for(const section of lesson.sections)if(section.formula){renderFormula(section.formula,{displayMode:true});display++;count++;}
  const prose=[...lesson.sections.flatMap(s=>[...s.paragraphs,...(s.bullets||[])]),lesson.exercise.prompt,lesson.exercise.answer,...lesson.takeaways];
  for(const text of prose){
    assert(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text),`${lesson.topicId}: no accidental JSON control-character escapes`);
    renderMathText(text);
    const math=mathSegments(text).filter(s=>s.type==='math').length;
    inlineCount+=math;count+=math;
  }
  if(count)articles++;
}
const css=await readFile('vendor/katex/katex.min.css','utf8');
const fontPaths=[...css.matchAll(/url\(([^)]+)\)/g)].map(match=>match[1].replace(/^['"]|['"]$/g,''));
assert(fontPaths.length>0,'Math font sources exist');
for(const path of fontPaths){assert(/^fonts\/KaTeX_[\w-]+\.(?:woff2?|ttf)$/.test(path),'Font URLs are self-hosted');await access(resolve('vendor/katex',path));}
await access('vendor/katex/LICENSE');
console.log(`PASS · ${display} display formulas · ${inlineCount} inline expressions · ${articles} articles with typeset math · ${fontPaths.length} self-hosted font files`);

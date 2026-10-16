import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadLessons,wordCount} from '../tools/lessons.mjs';

const read=async file=>JSON.parse(await readFile(file,'utf8'));
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const {lessons}=await loadLessons();
const papers=await read('data/papers.json');
const expected=lessons.map(article=>article.topicId);
const ranges=['01-04','05-08','09-12'];
const auditReports=await Promise.all(ranges.map(range=>read(`review/audit-${range}.json`)));
const covered=auditReports.flatMap(report=>report.reviewedTopicIds);
const enriched=auditReports.flatMap(report=>report.enrichedTopicIds);
assert.deepEqual([...new Set(covered)].sort(),expected,'All articles have a substantive audit');
assert.deepEqual([...new Set(enriched)].sort(),expected,'All articles have reading guidance');
assert(auditReports.every(report=>Array.isArray(report.unresolved)&&report.unresolved.length===0),'Unresolved source concerns must be addressed or explicitly reported');
const resolutions=await read('review/expanded-review-resolutions.json');
const passes=[];
for(const phase of ['baseline','expanded'])for(const range of ranges){
  const prefix=`review/claude-${phase}-${range}`;
  const [input,findings,envelope]=await Promise.all(['input','findings','response'].map(type=>read(`${prefix}-${type}.json`)));
  assert(!envelope.is_error,`${prefix}: completed Claude response`);
  assert.deepEqual([...new Set(findings.reviewedTopicIds)].sort(),input.articles.map(a=>a.topicId).sort(),`${prefix}: full declared coverage`);
  const current=lessons.filter(a=>input.articles.some(original=>original.topicId===a.topicId));
  const changedAfterReview=current.filter(article=>sha(article)!==sha(input.articles.find(a=>a.topicId===article.topicId))).map(a=>a.topicId);
  if(phase==='expanded')for(const [index,finding] of findings.findings.entries()){
    assert(resolutions.findings.some(item=>item.range===range&&item.findingIndex===index&&item.topicId===finding.topicId),`${prefix}: finding ${index} needs adjudication`);
  }
  if(input.papers?.length)assert.deepEqual([...new Set(findings.reviewedPaperIds)].sort(),papers.map(p=>p.id).sort(),'All shared paper notes reviewed by Claude');
  const paperNotesChangedAfterReview=(input.papers||[]).filter(paper=>sha(paper)!==sha(papers.find(p=>p.id===paper.id))).map(p=>p.id);
  passes.push({phase,range,models:Object.keys(envelope.modelUsage||{}),articleCount:input.articles.length,declaredReviewedTopicIds:findings.reviewedTopicIds,paperNoteCount:input.papers?.length||0,findingsCount:findings.findings.length,inputSha256:input.sha256,paperNotesInputSha256:input.papersSha256,findingsFile:`${prefix}-findings.json`,changedAfterReview:phase==='expanded'?changedAfterReview:undefined,paperNotesChangedAfterReview:paperNotesChangedAfterReview.length?paperNotesChangedAfterReview:undefined});
}
const sourceWords=lessons.map(article=>({topicId:article.topicId,words:article.sections.find(s=>s.id==='source-reading').paragraphs.join(' ').split(/\s+/).filter(Boolean).length}));
const report={
  reviewDate:'2026-10-16',
  baselineCommit:'093fdbcc1cb5cd2757faa5d91cdd8f6f53ea002a',
  scope:'English enming group reference library, modules 01–12; research homepage remains the project/task entry point.',
  coverage:{articles:lessons.length,subjects:12,sharedReadingResources:papers.length,sourceReadingSections:sourceWords.length,addedSourceReadingWords:sourceWords.reduce((sum,a)=>sum+a.words,0),articleProseWords:lessons.reduce((sum,a)=>sum+wordCount(a),0),uniqueArticleSourceUrls:new Set(lessons.flatMap(a=>a.references.map(r=>r.url))).size},
  method:['Every article read in one of three independent Codex audit ranges, with targeted original-paper and official-documentation verification.','Actual signed-in VS Code Claude Code reviewed all supplied articles in a baseline pass and a revised-content pass; tools and file edits were disabled.','Claude findings were assessed against primary sources, mathematical derivations, or executable examples rather than accepted automatically.','All articles gained distinct reading guidance connecting the original source to mechanisms, examples, assumptions, and limitations.'],
  paperPresentation:['Featured CLIP, BLIP-2, LLaVA, and Qwen2.5-VL on the library overview.','Added direct source links to article cards and a prominent original-paper/source panel above every article.','Expanded all 29 curated resource notes; preserved English text, large serif typography, stable article URLs, and library navigation.'],
  moduleAudits:ranges.map((range,index)=>({range,file:`review/audit-${range}.json`,reviewedArticles:auditReports[index].reviewedTopicIds.length,recordedCorrectionsAndClarifications:auditReports[index].issues.length})),
  claudePasses:passes,
  expandedFindingResolutions:'review/expanded-review-resolutions.json',
  executionEvidence:['review/audit-01-04-execution.json','review/audit-05-08.json','review/audit-09-12.json'],
  sourceReadingWordCounts:sourceWords,
  finalContentSha256:{articles:sha(lessons),sharedReadingResources:sha(papers)},
  hashConvention:'Final content hashes use compact JSON serialization of parsed data in topic order, so Git line-ending normalization does not change them. Per-range file-byte hashes describe the local audit snapshot and may differ after a CRLF/LF checkout conversion.',
  validation:{commands:['npm.cmd run check','npm.cmd run build'],status:'passed',publishedHtmlPages:177,scope:'Content coverage, English text, references, URL targets, navigation, search/filter behavior, static generation, and no personal tracking/storage.'},
  limitations:['This audit reduces identified errors; it does not prove that the library is error-free.','Source verification used primary landing pages and targeted full-text passages, not a complete reproduction of every cited paper.','Executed numerical and tensor checks use toy examples on CPU; no GPU, distributed-training, large-model benchmark, or published-score replication is claimed.','Claude performed reasoning-only proofreading and did not browse sources or run code; source access and execution were separate Codex checks.','Website validation used structural and interaction checks, not browser screenshot/layout inspection.','Source URLs and live documentation can change after the review date.']
};
await writeFile('review/content-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({articles:report.coverage.articles,addedWords:report.coverage.addedSourceReadingWords,claudePasses:passes.length,sourceUrls:report.coverage.uniqueArticleSourceUrls,report:'review/content-audit.json'}));

import katex from '../vendor/katex/katex.mjs';

export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const rendered=new Map();

export function renderFormula(source,{displayMode=false}={}){
  const tex=String(source).trim();
  if(!tex)throw new Error('A mathematical expression cannot be empty');
  if(/\\(?:href|url|includegraphics|html\w*|gdef|global)\b/.test(tex))throw new Error('Math must contain notation, not links, HTML, or global definitions');
  const key=JSON.stringify([displayMode,tex]);
  if(!rendered.has(key)){
    try{
      rendered.set(key,katex.renderToString(tex,{displayMode,output:'htmlAndMathml',throwOnError:true,strict:'error',trust:false,maxExpand:1000,maxSize:20,macros:{}}));
    }catch(error){throw new Error(`Invalid LaTeX ${JSON.stringify(tex)}: ${error.message}`,{cause:error});}
  }
  return rendered.get(key);
}

// Explicit delimiters keep prose, Python, URLs, and currency out of math mode.
export function mathSegments(value){
  const text=String(value??''),segments=[];
  let cursor=0;
  const delimiter=/\\[()[\]]/g;
  while(cursor<text.length){
    delimiter.lastIndex=cursor;
    const match=delimiter.exec(text);
    if(!match){segments.push({type:'text',value:text.slice(cursor)});break;}
    if(match.index>cursor)segments.push({type:'text',value:text.slice(cursor,match.index)});
    if(!['\\(','\\['].includes(match[0]))throw new Error(`Unmatched closing math delimiter in ${JSON.stringify(text)}`);
    const displayMode=match[0]==='\\[',closing=displayMode?'\\]':'\\)';
    const end=text.indexOf(closing,match.index+2);
    if(end<0)throw new Error(`Unclosed math delimiter in ${JSON.stringify(text)}`);
    const tex=text.slice(match.index+2,end);
    if(/\\[()[\]]/.test(tex))throw new Error(`Nested or mismatched math delimiter in ${JSON.stringify(text)}`);
    segments.push({type:'math',value:tex,displayMode});
    cursor=end+2;
  }
  return segments;
}

export function renderMathText(value){
  return mathSegments(value).map(segment=>segment.type==='text'?escapeHTML(segment.value):`<span class="${segment.displayMode?'math-in-prose-display':'math-inline'}">${renderFormula(segment.value,{displayMode:segment.displayMode})}</span>`).join('');
}

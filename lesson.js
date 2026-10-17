let timer;
function notify(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>el.classList.remove('visible'),3500);}
document.querySelector('#copy-article').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(location.href);notify('Article link copied');}catch{notify('Copy the article address from your browser to share it.');}
});
if('IntersectionObserver' in window){
  const links=[...document.querySelectorAll('.article-toc a, .mobile-toc nav a')];
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){for(const link of links){const active=link.getAttribute('href')===`#${entry.target.id}`;link.classList.toggle('current',active);if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}}},{rootMargin:'-10% 0px -65% 0px'});
  document.querySelectorAll('.article-section').forEach(section=>observer.observe(section));
}

// Math is already rendered in the HTML. Only clipped containers need a keyboard scroll target.
const mathContainers=[...document.querySelectorAll('.math-inline, .math-in-prose-display, .article-formula')];
function updateMathOverflow(){
  for(const container of mathContainers){
    const overflows=container.clientWidth>0&&container.scrollWidth>container.clientWidth+1;
    if(overflows){
      container.setAttribute('tabindex','0');
      container.setAttribute('role','region');
      container.setAttribute('aria-label','Scrollable mathematical expression');
    }else{
      container.removeAttribute('tabindex');
      container.removeAttribute('role');
      container.removeAttribute('aria-label');
    }
  }
}
if(mathContainers.length){
  updateMathOverflow();
  if('ResizeObserver' in window){
    const observer=new window.ResizeObserver(updateMathOverflow);
    mathContainers.forEach(container=>observer.observe(container));
  }else window.addEventListener('resize',updateMathOverflow);
  document.addEventListener('toggle',updateMathOverflow,true);
  window.addEventListener('pageshow',updateMathOverflow);
  if(document.fonts){
    document.fonts.ready.then(updateMathOverflow);
    document.fonts.addEventListener('loadingdone',updateMathOverflow);
  }
}

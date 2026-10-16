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

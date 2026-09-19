
(()=>{
const root=document.getElementById('content-revamp');
const videos=[...root.querySelectorAll('video')];
const automaticPauses=new WeakSet();
function pauseAll(except){videos.forEach(video=>{if(video!==except)stopAutomatic(video);});}
videos.forEach(video=>{video.muted=true;video.defaultMuted=true;video.loop=true;video.addEventListener('play',()=>{if(!video.muted)pauseAll(video);});video.addEventListener('volumechange',()=>{if(!video.muted&&!video.paused)pauseAll(video);});});


let filter='all',expanded=false,active=0;
const cards=[...root.querySelectorAll('[data-category]')],more=root.querySelector('#show-more'),gallery=root.querySelector('#portfolio-grid'),previous=root.querySelector('#portfolio-prev'),next=root.querySelector('#portfolio-next');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const caseTabs=[...root.querySelectorAll('.case-tabs [role="tab"]')];
function selectCase(tab){pauseAll();caseTabs.forEach(item=>{const selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;root.querySelector('#'+item.getAttribute('aria-controls')).hidden=!selected;});}
caseTabs.forEach((tab,index)=>{tab.addEventListener('click',()=>selectCase(tab));tab.addEventListener('keydown',event=>{let target;if(event.key==='ArrowRight')target=(index+1)%caseTabs.length;if(event.key==='ArrowLeft')target=(index+caseTabs.length-1)%caseTabs.length;if(event.key==='Home')target=0;if(event.key==='End')target=caseTabs.length-1;if(target!==undefined){event.preventDefault();selectCase(caseTabs[target]);caseTabs[target].focus();}});});
function matchingCards(){return cards.filter(card=>filter==='all'||card.dataset.category===filter);}
function renderCarousel(){
 const matching=matchingCards();active=matching.length?(active+matching.length)%matching.length:0;
 gallery.classList.toggle('carousel',!expanded);
 cards.forEach(card=>{
  const index=matching.indexOf(card),video=card.querySelector('video'),selector=card.querySelector('.select-video');
  card.hidden=index<0;
  let offset=index-active;
  if(offset>matching.length/2)offset-=matching.length;
  if(offset<-matching.length/2)offset+=matching.length;
  card.dataset.slot=String(offset);
  const playable=expanded||index===active;
  video.controls=playable;video.tabIndex=playable?0:-1;
  selector.tabIndex=!expanded&&index>=0&&index!==active?0:-1;
  selector.setAttribute('aria-hidden',String(expanded||index===active||index<0));
  if(index<0||!playable)stopAutomatic(video);
 });
 const selected=matching[active];
 root.querySelector('#portfolio-count').textContent=expanded?'Showing all '+matching.length+' videos':String(active+1).padStart(2,'0')+' / '+String(matching.length).padStart(2,'0')+' · '+(selected?.querySelector('h3').textContent||'');
 previous.disabled=next.disabled=matching.length<2;
 root.querySelector('.gallery-controls').hidden=expanded;
 more.textContent=expanded?'Back to carousel ←':'View all work ↗';more.setAttribute('aria-expanded',String(expanded));
 root.querySelectorAll('[data-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===filter)));
}
function move(direction){pauseAll();active+=direction;renderCarousel();}
previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
cards.forEach(card=>card.querySelector('.select-video').addEventListener('click',()=>{pauseAll();active=matchingCards().indexOf(card);renderCarousel();}));
gallery.addEventListener('keydown',event=>{if(event.target===gallery&&!expanded&&(event.key==='ArrowRight'||event.key==='ArrowLeft')){event.preventDefault();move(event.key==='ArrowRight'?1:-1);}});
let pointerStart=null;
gallery.addEventListener('pointerdown',event=>{if(!expanded&&event.pointerType==='touch')pointerStart={x:event.clientX,y:event.clientY};});
gallery.addEventListener('pointerup',event=>{if(!pointerStart)return;const dx=event.clientX-pointerStart.x,dy=event.clientY-pointerStart.y;pointerStart=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4)move(dx<0?1:-1);});
gallery.addEventListener('pointercancel',()=>{pointerStart=null;});
root.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{pauseAll();filter=button.dataset.filter;active=0;renderCarousel();}));
more.addEventListener('click',()=>{pauseAll();expanded=!expanded;renderCarousel();});
const loop=root.querySelector('#cr-loop'),replay=root.querySelector('#loop-replay');
function playLoop(){if(reducedMotion.matches)return;loop.classList.remove('is-playing');requestAnimationFrame(()=>requestAnimationFrame(()=>loop.classList.add('is-playing')));}
replay.addEventListener('click',playLoop);
if(!reducedMotion.matches){const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){playLoop();observer.disconnect();}},{threshold:.35});observer.observe(loop);}
root.querySelector('#loop-join').addEventListener('click',()=>{root.querySelector('#loop-waitlist').hidden=false;root.querySelector('#loop-join').setAttribute('aria-expanded','true');root.querySelector('#loop-email').focus();});

const product=root.querySelector('#cr-product'),dialog=root.querySelector('#content-order-dialog');
root.querySelectorAll('.start').forEach(button=>button.addEventListener('click',()=>{pauseAll();dialog.showModal();product.focus();}));
root.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});

root.querySelectorAll('.mobile-links a').forEach(link=>link.addEventListener('click',()=>{root.querySelector('.mobile-nav').open=false;}));
renderCarousel();
// Autoplay only visible media. A user-paused video stays paused until it leaves view.
const visibleVideos=new Set(),userPaused=new WeakSet();
function stopAutomatic(video){if(!video.paused){automaticPauses.add(video);video.pause();}}
function updateAutoplay(){
 const blocked=reducedMotion.matches||navigator.connection?.saveData||document.hidden||dialog.open;
 const audible=videos.find(video=>!video.paused&&!video.muted);
 videos.forEach(video=>{
  const card=video.closest('.sample'),eligible=!blocked&&visibleVideos.has(video)&&video.getClientRects().length>0&&(!card||expanded||card.dataset.slot==='0');
  if(!eligible){stopAutomatic(video);return;}
  if(!audible&&!userPaused.has(video)&&video.paused){video.muted=true;video.play().catch(()=>{});}
 });
}
videos.forEach(video=>{video.addEventListener('pause',()=>{if(automaticPauses.has(video)){automaticPauses.delete(video);return;}if(visibleVideos.has(video))userPaused.add(video);});});
const videoVisibility=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting&&entry.intersectionRatio>=.55)visibleVideos.add(entry.target);else{visibleVideos.delete(entry.target);if(!entry.isIntersecting)userPaused.delete(entry.target);}});updateAutoplay();},{threshold:[0,.55]});
videos.forEach(video=>videoVisibility.observe(video));
new MutationObserver(updateAutoplay).observe(root,{subtree:true,attributes:true,attributeFilter:['hidden','data-slot','open']});
document.addEventListener('visibilitychange',updateAutoplay);
reducedMotion.addEventListener('change',updateAutoplay);
if(navigator.connection?.addEventListener)navigator.connection.addEventListener('change',updateAutoplay);
})();

(()=>{
'use strict';
const root=document.getElementById('content-revamp');
if(!root)return;
const videos=[...root.querySelectorAll('video')];
const cards=[...root.querySelectorAll('.sample')];
const gallery=root.querySelector('#portfolio-grid');
const previous=root.querySelector('#portfolio-prev'),next=root.querySelector('#portfolio-next');
const rotation=root.querySelector('#portfolio-rotation'),more=root.querySelector('#show-more');
const count=root.querySelector('#portfolio-count'),work=root.querySelector('#cr-work');
const dialog=root.querySelector('#content-order-dialog'),product=root.querySelector('#cr-product');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const visibleVideos=new Set(),userPaused=new WeakSet(),automaticPauses=new WeakSet(),manualPlayback=new WeakSet();
let active=0,expanded=false,rotationPaused=false,galleryVisible=false,hovered=false,timer=null;
const icons={
 play:'<path d="m6 4 13 8-13 8Z"/>',
 pause:'<path d="M8 5v14M16 5v14"/>',
 muted:'<path d="m11 4-5 5H3v6h3l5 5ZM16 9l6 6m0-6-6 6"/>',
 sound:'<path d="m11 4-5 5H3v6h3l5 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'
};
function icon(name){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[name]+'</svg>';}
function stopAutomatic(video){
 if(!video.paused){automaticPauses.add(video);video.pause();}
}
function pauseAll(except){videos.forEach(video=>{if(video!==except)stopAutomatic(video);});}
function holdRotation(){rotationPaused=true;syncRotation();}
function updateAutoplay(){
 const blocked=document.hidden||dialog.open;
 const limitAutoplay=reducedMotion.matches||navigator.connection?.saveData;
 const audible=videos.find(video=>!video.paused&&!video.muted);
 videos.forEach(video=>{
  const card=video.closest('.sample');
  const eligible=!blocked&&visibleVideos.has(video)&&video.getClientRects().length>0&&(!card||expanded||card.dataset.slot==='0');
  if(!eligible){manualPlayback.delete(video);stopAutomatic(video);return;}
  if(limitAutoplay&&!manualPlayback.has(video)){stopAutomatic(video);return;}
  if(!audible&&!userPaused.has(video)&&video.paused){video.muted=true;video.play().catch(()=>{});}
 });
}
videos.forEach(video=>{
 video.muted=true;video.defaultMuted=true;video.loop=true;
 video.controls=false;video.tabIndex=-1;
 video.setAttribute('disablepictureinpicture','');
 video.setAttribute('controlslist','nodownload noplaybackrate noremoteplayback');
 const label=video.getAttribute('aria-label')||'video';
 const controls=document.createElement('div');controls.className='media-controls';
 const play=document.createElement('button'),sound=document.createElement('button');
 play.type=sound.type='button';
 play.className='media-play';sound.className='media-sound';
 const status=document.createElement('span');status.className='media-status';status.hidden=true;status.setAttribute('role','status');
 function updateControls(){
  play.innerHTML=icon(video.paused?'play':'pause');
  play.setAttribute('aria-label',(video.paused?'Play ':'Pause ')+label);
  sound.innerHTML=icon(video.muted?'muted':'sound');
  sound.setAttribute('aria-label',(video.muted?'Unmute ':'Mute ')+label);
  sound.setAttribute('aria-pressed',String(!video.muted));
 }
 function playRequested(){
  userPaused.delete(video);manualPlayback.add(video);status.hidden=true;
  video.play().catch(()=>{status.textContent='Couldn’t play. Tap play to retry.';status.hidden=false;updateControls();});
 }
 play.addEventListener('click',()=>{
  holdRotation();
  if(video.paused)playRequested();
  else{manualPlayback.delete(video);userPaused.add(video);video.pause();}
 });
 sound.addEventListener('click',()=>{
  holdRotation();video.muted=!video.muted;
  if(!video.muted){pauseAll(video);if(video.paused)playRequested();}
 });
 video.addEventListener('play',()=>{
  status.hidden=true;updateControls();
  if(!video.muted)pauseAll(video);
  syncRotation();
 });
 video.addEventListener('pause',()=>{
  if(automaticPauses.has(video))automaticPauses.delete(video);
  else if(visibleVideos.has(video))userPaused.add(video);
  updateControls();syncRotation();
 });
 video.addEventListener('volumechange',()=>{
  if(!video.muted&&!video.paused)pauseAll(video);
  updateControls();syncRotation();
 });
 video.addEventListener('error',()=>{status.textContent='Video unavailable. Please try again later.';status.hidden=false;});
 controls.append(play,sound);video.parentElement.append(controls,status);updateControls();
});
function renderCarousel(){
 active=(active+cards.length)%cards.length;
 gallery.classList.toggle('carousel',!expanded);
 cards.forEach((card,index)=>{
  let offset=index-active;
  if(offset>cards.length/2)offset-=cards.length;
  if(offset<-cards.length/2)offset+=cards.length;
  card.dataset.slot=String(offset);
  const playable=expanded||index===active,selector=card.querySelector('.select-video');
  selector.tabIndex=!expanded&&index!==active?0:-1;
  selector.setAttribute('aria-hidden',String(expanded||index===active));
  card.querySelectorAll('.media-controls button').forEach(button=>{button.tabIndex=playable?0:-1;});
  if(!playable)stopAutomatic(card.querySelector('video'));
 });
 count.textContent=expanded?'Showing all '+cards.length+' videos':String(active+1).padStart(2,'0')+' / '+String(cards.length).padStart(2,'0')+' · '+cards[active].querySelector('h3').textContent;
 root.querySelector('.gallery-controls').hidden=expanded;
 more.textContent=expanded?'Back to carousel ←':'View all work ↗';
 more.setAttribute('aria-expanded',String(expanded));
 updateAutoplay();syncRotation();
}
function move(direction,manual=true){
 if(manual)holdRotation();
 pauseAll();active+=direction;renderCarousel();
}
function canRotate(){
 return !rotationPaused&&!expanded&&galleryVisible&&!hovered&&!document.hidden&&!dialog.open
  &&!reducedMotion.matches&&!navigator.connection?.saveData
  &&!work.contains(document.activeElement)&&!videos.some(video=>!video.paused&&!video.muted);
}
function syncRotation(){
 const restricted=reducedMotion.matches||navigator.connection?.saveData;
 rotation.disabled=Boolean(restricted);
 rotation.textContent=restricted?'Auto-rotation off':rotationPaused?'Resume rotation':'Pause rotation';
 rotation.setAttribute('aria-label',restricted?'Automatic carousel disabled':rotationPaused?'Resume automatic carousel':'Pause automatic carousel');
 count.setAttribute('aria-live',canRotate()?'off':'polite');
 if(!canRotate()){clearTimeout(timer);timer=null;return;}
 if(timer===null)timer=setTimeout(()=>{timer=null;if(canRotate())move(1,false);},6500);
}
rotation.addEventListener('click',()=>{rotationPaused=!rotationPaused;syncRotation();});
previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
cards.forEach((card,index)=>card.querySelector('.select-video').addEventListener('click',()=>{holdRotation();pauseAll();active=index;renderCarousel();}));
gallery.addEventListener('keydown',event=>{
 if(event.target===gallery&&!expanded&&(event.key==='ArrowRight'||event.key==='ArrowLeft')){
  event.preventDefault();move(event.key==='ArrowRight'?1:-1);
 }
});
let pointerStart=null;
gallery.addEventListener('pointerdown',event=>{
 if(!expanded&&event.pointerType==='touch')pointerStart={x:event.clientX,y:event.clientY};
});
gallery.addEventListener('pointerup',event=>{
 if(!pointerStart)return;
 const dx=event.clientX-pointerStart.x,dy=event.clientY-pointerStart.y;pointerStart=null;
 if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4)move(dx<0?1:-1);
});
gallery.addEventListener('pointercancel',()=>{pointerStart=null;});
work.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovered=true;syncRotation();}});
work.addEventListener('pointerleave',()=>{hovered=false;syncRotation();});
work.addEventListener('focusin',syncRotation);
work.addEventListener('focusout',()=>setTimeout(syncRotation,0));
more.addEventListener('click',()=>{holdRotation();pauseAll();expanded=!expanded;renderCarousel();});
new IntersectionObserver(entries=>{
 galleryVisible=entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=.3);syncRotation();
},{threshold:[0,.3]}).observe(gallery);
const caseTabs=[...root.querySelectorAll('.case-tabs [role="tab"]')];
function selectCase(tab){
 pauseAll();
 caseTabs.forEach(item=>{
  const selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;
  root.querySelector('#'+item.getAttribute('aria-controls')).hidden=!selected;
 });
 updateAutoplay();
}
caseTabs.forEach((tab,index)=>{
 tab.addEventListener('click',()=>selectCase(tab));
 tab.addEventListener('keydown',event=>{
  let target;
  if(event.key==='ArrowRight')target=(index+1)%caseTabs.length;
  if(event.key==='ArrowLeft')target=(index+caseTabs.length-1)%caseTabs.length;
  if(event.key==='Home')target=0;
  if(event.key==='End')target=caseTabs.length-1;
  if(target!==undefined){event.preventDefault();selectCase(caseTabs[target]);caseTabs[target].focus();}
 });
});
const loop=root.querySelector('#cr-loop'),replay=root.querySelector('#loop-replay');
function playLoop(){
 if(reducedMotion.matches)return;
 loop.classList.remove('is-playing');
 requestAnimationFrame(()=>requestAnimationFrame(()=>loop.classList.add('is-playing')));
}
replay.addEventListener('click',playLoop);
if(!reducedMotion.matches){
 const observer=new IntersectionObserver(entries=>{
  if(entries.some(entry=>entry.isIntersecting)){playLoop();observer.disconnect();}
 },{threshold:.35});observer.observe(loop);
}
root.querySelector('#loop-join').addEventListener('click',()=>{
 root.querySelector('#loop-waitlist').hidden=false;
 root.querySelector('#loop-join').setAttribute('aria-expanded','true');root.querySelector('#loop-email').focus();
});
root.querySelectorAll('.start').forEach(button=>button.addEventListener('click',()=>{pauseAll();dialog.showModal();product.focus();syncRotation();}));
root.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{updateAutoplay();syncRotation();});
dialog.addEventListener('click',event=>{
 if(event.target===dialog){
  const rect=dialog.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
 }
});
root.querySelectorAll('.mobile-links a').forEach(link=>link.addEventListener('click',()=>{root.querySelector('.mobile-nav').open=false;}));
const videoVisibility=new IntersectionObserver(entries=>{
 entries.forEach(entry=>{
  if(entry.isIntersecting&&entry.intersectionRatio>=.55)visibleVideos.add(entry.target);
  else{visibleVideos.delete(entry.target);if(!entry.isIntersecting)userPaused.delete(entry.target);}
 });
 updateAutoplay();
},{threshold:[0,.55]});
videos.forEach(video=>videoVisibility.observe(video));
new MutationObserver(()=>{updateAutoplay();syncRotation();}).observe(root,{subtree:true,attributes:true,attributeFilter:['hidden','data-slot','open']});
function updatePreferences(){updateAutoplay();syncRotation();}
document.addEventListener('visibilitychange',updatePreferences);
reducedMotion.addEventListener('change',updatePreferences);
if(navigator.connection?.addEventListener)navigator.connection.addEventListener('change',updatePreferences);
renderCarousel();
})();

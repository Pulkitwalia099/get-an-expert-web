/* Both cuts occur three seconds into one seven-second comparison.
   Reference: 6.600 s at 30 fps. Remake: 5.375 s at 24 fps. */
(()=>{
'use strict';
const root=document.getElementById('content-revamp');
const box=root?.querySelector('#kaftan-comparison');
if(!box)return;
const pair=[...box.querySelectorAll('[data-sync-video]')],starts=pair.map(v=>Number(v.dataset.start));
if(pair.length!==2)return;
const [master,follower]=pair,play=box.querySelector('#comparison-play'),replay=box.querySelector('#comparison-replay');
const sound=box.querySelector('#comparison-sound'),status=box.querySelector('#comparison-status');
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const length=7;
let visible=false,wanted=false,manual=false,userPaused=false,running=false,starting=false,token=0,frame=0;
pair.forEach(v=>{v.controls=false;v.loop=false;v.muted=true;v.defaultMuted=true;v.setAttribute('disablepictureinpicture','');});
box.querySelector('.comparison-controls').hidden=false;
function eligible(){return visible&&!document.hidden&&!box.closest('[role="tabpanel"]').hidden&&!root.querySelector('dialog[open]');}
function restricted(){return motion.matches||navigator.connection?.saveData;}
function update(){play.textContent=running?'Pause comparison':'Play comparison';play.setAttribute('aria-label',play.textContent);}
function stop(){
 token++;starting=false;running=false;cancelAnimationFrame(frame);
 pair.forEach(v=>{v.pause();v.playbackRate=1;});update();
}
function ready(video,time,request){
 return new Promise((resolve,reject)=>{
  let timer;
  function cleanup(){clearTimeout(timer);['loadedmetadata','seeked','canplay','error'].forEach(n=>video.removeEventListener(n,check));}
  function check(){
   if(request!==token){cleanup();resolve();return;}
   if(video.error){cleanup();reject(new Error('Video unavailable.'));return;}
   if(video.readyState<1)return;
   if(Math.abs(video.currentTime-time)>.025){video.currentTime=time;return;}
   if(video.seeking||video.readyState<3)return;
   cleanup();resolve();
  }
  ['loadedmetadata','seeked','canplay','error'].forEach(n=>video.addEventListener(n,check));
  timer=setTimeout(()=>{cleanup();reject(new Error('Loading took too long. Tap play to retry.'));},15000);
  if(video.readyState===0){video.preload='auto';video.load();}
  check();
 });
}
function tick(){
 if(!running)return;
 const elapsed=master.currentTime-starts[0],expected=starts[1]+elapsed;
 if(elapsed>=length||pair.some(v=>v.ended)){start(true);return;}
 const drift=follower.currentTime-expected;
 if(Math.abs(drift)>.045&&!follower.seeking)follower.currentTime=expected;
 follower.playbackRate=Math.abs(drift)>.012?(drift>0?.98:1.02):1;
 frame=requestAnimationFrame(tick);
}
async function start(reset=false){
 if(starting||!wanted||!eligible()||(restricted()&&!manual))return;
 stop();const request=token;starting=true;
 const elapsed=reset?0:Math.max(0,Math.min(length-.1,master.currentTime-starts[0]));
 try{
  await Promise.all(pair.map((v,i)=>ready(v,starts[i]+elapsed,request)));
  if(request!==token||!wanted||!eligible())return;
  const attempts=await Promise.allSettled(pair.map(v=>v.play()));
  if(request!==token){if(!wanted)pair.forEach(v=>v.pause());return;}
  if(attempts.some(result=>result.status==='rejected'))throw new Error('Tap play to start the comparison.');
  running=true;status.hidden=true;update();frame=requestAnimationFrame(tick);
 }catch(error){
  if(request!==token)return;
  wanted=false;userPaused=true;stop();status.textContent=error.message;status.hidden=false;
 }finally{if(request===token)starting=false;}
}
function reconcile(){
 if(!eligible()){wanted=false;manual=false;stop();return;}
 if(!userPaused&&(!restricted()||manual)){wanted=true;if(!running&&!starting)start();}
 else if(restricted()&&!manual){wanted=false;stop();}
}
play.addEventListener('click',()=>{
 if(running||starting){wanted=false;userPaused=true;manual=false;stop();}
 else{wanted=true;userPaused=false;manual=true;start();}
});
replay.addEventListener('click',()=>{wanted=true;userPaused=false;manual=true;stop();start(true);});
sound.addEventListener('click',()=>{
 master.muted=!master.muted;
 sound.textContent=master.muted?'Sound off':'Sound on';
 sound.setAttribute('aria-label',master.muted?'Unmute reference audio':'Mute reference audio');
 sound.setAttribute('aria-pressed',String(!master.muted));
 if(!master.muted)root.querySelectorAll('video:not([data-sync-video])').forEach(v=>v.muted=true);
});
pair.forEach(v=>{
 v.addEventListener('waiting',()=>{if(!running)return;stop();if(wanted)start();});
 v.addEventListener('error',()=>{wanted=false;stop();status.textContent='Video unavailable. Please try again later.';status.hidden=false;});
});
new IntersectionObserver(entries=>{
 visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.4;
 if(!entries[0].isIntersecting)userPaused=false;
 reconcile();
},{threshold:[0,.4]}).observe(box);
new MutationObserver(reconcile).observe(root,{subtree:true,attributes:true,attributeFilter:['hidden','open']});
document.addEventListener('visibilitychange',reconcile);
motion.addEventListener('change',reconcile);
navigator.connection?.addEventListener?.('change',reconcile);
update();
})();

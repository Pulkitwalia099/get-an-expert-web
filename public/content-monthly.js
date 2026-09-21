/* A monthly request is a contact lead, never a trial order or subscription. */
(()=>{
'use strict';
const root=document.getElementById('content-revamp');
if(!root)return;
const dialog=root.querySelector('#monthly-request-dialog'),link=root.querySelector('#monthly-discuss');
if(!dialog||!link)return;
const form=root.querySelector('#monthly-request-form'),status=root.querySelector('#monthly-request-status');
const product=root.querySelector('#monthly-product'),email=root.querySelector('#monthly-email');
const button=form.querySelector('button[type="submit"]');
let count='8',sending=false,completed=false;
link.addEventListener('click',event=>{
 event.preventDefault();
 const choice=root.querySelector('input[name="monthly-videos"]:checked');
 const next=choice?.value||'8';
 if(completed&&next!==count){completed=false;form.reset();status.hidden=true;button.disabled=false;button.textContent='Submit request ↗';}
 count=next;
 root.querySelector('#monthly-request-summary').textContent=count+' videos · '+new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(choice?.dataset.price||395))+' / month';
 dialog.showModal();product.focus();
});
dialog.querySelector('.monthly-close').addEventListener('click',()=>dialog.close());
form.addEventListener('submit',async event=>{
 event.preventDefault();
 if(sending||completed)return;
 status.hidden=false;
 if(root.dataset.preview==='true'){status.textContent='Preview only. No request has been sent.';return;}
 const api=globalThis.MidseshContentIntake;
 if(!api){status.textContent='Please refresh and try again, or email midsesh.social@gmail.com.';return;}
 let payload;
 try{payload=api.monthlyPayload(count,product.value,email.value);}
 catch(error){status.textContent=error.message;status.dataset.error='true';return;}
 sending=true;button.disabled=true;button.textContent='Sending…';status.textContent='';status.dataset.error='false';
 try{
  await api.submitSignup(payload);
  completed=true;button.textContent='Request sent';
  status.textContent='Request received. We’ll confirm your plan by email.';
 }catch(error){
  status.dataset.error='true';
  status.textContent=error.name==='AbortError'?'The request timed out. Email midsesh.social@gmail.com so we can check it.':error.message;
  button.textContent='Submit request ↗';button.disabled=false;
 }finally{sending=false;}
});
})();

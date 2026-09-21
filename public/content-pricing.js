(()=>{
'use strict';
const section=document.getElementById('monthly-pricing');
if(!section)return;
const selector=section.querySelector('fieldset');
const choices=[...section.querySelectorAll('input[name="monthly-videos"]')];
const price=section.querySelector('#monthly-price');
const discuss=section.querySelector('#monthly-discuss');
function updatePlan(){
 const choice=choices.find(input=>input.checked);
 if(!choice)return;
 const amount=Number(choice.dataset.price);
 if(!Number.isFinite(amount)||amount<=0)return;
 price.querySelector('strong').textContent=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(amount);
 discuss.href='mailto:midsesh.social@gmail.com?subject='+encodeURIComponent(choice.value+' videos per month');
 discuss.setAttribute('aria-label','Discuss the '+choice.value+' videos per month plan');
}
choices.forEach(input=>input.addEventListener('change',updatePlan));
updatePlan();
selector.disabled=false;
})();

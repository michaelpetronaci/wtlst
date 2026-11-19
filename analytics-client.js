// WTLST GA4 bootstrap: optional analytics, opt-in only, no personal form values.
// This module does not initiate any network request until the visitor chooses Allow.
(function(){
'use strict';
const ID='G-JLQFSB8XW6',KEY='wtlst-analytics-consent-v1';
const allowed=new Set(['page_view','door_test_started','door_test_completed','application_started','application_verified','editorial_cta']);
let choice='unset',started=false,applicationTouched=false,previousPage='';
function readChoice(){try{const v=localStorage.getItem(KEY);return v==='allow'||v==='deny'?v:'unset';}catch{return 'unset';}}
function saveChoice(v){try{localStorage.setItem(KEY,v);}catch{}}
function path(){return window.location.origin+window.location.pathname;}
function pageName(){const view=new URLSearchParams(location.search).get('view');return document.title+(view==='apply'?' / application':view==='status'?' / status':'');}
function gtag(){window.dataLayer.push(arguments);}
function send(name){
 if(choice!=='allow'||!started||!allowed.has(name))return;
 const details={page_location:path(),page_referrer:'',page_title:pageName(),send_to:ID};
 window.gtag('event',name,details);
}
function pageView(){
 const view=new URLSearchParams(location.search).get('view');
 const key=path()+(view==='apply'?'#application':view==='status'?'#status':'');
 if(key===previousPage)return;
 previousPage=key;
 send('page_view');
}
function initAnalytics(){
 if(started)return;
 started=true;
 window.dataLayer=window.dataLayer||[];
 window.gtag=gtag;
 window.gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'});
 window.gtag('js',new Date());
 window.gtag('set',{allow_google_signals:false,allow_ad_personalization_signals:false,ads_data_redaction:true});
 window.gtag('consent','update',{analytics_storage:'granted'});
 window.gtag('config',ID,{send_page_view:false,page_location:path(),page_referrer:'',allow_google_signals:false,allow_ad_personalization_signals:false});
 const script=document.createElement('script');
 script.async=true;
 script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(ID);
 script.referrerPolicy='no-referrer';
 document.head.appendChild(script);
 pageView();
}
const css=[
'#wtlst-consent{position:fixed;z-index:2147483500;bottom:18px;left:18px;right:18px;max-width:600px;background:#191c17;border:1px solid #8b9980;box-shadow:0 7px 30px #0009;padding:22px;color:#f6f6ef;font:14px/1.5 Arial,Helvetica,sans-serif}',
'#wtlst-consent[hidden],#wtlst-preferences[hidden]{display:none!important}',
'#wtlst-consent h2{font-size:21px;line-height:1.2;margin:0 0 8px;color:#f6f6ef}',
'#wtlst-consent p{margin:0 0 14px;color:#d5d8cf}',
'#wtlst-consent button{border:1px solid #777e71;padding:10px 15px;cursor:pointer;font:700 12px Arial,Helvetica,sans-serif;letter-spacing:.06em;margin-right:9px;margin-top:6px;color:#f6f6ef;background:#222722}',
'#wtlst-consent button.wtlst-allow{background:#d4ff49;color:#101110;border-color:#d4ff49}',
'#wtlst-consent button:focus-visible,#wtlst-preferences:focus-visible{outline:3px solid #d4ff49;outline-offset:3px}',
'#wtlst-preferences{position:fixed;z-index:2147483400;bottom:12px;left:12px;background:#1d211b;color:#d4ff49;border:1px solid #69785c;border-radius:3px;padding:8px 10px;font:700 11px Arial,Helvetica,sans-serif;cursor:pointer}',
'#wtlst-consent a{color:#d4ff49;text-decoration:underline}',
'@media(max-width:600px){#wtlst-consent{bottom:9px;left:9px;right:9px;padding:17px}#wtlst-consent button{margin-right:5px}}'
].join('\n');
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
const panel=document.createElement('section');panel.id='wtlst-consent';panel.setAttribute('aria-label','Optional website analytics');
panel.innerHTML='<h2>Help us understand what works.</h2><p>With your permission, WTLST uses Google Analytics to count visits and understand which pages lead to applications. No application answers, names, emails or invitation codes are intentionally sent to Google. Optional analytics may place cookies; refusing will not affect your experience.</p><p><a href="/?view=privacy">Read our privacy notice</a></p><div><button class="wtlst-allow" type="button" data-choice="allow">Allow analytics</button><button type="button" data-choice="deny">No thanks</button></div>';
const preferences=document.createElement('button');preferences.type='button';preferences.id='wtlst-preferences';preferences.textContent='Analytics settings';preferences.setAttribute('aria-label','Change analytics consent');
function render(){panel.hidden=choice!=='unset';preferences.hidden=choice==='unset';}
function decide(value){
 if(value!=='allow'&&value!=='deny')return;
 const wasRunning=started;
 choice=value;saveChoice(value);
 if(value==='allow')initAnalytics();
 if(value==='deny'&&wasRunning){
   // Stop further GA requests on revocation and clear GA-created cookies via a fresh visit.
   window.gtag?.('consent','update',{analytics_storage:'denied',ad_storage:'denied'});
   window.location.reload();
   return;
 }
 render();
}
panel.addEventListener('click',function(e){const btn=e.target.closest('button[data-choice]');if(btn)decide(btn.dataset.choice);});
preferences.addEventListener('click',function(){choice='unset';render();panel.querySelector('button.wtlst-allow').focus();});
document.body.append(panel,preferences);
choice=readChoice();render();if(choice==='allow')initAnalytics();
window.wtlstAnalytics=Object.freeze({track:send});
const oldPush=history.pushState;
history.pushState=function(){const r=oldPush.apply(this,arguments);queueMicrotask(pageView);return r;};
window.addEventListener('popstate',()=>queueMicrotask(pageView));
document.addEventListener('focusin',function(e){
 if(applicationTouched)return;
 if(e.target.closest('.form-layout form')&&document.querySelector('.form-layout')){
   applicationTouched=true;send('application_started');
 }
});
document.addEventListener('click',function(e){
 const link=e.target.closest('a[href]');
 if(!link)return;
 let u;try{u=new URL(link.href,location.href);}catch{return;}
 if(u.origin!==location.origin)return;
 if((location.pathname==='/outside'||location.pathname.startsWith('/outside/'))&&(u.pathname==='/the-test'||new URLSearchParams(u.search).get('from')==='outside'))send('editorial_cta');
});
})();

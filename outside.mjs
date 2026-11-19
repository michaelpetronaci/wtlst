import {fieldNotes} from './outside-content.mjs';

const ORIGIN='https://www.thewtlst.com';
const baseCss=[
':root{color-scheme:dark;--ink:#101110;--text:#f6f6ef;--muted:#acaea7;--acid:#d4ff49;--line:#484b45}',
'*{box-sizing:border-box}html{scroll-behavior:smooth}body{background:var(--ink);color:var(--text);font:16px/1.64 Arial,Helvetica,sans-serif;margin:0}a{color:inherit}',
'a:focus-visible{outline:3px solid var(--acid);outline-offset:4px}.wrap{width:min(1040px,calc(100% - 44px));margin:0 auto}',
'header{padding:25px 0;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:20px}',
'.brand{font-weight:900;font-size:23px;letter-spacing:-1px;text-decoration:none;line-height:1}.brand em{font-style:normal;color:var(--acid)}',
'.nav{display:flex;gap:22px;font-size:12px;text-transform:uppercase;letter-spacing:.12em;font-weight:800}.nav a{text-decoration:none}.nav a:hover{color:var(--acid)}',
'main{padding:65px 0 95px}.eyebrow{font-size:11px;color:var(--acid);letter-spacing:.18em;font-weight:800;text-transform:uppercase;margin:0 0 24px}',
'h1,h2,h3,p{margin-top:0}h1{font-size:clamp(44px,8.2vw,95px);letter-spacing:-.067em;line-height:.97;font-weight:900;max-width:940px;margin-bottom:27px}',
'h2{font-size:clamp(25px,3.3vw,40px);letter-spacing:-.04em;line-height:1.12;margin:0 0 18px}h3{font-size:22px;line-height:1.23;letter-spacing:-.02em}',
'.lead{font-size:clamp(19px,2.4vw,26px);line-height:1.43;max-width:780px}.muted{color:var(--muted)}.fine{font-size:12px;color:var(--muted)}',
'.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:55px}',
'.card{border:1px solid var(--line);padding:27px 25px 30px;text-decoration:none;display:block;min-height:215px}.card:hover,.card:focus-visible{border-color:var(--acid);background:#191d16}',
'.card .number{font-size:11px;letter-spacing:.15em;color:var(--acid);margin-bottom:25px}.card h2{font-size:clamp(24px,3vw,33px)}.card p{font-size:14px;color:var(--muted);margin-bottom:0}',
'.article{max-width:770px}.article .lead{margin-bottom:50px}.article section{padding:31px 0;border-top:1px solid var(--line)}',
'.article section p{font-size:17px;max-width:70ch}.article section p:last-child{margin-bottom:0}',
'.questions{margin-top:55px;border-top:2px solid var(--acid);padding-top:30px}.questions details{border-bottom:1px solid var(--line);padding:19px 0}',
'.questions summary{cursor:pointer;font-weight:800}.questions details p{margin:13px 0 0;font-size:15px}',
'.sources{font-size:12px;color:var(--muted);margin-top:48px}.sources ul{padding-left:19px}',
'.promo{border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin:60px 0 0;padding:35px 0}.promo h2{font-size:clamp(25px,4vw,43px)}.promo p{max-width:650px}',
'.button{display:inline-block;background:var(--acid);color:var(--ink);padding:15px 22px;font-size:13px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;margin:10px 12px 4px 0}',
'.button:hover{background:#eaffab}.button.secondary{background:transparent;border:1px solid var(--line);color:var(--text)}.button.secondary:hover{border-color:var(--acid)}',
'.related{padding:35px 0}.related a{display:block;padding:14px 0;border-bottom:1px solid var(--line);text-decoration:none}.related a:hover{color:var(--acid)}',
'footer{border-top:1px solid var(--line);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:32px 0 45px;display:flex;justify-content:space-between;gap:20px}footer a{text-decoration:none}',
'@media(max-width:700px){main{padding-top:45px}.cards{grid-template-columns:1fr}.nav{gap:11px}.card{min-height:auto}footer{flex-direction:column}}'
].join('\n');
const esc=(s)=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const safeJSON=(value)=>JSON.stringify(value).replace(/</g,'\\u003c');
const canonical=(path)=>ORIGIN+path;
function layout({title,description,path,body,jsonLd}){
 const fullTitle=title+' — WTLST OUTSIDE';
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
 +'<meta name="theme-color" content="#101110"><meta name="robots" content="index,follow,max-snippet:-1">'
 +'<title>'+esc(fullTitle)+'</title><meta name="description" content="'+esc(description)+'">'
 +'<link rel="canonical" href="'+esc(canonical(path))+'">'
 +'<meta property="og:type" content="article"><meta property="og:site_name" content="WTLST">'
 +'<meta property="og:title" content="'+esc(fullTitle)+'"><meta property="og:description" content="'+esc(description)+'">'
 +'<meta property="og:url" content="'+esc(canonical(path))+'"><meta name="twitter:card" content="summary">'
 +(jsonLd?'<script type="application/ld+json">'+safeJSON(jsonLd)+'</script>':'')
 +'<style>'+baseCss+'</style></head><body><div class="wrap"><header><a class="brand" href="/" aria-label="WTLST home">WTLST<em>.</em></a>'
 +'<nav class="nav" aria-label="Main navigation"><a href="/outside">Outside</a><a href="/the-test">The Door Test</a><a href="/">The Waitlist</a></nav></header>'
 +'<main id="main">'+body+'</main><footer><span>WTLST / YOU PROBABLY WON\'T GET IN.</span><a href="/outside">All field notes</a></footer></div></body></html>';
}
function promo(){
 return '<aside class="promo" aria-label="WTLST invitation"><p class="eyebrow">A QUESTION FOR YOU</p><h2>Who would you let in?</h2>'
 +'<p>One seat left. A builder, a challenger, a connector or a wildcard? Three playful questions. Your answers aren\'t stored or used for admission.</p>'
 +'<a class="button" href="/the-test">Take the Door Test ↗</a>'
 +'<a class="button secondary" href="/?view=apply&amp;from=outside">Make your case ↗</a>'
 +'<p class="fine">WTLST is a separate, free-to-apply selective-membership experiment. Admission isn\'t guaranteed. No membership benefits are promised.</p></aside>';
}
export function outsideIndex(){
 const cards=fieldNotes.map((item,i)=>'<a class="card" href="/outside/'+esc(item.slug)+'"><p class="number">FIELD NOTE / '+String(i+1).padStart(2,'0')+'</p><h2>'+esc(item.title)+'</h2><p>'+esc(item.description)+'</p></a>').join('');
 const body='<p class="eyebrow">WTLST / OUTSIDE / FIELD NOTES</p><h1>Better rooms.<br>Better people.<br>Better questions.</h1>'
 +'<p class="lead">Practical field notes for getting invited, making the first move, hosting strangers, and finding your people. No manufactured mystique. No magic formula.</p>'
 +'<p class="muted">WTLST OUTSIDE is a public reading room. You don\'t have to apply to read any of it.</p>'
 +'<div class="cards">'+cards+'</div>'+promo();
 return layout({title:'Outside: field notes on finding your people',
 description:'Practical guides to meeting people in a new city, hosting strangers, starting a club, and belonging. Free original field notes from WTLST.',
 path:'/outside',body,jsonLd:{'@context':'https://schema.org','@type':'CollectionPage',name:'WTLST OUTSIDE',
 description:'Public field notes on practical social connection',url:canonical('/outside'),
 hasPart:fieldNotes.map(x=>({'@type':'WebPage',url:canonical('/outside/'+x.slug),name:x.title}))}});
}
export function outsideArticle(slug){
 const item=fieldNotes.find(x=>x.slug===slug);if(!item)return null;
 const path='/outside/'+item.slug;
 const sections=item.sections.map(part=>'<section><h2>'+esc(part.h)+'</h2>'+part.p.map(p=>'<p>'+esc(p)+'</p>').join('')+'</section>').join('');
 const faqs=item.faqs.map(([q,a])=>'<details><summary>'+esc(q)+'</summary><p>'+esc(a)+'</p></details>').join('');
 const sources=item.sources.length?'<div class="sources"><p>Further reading</p><ul>'+item.sources.map(([name,url])=>'<li><a href="'+esc(url)+'" rel="noopener noreferrer" target="_blank">'+esc(name)+'</a></li>').join('')+'</ul></div>':'';
 const related=fieldNotes.filter(x=>x.slug!==slug).slice(0,3).map(x=>'<a href="/outside/'+esc(x.slug)+'">'+esc(x.title)+' ↗</a>').join('');
 const body='<article class="article"><p class="eyebrow">WTLST / OUTSIDE / FIELD NOTE</p>'
 +'<h1>'+esc(item.title)+'</h1><p class="lead">'+esc(item.intro)+'</p>'+sections
 +'<aside class="questions"><h2>Questions people ask</h2>'+faqs+'</aside>'+sources+'</article>'
 +promo()+'<nav class="related" aria-label="Other field notes"><h2>Keep exploring</h2>'+related+'</nav>';
 const jsonLd={'@context':'https://schema.org','@type':'Article',headline:item.title,description:item.description,
 mainEntityOfPage:canonical(path),author:{'@type':'Organization',name:'WTLST'},
 publisher:{'@type':'Organization',name:'WTLST',url:ORIGIN},inLanguage:'en',isAccessibleForFree:true};
 return layout({title:item.title,description:item.description,path,body,jsonLd});
}
export function outsideSitemapUrls(){
 return ['/outside',...fieldNotes.map(x=>'/outside/'+x.slug)];
}

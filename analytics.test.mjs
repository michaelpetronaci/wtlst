import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {withAnalytics} from './analytics.mjs';
import {handler} from './server.mjs';
const client=await readFile(new URL('./analytics-client.js',import.meta.url),'utf8');
const assets=JSON.parse(await readFile(new URL('./assets.json',import.meta.url),'utf8'));

test('HTML bootstrap only references first-party consent manager',()=>{
 const page=withAnalytics('<html><body><h1>WTLST</h1></body></html>');
 assert.match(page,/<script defer src="\/analytics-client\.js"><\/script><\/body>/);
 assert.doesNotMatch(page,/googletagmanager|google-analytics/);
 assert.throws(()=>withAnalytics(page),/already inserted/);
});
test('all HTML routes inject consent UI; JS endpoint serves consent manager',async()=>{
 async function request(url){
  let status=200,body='',headers={};
  const res={setHeader(k,v){headers[k]=v;},writeHead(s,h){status=s;Object.assign(headers,h);},end(s=''){body=String(s??'');}};
  await handler({url,method:'GET',headers:{}},res);
  return {status,body,headers};
 }
 for(const url of ['/','/the-test','/the-test?result=builder','/outside','/outside/how-to-make-friends-in-a-new-city']){
  const r=await request(url);
  assert.equal(r.status,200,url);
  assert.equal(r.body.split('/analytics-client.js').length-1,1,url);
  assert.doesNotMatch(r.body,/src="https:\/\/www.googletagmanager.com/);
 }
 const js=await request('/analytics-client.js');
 assert.equal(js.status,200);
 assert.match(js.body,/G-JLQFSB8XW6/);
 assert.equal(js.headers['Content-Type'],'text/javascript; charset=utf-8');
 const notFound=await request('/outside/not-real');
 assert.equal(notFound.status,404);
});
test('confirmed application event only occurs after application RPC succeeds',()=>{
 const script=assets[Object.keys(assets).find(k=>k.endsWith('.js'))];
 const i=script.indexOf('async function P(){');
 assert.ok(i>0);
 const area=script.slice(i,i+700);
 const tick=String.fromCharCode(96);
 const rpc=area.indexOf('Ga('+tick+'wtlst_apply'+tick);
 const event=area.indexOf('window.wtlstAnalytics?.track('+tick+'application_verified'+tick+')');
 assert.ok(rpc>=0 && event>rpc);
 assert.ok(area.indexOf('sessionStorage.removeItem(')>event);
 assert.match(script,/Optional Google Analytics runs only if you allow analytics cookies/);
});
function simulate(stored){
 const events={},head=[],body=[],local={value:stored};
 function element(name){
  return {name,hidden:false,attrs:{},listeners:{},setAttribute(k,v){this.attrs[k]=v;},
    addEventListener(n,cb){this.listeners[n]=cb;},querySelector(){return{focus(){}};},focus(){}};
 }
 const doc={head:{appendChild(e){head.push(e);}},body:{append(...nodes){body.push(...nodes);}},
 createElement:element,addEventListener(n,cb){events[n]=cb;},title:'WTLST'};
 const url='https://www.thewtlst.com/?view=apply&ref=private-ref&invite=private-invite';
 const window={location:new URL(url),addEventListener(){},dataLayer:undefined};
 const history={pushState(){}};
 const context={window,document:doc,location:window.location,history,URL,URLSearchParams,Date,
 localStorage:{getItem(){return local.value;},setItem(k,v){local.value=v;}},
 queueMicrotask(cb){cb();},console};
 vm.runInNewContext(client,context,{filename:'analytics-client.js'});
 return {head,body,window,local};
}
test('GA4 remains unloaded and silent without optional consent',()=>{
 const page=simulate(null);
 assert.equal(page.head.filter(x=>x.src?.includes('googletagmanager.com')).length,0);
 assert.equal(page.window.dataLayer,undefined);
 page.window.wtlstAnalytics.track('application_verified');
 assert.equal(page.window.dataLayer,undefined);
 const deny=simulate('deny');
 assert.equal(deny.head.filter(x=>x.src?.includes('googletagmanager.com')).length,0);
});
test('after opt-in GA4 events exclude URL query strings and personal form values',()=>{
 const page=simulate('allow');
 assert.equal(page.head.filter(x=>x.src?.includes('googletagmanager.com')).length,1);
 page.window.wtlstAnalytics.track('application_verified',{email:'private@example.com',reason:'personal text'});
 const raw=JSON.stringify(page.window.dataLayer.map(x=>Array.from(x)));
 assert.match(raw,/application_verified/);
 assert.doesNotMatch(raw,/private-ref|private-invite|private@example.com|personal text/);
 assert.match(raw,/https:\/\/www.thewtlst.com\//);
});

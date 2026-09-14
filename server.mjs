import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {publicConfig} from './config.mjs';
import {deliver,sameSecret} from './email.mjs';
const assets=JSON.parse(await readFile(new URL('./assets.json',import.meta.url),'utf8'));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
export async function handler(req,res){
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Cache-Control','no-store');
 const json=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(req.method==='HEAD'?undefined:JSON.stringify(value));};
 try{
  const path=new URL(req.url,'https://thewtlst.com').pathname;
  if(path==='/api/send-emails'||path==='/api/cron/emails'){
   const cron=path==='/api/cron/emails';
   if(req.method!==(cron?'GET':'POST'))return json({error:'Method not allowed'},405);
   const token=(req.headers.authorization||'').replace(/^Bearer /,'');
   if(cron&&!sameSecret(token,process.env.CRON_SECRET))return json({error:'Unauthorized'},401);
   if(!cron&&!token)return json({error:'Sign in required'},401);
   const result=await deliver({token,cron});return json(result.body,result.status);
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return json({error:'Method not allowed'},405);
  if(path==='/api/config')return json(publicConfig());
  if(path==='/robots.txt'){res.writeHead(200,{'Content-Type':'text/plain'});return res.end('User-agent: *\nDisallow: /api/\n');}
  const key=path==='/'?'/index.html':decodeURIComponent(path);
  if(!Object.hasOwn(assets,key))return json({error:'Not found'},404);
  res.setHeader('Content-Type',types[extname(key)]||'application/octet-stream');
  res.setHeader('Cache-Control',key.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache');
  res.end(req.method==='HEAD'?undefined:assets[key]);
 }catch(error){console.error('WTLST request failed:',error.message.replace(/sb_(secret|publishable)_[\w-]+/g,'[redacted]'));json({error:'Service temporarily unavailable. Please try again shortly.'},503);}
}
export default handler;
// Vercel imports the handler; ordinary Node hosts can execute the same entry point.
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)createServer(handler).listen(Number(process.env.PORT)||3000,'0.0.0.0');

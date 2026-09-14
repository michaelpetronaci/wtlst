import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('dist-web');
const assets=JSON.parse(await readFile(new URL('./assets.json',import.meta.url),'utf8'));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
 try{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/api/config'){res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({url:process.env.SUPABASE_URL||'',key:process.env.SUPABASE_ANON_KEY||'',privacyContact:process.env.PRIVACY_CONTACT||'',operator:process.env.SITE_OPERATOR||''}));return;}
 const file=resolve(root,'.'+decodeURIComponent(path==='/'?'/index.html':path));
 if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return;}
 const data=assets[path==='/'?'/index.html':decodeURIComponent(path)];if(data===undefined){res.writeHead(404);res.end('Not found');return;}res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.setHeader('Cache-Control',path.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache');res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(Number(process.env.PORT)||3000,'0.0.0.0');

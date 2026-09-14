import {readdir,readFile,writeFile} from 'node:fs/promises';
const files=await readdir('dist-web',{recursive:true,withFileTypes:true});
const assets={};
for(const f of files) if(f.isFile()) { const path=`${f.parentPath}/${f.name}`; assets['/'+path.slice('dist-web/'.length)]=await readFile(path,'utf8'); }
await writeFile('assets.json',JSON.stringify(assets));

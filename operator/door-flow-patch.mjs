// Applies the approved Door Test → application copy to the prebuilt React asset.
// The source archive predates this enhancement. This transform is intentionally
// fail-closed so a later frontend rebuild cannot silently lose the funnel.
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export const doorApplicationUrl='/?view=apply&from=door';

function replaceOnce(text, from, to) {
  const matches=text.split(from).length-1;
  if(matches!==1) throw new Error('Expected exactly one WTLST application target, found '+matches+': '+from.slice(0,90));
  return text.replace(from,to);
}
export function patchDoorFlow(source) {
  const assets=structuredClone(source);
  const jsPaths=Object.keys(assets).filter(k=>k.startsWith('/assets/')&&k.endsWith('.js'));
  if(jsPaths.length!==1)throw new Error('Expected a single frontend JavaScript bundle');
  const oldPath=jsPaths[0];
  const newPath=oldPath.replace(/\.js$/,'-doorflow.js');
  if(Object.hasOwn(assets,newPath))throw new Error('Door flow output bundle already exists');
  let code=assets[oldPath];
  // Stable, initial-page-only context; applies only to the Door Test CTA.
  // React state remains unchanged, as do Supabase auth and application RPCs.
  code=replaceOnce(code,
    'function jl(){let[e,t]=(0,_.useState)(\`home\`)',
    'function jl(){const [wtDoor]=(0,_.useState)(()=>new URLSearchParams(window.location.search).get(\`from\`)===\`door\`);let[e,t]=(0,_.useState)(\`home\`)');
  code=replaceOnce(code,
    'e===\`apply\`?\`01 / THE APPLICATION\`:\`YOUR PRIVATE ACCESS\`',
    'e===\`apply\`?wtDoor?\`02 / YOUR TURN\`:\`01 / THE APPLICATION\`:\`YOUR PRIVATE ACCESS\`');
  code=replaceOnce(code,
    'e===\`apply\`?\`Make your\ncase.\`:\`Still\nwaiting?\`',
    'e===\`apply\`?wtDoor?\`Now it\\'s\nyour turn.\`:\`Make your\ncase.\`:\`Still\nwaiting?\`');
  code=replaceOnce(code,
    'e===\`apply\`?\`A place on the list costs nothing. Admission is another matter.\`:\`Use the email you applied with to see your position or membership.\`',
    'e===\`apply\`?wtDoor?\`You\\'ve decided who gets in. The Door Test was hypothetical. This isn\\'t. Tell us why you belong on the list.\`:\`A place on the list costs nothing. Admission is another matter.\`:\`Use the email you applied with to see your position or membership.\`');
  code=replaceOnce(code,
    'o?\`SUBMIT APPLICATION\`:\`SEND VERIFICATION CODE\`',
    'o?\`SUBMIT APPLICATION\`:wtDoor&&e===\`apply\`?\`SEND CODE TO VERIFY EMAIL\`:\`SEND VERIFICATION CODE\`');
  assets[newPath]=code;
  delete assets[oldPath];
  assets['/index.html']=replaceOnce(assets['/index.html'],oldPath,newPath);
  return {assets,oldPath,newPath};
}
async function main(){
  const assets=JSON.parse(await readFile(new URL('../assets.json',import.meta.url),'utf8'));
  const updated=patchDoorFlow(assets);
  await writeFile(new URL('../assets.json',import.meta.url),JSON.stringify(updated.assets)+'\n');
  console.log('WTLST Door Test application flow applied to '+updated.newPath);
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(e=>{console.error(e.message);process.exitCode=1});
}

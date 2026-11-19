// WTLST Door Test → application frontend bundle transform.
// This intentionally fails when the compiled app changes shape, instead of silently
// losing the conversion flow. No admission, auth or database behavior is modified.
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export const doorApplicationUrl='/?view=apply&from=door';
function replaceOnce(text,from,to){
  const count=text.split(from).length-1;
  if(count!==1)throw new Error('Expected exactly one frontend application anchor; found '+count+': '+from.slice(0,85));
  return text.replace(from,to);
}
export function patchDoorFlow(source){
  const assets=structuredClone(source);
  const jsPaths=Object.keys(assets).filter(k=>k.startsWith('/assets/')&&k.endsWith('.js'));
  if(jsPaths.length!==1)throw new Error('Expected exactly one frontend JavaScript bundle');
  const oldPath=jsPaths[0],newPath=oldPath.replace(/\.js$/,'-doorflow.js');
  if(Object.hasOwn(assets,newPath))throw new Error('Already patched');
  let code=assets[oldPath];
  const targets=["function jl(){let[e,t]=(0,_.useState)(`home`)","e===`apply`?`01 / THE APPLICATION`:`YOUR PRIVATE ACCESS`","e===`apply`?`Make your\ncase.`:`Still\nwaiting?`","e===`apply`?`A place on the list costs nothing. Admission is another matter.`:`Use the email you applied with to see your position or membership.`","o?`SUBMIT APPLICATION`:`SEND VERIFICATION CODE`"];
  const replacements=["function jl(){const [wtDoor]=(0,_.useState)(()=>new URLSearchParams(window.location.search).get(`from`)===`door`);let[e,t]=(0,_.useState)(`home`)","e===`apply`?wtDoor?`02 / YOUR TURN`:`01 / THE APPLICATION`:`YOUR PRIVATE ACCESS`","e===`apply`?wtDoor?`Now it\\'s\nyour turn.`:`Make your\ncase.`:`Still\nwaiting?`","e===`apply`?wtDoor?`You\\'ve decided who gets in. The Door Test was hypothetical. This isn\\'t. Tell us why you belong on the list.`:`A place on the list costs nothing. Admission is another matter.`:`Use the email you applied with to see your position or membership.`","o?`SUBMIT APPLICATION`:wtDoor&&e===`apply`?`SEND CODE TO VERIFY EMAIL`:`SEND VERIFICATION CODE`"];
  for(let i=0;i<targets.length;i++)code=replaceOnce(code,targets[i],replacements[i]);
  assets[newPath]=code;delete assets[oldPath];
  assets['/index.html']=replaceOnce(assets['/index.html'],oldPath,newPath);
  return {assets,oldPath,newPath};
}
async function main(){
  const input=JSON.parse(await readFile(new URL('../assets.json',import.meta.url),'utf8'));
  const next=patchDoorFlow(input);
  await writeFile(new URL('../assets.json',import.meta.url),JSON.stringify(next.assets)+'\n');
  console.log('Door application flow applied:',next.newPath);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(e=>{console.error(e.message);process.exitCode=1});
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {doorApplicationUrl,patchDoorFlow} from './door-flow-patch.mjs';

const assets=JSON.parse(await readFile(new URL('../assets.json',import.meta.url),'utf8'));
const quiz=await readFile(new URL('../the-test.html',import.meta.url),'utf8');
const scriptKey=Object.keys(assets).find(x=>x.endsWith('.js'));

test('the Door Test result CTA goes straight to the existing application',()=>{
  assert.equal(doorApplicationUrl,'/?view=apply&from=door');
  assert.match(quiz,/href="\/\?view=apply&amp;from=door">MAKE YOUR CASE/);
  assert.match(quiz,/Explore the waitlist/);
  assert.match(quiz,/id="share"/);
});

test('app bundle contains contextual application copy only when arriving from the Door Test',()=>{
  assert.equal(Object.keys(assets).filter(x=>x.endsWith('.js')).length,1);
  assert.ok(scriptKey.endsWith('-doorflow.js'));
  assert.ok(assets['/index.html'].includes(scriptKey));
  const code=assets[scriptKey];
  assert.ok(code.includes('get(`from`)===`door`'));
  assert.ok(code.includes('wtDoor?`02 / YOUR TURN`'));
  assert.ok(code.includes('wtDoor?`Now it'));
  assert.ok(code.includes('The Door Test was hypothetical.'));
  assert.ok(code.includes('wtDoor&&e===`apply`'));
  // The original form remains intact for normal admissions and existing applicants.
  assert.ok(code.includes('A place on the list costs nothing. Admission is another matter.'));
  assert.ok(code.includes('send') || code.includes('SEND CODE TO VERIFY EMAIL'));
  assert.ok(code.includes('wtlst_apply'));
  assert.ok(code.includes('wtlst-draft'));
});

test('patch fails closed if application markers change',()=>{
  assert.throws(()=>patchDoorFlow({'/index.html':'no frontend','/assets/a.js':'something'}),/Expected exactly one frontend application anchor/);
  assert.throws(()=>patchDoorFlow(assets),/Already patched/);
});

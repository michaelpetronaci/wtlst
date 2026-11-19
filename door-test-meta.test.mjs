import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderDoorTest,resultMeta} from './door-test-meta.mjs';
const base=await readFile(new URL('./the-test.html',import.meta.url),'utf8');
test('four results have distinct server-side titles and social previews',()=>{
 const titles=new Set();
 for(const [id,meta] of Object.entries(resultMeta)){
  const page=renderDoorTest(base,id);
  assert.ok(page.includes('<title>'+meta.title+'</title>'));
  assert.ok(page.includes('https://www.thewtlst.com/the-test?result='+id));
  assert.ok(page.includes('content="'+meta.description+'"'));
  assert.ok(page.includes('name="twitter:title"'));
  assert.ok(page.includes('name="twitter:description"'));
  assert.ok(page.includes('href="https://www.thewtlst.com/the-test"'));
  assert.ok(page.includes('id="share"'));
  titles.add(meta.title);
 }
 assert.equal(titles.size,4);
});
test('arbitrary user input cannot inject tags and invalid results get base page',()=>{
 for(const input of ['nope','<script>alert(1)</script>','__proto__','','constructor',null,undefined]){
  assert.equal(renderDoorTest(base,input),base);
 }
});
test('safe organic sharing does not add cookies or third-party trackers',()=>{
 assert.doesNotMatch(base,/(google-analytics\.com|facebook\.com\/tr|gtag\(|document\.cookie)/i);
 assert.match(base,/No answers are submitted, stored/);
});

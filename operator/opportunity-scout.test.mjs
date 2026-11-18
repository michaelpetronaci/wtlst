import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRequest,extractOutput,normalize,render,validUrl,run} from './opportunity-scout.mjs';
const evidence=[{url:'https://example.com/source-1',why:'Some evidence'},{url:'https://example.org/source-2',why:'Independent evidence'}];
const scores={search_intent:4,commercial_potential:4,competitive_gap:2,distribution_fit:3,maintenance_ease:5};
const idea=name=>({name,audience:'An audience',unmet_problem:'A real problem',asset_to_build:'A useful tool',monetization:'An unverified hypothesis',acquisition:'Helpful distribution',seven_day_validation:'Interview users',costs_and_dependencies:'Review costs',risks:'Competition',confidence:'Unproven',evidence,scores:{...scores}});
const report=()=>({overview:'Research summary',wtlst_test:{name:'A test',reason:'Relevant',audience:'Curious people',distribution:'Organic',experiment:'One landing page',measurement:'Post clicks',privacy_caveat:'No trackers',evidence},niches:[idea('A'),idea('B'),idea('C')]});
test('request is privacy constrained and web-research enabled',()=>{
 const x=buildRequest('2026-11-18','gpt-5-mini');
 assert.equal(x.store,false);
 assert.equal(x.tools[0].type,'web_search');
 assert.equal(x.text.format.type,'json_schema');
 assert.ok(x.input[0].content.includes('Never fabricate'));
});
test('normalizes exactly three niches with defensible numeric scores',()=>{
 const data=normalize(report());
 assert.equal(data.niches.length,3);
 assert.equal(data.niches[0].total_score,18);
 assert.match(render(data,'2026-11-18','gpt-5-mini'),/research leads/i);
});
test('rejects insufficient evidence',()=>{
 const data=report();data.niches[1].evidence=[evidence[0]];
 assert.throws(()=>normalize(data),/two independent source URLs/);
});
test('rejects invalid URL schemes or credentials',()=>{
 assert.equal(validUrl('javascript:alert(1)'),false);
 assert.equal(validUrl('https://user:pass@example.com'),false);
 assert.equal(validUrl('https://example.com'),true);
});
test('rejects out-of-range scores and duplicate niches',()=>{
 let data=report();data.niches[0].scores.search_intent=6;
 assert.throws(()=>normalize(data),/Invalid score/);
 data=report();data.niches[2].name='A';
 assert.throws(()=>normalize(data),/Duplicate/);
});
test('strict model output extraction',()=>{
 const data=report();
 assert.deepEqual(extractOutput({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(data)}]}]}),data);
 assert.throws(()=>extractOutput({status:'incomplete',output:[]}),/incomplete/);
});
test('fails closed without operator approval before any network calls',async()=>{
 await assert.rejects(()=>run({OPENAI_SCOUT_ENABLED:'false'}),/not enabled/);
});

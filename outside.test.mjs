import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldNotes} from './outside-content.mjs';
import {outsideIndex,outsideArticle,outsideSitemapUrls} from './outside.mjs';

test('eight unique, substantial, actionable, internally linked field notes',()=>{
 assert.equal(fieldNotes.length,8);
 assert.equal(new Set(fieldNotes.map(x=>x.slug)).size,fieldNotes.length);
 for(const note of fieldNotes){
  assert.match(note.slug,/^[a-z0-9-]+$/);
  assert.ok(note.sections.length>=4);
  assert.ok(note.sections.reduce((n,x)=>n+x.p.join(' ').length,0)>800);
  assert.ok(note.description.length>70 && note.description.length<170);
  assert.ok(note.faqs.length>=2);
  const html=outsideArticle(note.slug);
  assert.ok(html.includes('<title>'));
  assert.ok(html.includes('https://www.thewtlst.com/outside/'+note.slug));
  assert.ok(html.includes('rel="canonical"'));
  assert.ok(html.includes('application/ld+json'));
  assert.ok(html.includes('Take the Door Test'));
  assert.ok(html.includes('/?view=apply&amp;from=outside'));
  assert.ok(html.includes("Admission isn't guaranteed"));
  assert.ok(html.includes('Questions people ask'));
  assert.ok(!html.includes('<meta name="robots" content="noindex'));
 }
});
test('hub lists all notes with indexable navigation and conversion',()=>{
 const html=outsideIndex();
 assert.ok(html.includes('<h1>Better rooms.'));
 assert.ok(html.includes('<meta name="description"'));
 assert.ok(html.includes('CollectionPage'));
 for(const note of fieldNotes)assert.ok(html.includes('href="/outside/'+note.slug+'"'));
});
test('nonexistent article does not manufacture content',()=>{
 assert.equal(outsideArticle('does-not-exist'),null);
 assert.equal(outsideArticle('__proto__'),null);
});
test('every new article and hub is discoverable in sitemap',()=>{
 const urls=outsideSitemapUrls();
 assert.equal(urls.length,9);
 assert.equal(urls[0],'/outside');
 for(const note of fieldNotes)assert.ok(urls.includes('/outside/'+note.slug));
});

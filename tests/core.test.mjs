import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { accepts, allQuestions, unitStats, normalise, cleanProgress, validateUnit, safeRelativePath, gradedKeys, filterCatalog, matchesCatalog, createUnitLoader } from '../core.js';
const read=async name=>JSON.parse(await fs.readFile(new URL(`../${name}`,import.meta.url),'utf8'));
const manifest=await read('data/units.json');
const units=await Promise.all(manifest.units.map(e=>read(`data/${e.file}`)));
test('all unit content and answer keys are structurally valid',()=>{
 for(const u of units){assert.deepEqual(validateUnit(u),[]);for(const {question:q} of allQuestions(u)){if(q.type==='self'){assert.ok(q.modelAnswer);continue;}const answers=Array.isArray(q.answer)?q.answer:[q.answer];for(const a of answers)assert.equal(accepts(q,a),true);assert.equal(accepts(q,'unrelated answer 123'),false);}}
});
test('normalisation accepts harmless variation, while retaining meaningful spelling',()=>{
 assert.equal(normalise('  DUCK’S   back. '),"duck's back");
 assert.equal(accepts({answer:["lion's",'lions']},'LION’S'),true);
 assert.equal(accepts({answer:'fair and square'},'fair & square'),false);
 assert.equal(accepts({answer:'irresponsible'},'irresponible'),false);
 assert.equal(accepts({answer:'middle-of-the-road'},'middle‑of‑the‑road'),true);
});
test('progress counts latest results, ignores stale keys, and does not count listening as written mastery',()=>{
 const u=units[0],qs=allQuestions(u),answers={stale:{correct:true},[qs[0].key]:{correct:true},[qs[1].key]:{correct:false}};
 assert.equal(unitStats(u,answers).attempted,2);assert.equal(unitStats(u,answers).correct,1);
 answers[qs[1].key].correct=true;assert.equal(unitStats(u,answers).correct,2);
});
test('backup import keeps valid values and rejects malformed answer data',()=>{
 const p=cleanProgress({version:1,answers:{good:{value:'Hello',correct:true},bad:{correct:'yes'}},saved:['word','word',null],lastUnit:'unit-3'});
 assert.equal(p.answers.good.correct,true);assert.equal(p.answers.bad,undefined);assert.deepEqual(p.saved,['word']);assert.equal(p.lastUnit,'unit-3');
 assert.equal(Object.keys(cleanProgress({version:99,answers:{test:true}}).answers).length,0);
});
test('all question IDs are unique across their units',()=>{
 const keys=units.flatMap(u=>allQuestions(u).map(q=>q.key));assert.equal(keys.length,new Set(keys).size);
});
test('paths work beneath a GitHub project directory and reject traversal or remote URLs',()=>{
 for(const path of ['unit-6.json','audio/AV-001-2.mp3','audio/'])assert.equal(safeRelativePath(path),true);
 for(const path of ['/audio/a.mp3','../secret','audio/../secret','https://example.com/a.mp3','javascript:alert(1)','\\remote'])assert.equal(safeRelativePath(path),false);
});
test('validator catches missing answers and incorrect choice keys',()=>{
 const u=structuredClone(units[0]);u.exerciseGroups[0].questions[0].answer='not an option';assert.ok(validateUnit(u).length);
 const v=structuredClone(units[0]);v.exerciseGroups[0].questions[0].answer=[];assert.ok(validateUnit(v).length);
});
test('future unit template is valid and needs no app changes',async()=>{
 const u=await read('unit-template.json');assert.deepEqual(validateUnit(u),[]);assert.equal(u.number,6);assert.equal(allQuestions(u).length,2);
});
test('listening worksheets deliberately have no unverified answer keys',()=>{
 for(const u of units)for(const activity of u.audio.activities)assert.equal(activity.answerKey,null);
 assert.equal(units[0].audio.suggestedTrack,'AV-001-2.mp3');assert.equal(units[0].audio.track,null);
});

const catalog=(await read('data/catalog.json')).units;
test('catalog includes every book section with correct split numbering and pages',()=>{
 assert.equal(catalog.length,117);assert.equal(new Set(catalog.map(c=>c.id)).size,117);
 assert.deepEqual(catalog.filter(c=>c.number===60).map(c=>[c.label,c.page]),[['60a',122],['60b',124]]);
 assert.equal(catalog.at(-1).label,'116');assert.equal(catalog.at(-1).page,236);
 assert.equal(catalog[catalog.findIndex(c=>c.label==='60a')+1].label,'60b');
});
test('catalog search handles exact numbers, split units, topics and range/availability combinations',()=>{
 assert.deepEqual(catalog.filter(c=>matchesCatalog(c,'1')).map(c=>c.label),['1']);
 assert.deepEqual(catalog.filter(c=>matchesCatalog(c,'60')).map(c=>c.label),['60a','60b']);
 assert.deepEqual(catalog.filter(c=>matchesCatalog(c,'unit 60b')).map(c=>c.label),['60b']);
 assert.equal(filterCatalog(catalog,manifest.units,{}, {status:'available'}).length,5);
 assert.equal(filterCatalog(catalog,manifest.units,{}, {status:'coming'}).length,112);
 assert.equal(filterCatalog(catalog,manifest.units,{}, {range:'51'}).length,11);
 assert.equal(filterCatalog(catalog,manifest.units,{}, {query:'weather'}).length,2);
});
test('metadata and loaded unit statistics agree, and old-version keys do not affect new exercises',()=>{
 const u=units[1],meta=manifest.units[1],keys=gradedKeys(u),answers={[keys[0]]:{correct:true},[`${u.id}:old-group:old-question`]:{correct:false}};
 assert.deepEqual(unitStats(meta,answers),unitStats(u,answers));
 assert.equal(unitStats(u,answers).attempted,1);
 const self=allQuestions(u).find(e=>e.question.type==='self');answers[self.key]={correct:true};assert.equal(unitStats(u,answers).attempted,1);
});
test('content covers source vocabulary and source exercises without generated recall sets',()=>{
 for(const u of units){
  assert.equal(u.contentVersion,2);assert.ok(u.source.pdf);
  const terms=u.lessons.flatMap(l=>l.terms);assert.deepEqual(new Set(terms),new Set(u.vocabulary.map(v=>v.term)));
  assert.ok(u.vocabulary.every(v=>v.exampleSource&&v.sourcePage));
  assert.ok(u.exerciseGroups.every(g=>g.id.startsWith('book-')&&g.sourcePage));
 }
 assert.equal(units.flatMap(u=>allQuestions(u)).length,176);
 assert.equal(units.reduce((n,u)=>n+gradedKeys(u).length,0),144);
 assert.match(units[0].vocabulary.find(v=>v.term==='brash').example,/That TV presenter/);
 assert.match(units[2].vocabulary.find(v=>v.term==='accessible').example,/northern part of the park/);
 assert.match(units[0].exerciseGroups[0].passage,/Can you arrange a meeting with Joe Figgis/);
});
test('lazy loader fetches only requested registered units and coalesces concurrent loads',async()=>{
 let calls=0;const loader=createUnitLoader(manifest.units,async p=>{calls++;return read(p);});
 await Promise.all([loader('unit-3'),loader('unit-3')]);assert.equal(calls,1);
 await loader('unit-3');assert.equal(calls,1);
 await assert.rejects(loader('unit-116'),/not been added/);assert.equal(calls,1);
});
test('lazy loader retries after a real read failure',async()=>{
 let calls=0;const loader=createUnitLoader(manifest.units,async p=>{calls++;if(calls===1)throw Error('temporary failure');return read(p);});
 await assert.rejects(loader('unit-1'),/temporary failure/);await loader('unit-1');assert.equal(calls,2);
});
test('open writing and recent units survive backup import',()=>{
 const p=cleanProgress({version:1,answers:{},saved:[],writing:{'unit-4:book-1b:q-1':'My own response.'},recent:['unit-4','unit-1']});
 assert.equal(p.writing['unit-4:book-1b:q-1'],'My own response.');assert.deepEqual(p.recent,['unit-4','unit-1']);
});

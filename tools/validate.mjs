import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateUnit,safeRelativePath,allQuestions,gradedKeys} from '../core.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async p=>JSON.parse(await fs.readFile(path.join(root,p),'utf8'));
const errors=[];let words=0,questions=0,marked=0;
try{
 const manifest=await read('data/units.json'),catalog=await read('data/catalog.json');
 if(manifest.schemaVersion!==1||!Array.isArray(manifest.units)||!manifest.units.length)throw Error('Invalid unit index');
 if(catalog.schemaVersion!==1||new Set(catalog.units.map(c=>c.id)).size!==catalog.units.length)throw Error('Invalid catalog');
 const ids=new Set(),labels=new Set();
 for(const entry of manifest.units){
  if(!safeRelativePath(entry.file))throw Error('Unsafe unit path');
  const unit=await read(`data/${entry.file}`);
  errors.push(...validateUnit(unit).map(e=>`${entry.file}: ${e}`));
  if(unit.id!==entry.id)errors.push(`${entry.file}: ID differs from manifest`);
  if(ids.has(unit.id)||labels.has(unit.label||String(unit.number)))errors.push(`${entry.file}: duplicate unit ID or label`);
  ids.add(unit.id);labels.add(unit.label||String(unit.number));
  if(!catalog.units.some(c=>c.id===unit.id))errors.push(`${entry.file}: missing catalog entry`);
  if(Array.isArray(entry.questionKeys)&&JSON.stringify(entry.questionKeys.map(k=>`${entry.id}:${k}`))!==JSON.stringify(gradedKeys(unit)))errors.push(`${entry.file}: outdated question metadata; run npm run index`);
  if(unit.source?.pdf){if(!safeRelativePath(unit.source.pdf))errors.push('Invalid PDF path');else await fs.access(path.join(root,unit.source.pdf));}
  const terms=new Set(unit.vocabulary.map(v=>v.term));
  for(const l of unit.lessons)for(const t of l.terms||[])if(!terms.has(t))errors.push(`${entry.file}: unknown lesson term ${t}`);
  words+=unit.vocabulary.length;questions+=allQuestions(unit).length;marked+=gradedKeys(unit).length;
 }
 const audio=await read('data/audio-library.json');
 if(!safeRelativePath(audio.basePath)||!Array.isArray(audio.tracks))errors.push('Invalid audio index');
 for(const t of audio.tracks||[])if(!safeRelativePath(t.file))errors.push('Unsafe track name');
 console.log(`${catalog.targetUnitCount} unit numbers / ${catalog.units.length} catalog sections · ${manifest.units.length} available units · ${words} vocabulary entries · ${questions} source tasks (${marked} marked, ${questions-marked} model comparison)`);
 if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('All content, PDF references, navigation metadata and audio paths passed.');
}catch(error){console.error(error.message);process.exitCode=1;}

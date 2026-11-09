// Optional: discover unit JSON files and rebuild the lightweight navigation index.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateUnit} from '../core.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await fs.readFile(path.join(root,'data/units.json'),'utf8'));
const catalog=JSON.parse(await fs.readFile(path.join(root,'data/catalog.json'),'utf8'));
const files=(await fs.readdir(path.join(root,'data'))).filter(f=>/^unit-\d+[ab]?\.json$/.test(f));
const entries=[];
for(const file of files){
 const u=JSON.parse(await fs.readFile(path.join(root,'data',file),'utf8'));
 const issues=validateUnit(u);if(issues.length)throw Error(`${file}: ${issues.join('; ')}`);
 const c=catalog.units.find(c=>c.id===u.id);if(!c)throw Error(`Add ${u.id} to catalog.json before indexing.`);
 entries.push({id:u.id,file,number:u.number,label:u.label||String(u.number),title:u.title,shortTitle:u.shortTitle,description:u.description,estimatedMinutes:u.estimatedMinutes||35,vocabularyCount:u.vocabulary.length,contentVersion:u.contentVersion||1,questionKeys:u.exerciseGroups.flatMap(g=>g.questions.filter(q=>q.type!=='self').map(q=>`${g.id}:${q.id}`)),practiceCount:u.exerciseGroups.reduce((n,g)=>n+g.questions.length,0)});
}
entries.sort((a,b)=>catalog.units.find(c=>c.id===a.id).order-catalog.units.find(c=>c.id===b.id).order);
manifest.units=entries;
await fs.writeFile(path.join(root,'data/units.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Indexed ${entries.length} available source units. No content was invented for other catalog entries.`);

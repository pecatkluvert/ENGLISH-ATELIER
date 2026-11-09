import { accepts, allQuestions, unitStats, validateUnit, cleanProgress, safeRelativePath, gradedKeys, filterCatalog, matchesCatalog, createUnitLoader } from './core.js';

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const main = $('#main');
const KEY='english-atelier-progress-v1';
let progress=cleanProgress(null), units=[], audioLibrary={tracks:[],basePath:'audio/'}, storageWarning=false;
let catalog=[], targetUnitCount=116, loadUnitData, routeVersion=0, catalogState={query:'',range:'all',status:'all',page:1};
let run=null, flash={index:0,flipped:false}, vocabMode='cards', loadedFiles=new Map(), toastTimer, currentAudioURL=null;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const unitLabel=u=>String(u.label||u.number);
const missCount=u=>gradedKeys(u).filter(key=>progress.answers[key]?.correct===false).length;
async function ensureUnit(id){const u=await loadUnitData(id);const index=units.findIndex(e=>e.id===id);if(index>=0)units[index]=u;return u;}
const unitURL=(unit,tab='overview')=>`#/unit/${unit.id}/${tab}`;
const wordKey=(u,v)=>`${u.id}:${v.term}`;
const saved=(u,v)=>progress.saved.includes(wordKey(u,v));
function announce(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('#toast').hidden=true;},4000);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(progress));}catch{if(!storageWarning){storageWarning=true;announce('Browser storage is unavailable. Export your progress before leaving.');}} updateNav();}
function download(name,value,type='application/json') {const url=URL.createObjectURL(new Blob([value],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function getJSON(path){const response=await fetch(path,{cache:'no-cache'});if(!response.ok)throw Error(`Could not load ${path} (HTTP ${response.status}).`);return response.json();}
function stats(u){return unitStats(u,progress.answers);}
function totalStats(){return units.reduce((s,u)=>{const a=stats(u);for(const k of ['total','attempted','correct'])s[k]+=a[k];return s;},{total:0,attempted:0,correct:0});}
function mistakes(u){return allQuestions(u).filter(q=>progress.answers[q.key]?.correct===false);}
function source(u){return `<p class="source-note">${esc(u.source?.title||'Independent study')} · Unit ${esc(unitLabel(u))} · pp. ${esc((u.source?.pages||[]).join('–'))}. ${esc(u.source?.note||'')} ${u.source?.pdf&&safeRelativePath(u.source.pdf)?`<a class="text-button" href="${esc(u.source.pdf)}" target="_blank" rel="noopener">Open supplied PDF ↗</a>`:''}</p>`;}
function empty(title,text,button='<a class="button" href="#/units">Explore the units <span aria-hidden="true">→</span></a>',icon='Aa'){return `<div class="empty-state"><div class="empty-icon" aria-hidden="true">${icon}</div><h2>${esc(title)}</h2><p>${esc(text)}</p>${button}</div>`;}
function heading(title,text,right=''){return `<div class="page-heading"><div><h1>${esc(title)}</h1><p>${esc(text)}</p></div>${right}</div>`;}
function updateNav(){
 $('#unit-count').textContent=targetUnitCount;
 $('#review-count').textContent=units.reduce((n,u)=>n+missCount(u),0);
 const parts=location.hash.slice(1).split('/').filter(Boolean), section=parts[0]||'home';
 $$('[data-nav]').forEach(a=>{const active=a.dataset.nav===section||(a.dataset.nav==='units'&&section==='unit');a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 const recent=[...new Set([parts[1],...progress.recent,...units.map(u=>u.id)])].map(id=>units.find(u=>u.id===id)).filter(Boolean).slice(0,4);
 $('#unit-nav').innerHTML=recent.map(u=>`<a href="${unitURL(u)}" ${parts[1]===u.id?'class="active" aria-current="page"':''}><span class="unit-dot">${esc(unitLabel(u))}</span><span>${esc(u.shortTitle)}</span></a>`).join('');
}
function setTitle(title){document.title=`${title} · English Atelier`;$('#breadcrumb').textContent=title;}
function unitCard(u){const s=stats(u);return `<article class="unit-card"><div class="card-top"><span class="unit-label">UNIT ${unitLabel(u).padStart(2,'0')}</span><span class="unit-emblem" aria-hidden="true">${['Aa','ab','±','&','!'][(u.number-1)%5]}</span></div><h3><a href="${unitURL(u)}">${esc(u.shortTitle)}</a></h3><p>${esc(u.description)}</p><div class="card-meta"><span>◷ ${u.estimatedMinutes||35} min</span><span>${u.vocabulary?.length||u.vocabularyCount||0} words & phrases</span><span>${s.total?s.total+' marked questions':'Open to load practice'}</span></div><div class="card-progress"><div class="progress-track" role="img" aria-label="${s.percent}% of questions correct"><span style="width:${s.percent}%"></span></div><span>${s.attempted?`${s.correct}/${s.total} correct`:'Ready to begin'}</span><span class="arrow" aria-hidden="true">↗</span></div></article>`;}
function dashboard(){
 setTitle('Your workspace');const s=totalStats();const next=units.find(u=>u.id===progress.lastUnit)||units.find(u=>!stats(u).total||stats(u).correct<stats(u).total)||units[0];
 const collection=units.flatMap(u=>(u.vocabulary||[]).map(v=>({u,v})));const day=Math.floor(Date.now()/86400000);const {u:focusUnit,v}=collection[day%collection.length];
 const date=new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric'}).format(new Date());
 main.innerHTML=heading('Make room for better English.','Your next chapter starts with a little curiosity.',`<span class="date-label">${esc(date)}</span>`)+`
 <section class="hero" aria-label="Continue your learning"><div class="hero-copy"><span class="eyebrow">WORDS OPEN WORLDS</span><h1>A little practice.<br>A <em>richer vocabulary.</em></h1><p>Go beyond knowing a word. Learn its meaning, find its rhythm, and make it your own.</p><a class="button" href="${unitURL(next,'lesson')}">${s.attempted?'Continue learning':'Start your first lesson'} <span aria-hidden="true">→</span></a></div><div class="hero-art" aria-hidden="true"><div class="book-stack"><div class="book-back"></div><div class="book-front"><small>THE ART OF EXPRESSION</small><div class="book-aa">Aa</div><div class="book-label">A world<br>of words.</div></div></div><span class="art-star">✳</span><span class="art-loop">a</span></div></section>
 <div class="stats-row"><div class="stat"><span class="stat-symbol" aria-hidden="true">▤</span><div><strong>${units.length}</strong><p>Units with material · ${targetUnitCount} planned</p></div></div><div class="stat"><span class="stat-symbol" aria-hidden="true">✎</span><div><strong>${s.attempted}<span class="muted small"> / ${s.total}</span></strong><p>Marked questions tried</p></div></div><div class="stat"><span class="stat-symbol" aria-hidden="true">◎</span><div><strong>${s.attempted?Math.round(s.correct/s.attempted*100)+'%':'—'}</strong><p>Marked-answer accuracy</p></div></div></div>
 <div class="section-head"><div><h2>Your learning path</h2><p>Read. Discover. Practise. Make it stick.</p></div><a class="text-button" href="#/units">All units <span aria-hidden="true">↗</span></a></div>
 <div class="course-layout"><div><div class="unit-grid">${units.slice(0,6).map(unitCard).join('')}</div><div class="course-banner"><span aria-hidden="true">↗</span><div><strong>Find any unit in the book.</strong><p>${targetUnitCount} units are in the directory. ${units.length} currently have source material.</p></div></div></div><aside class="course-aside"><div class="focus-card"><span class="eyebrow">A WORD TO KEEP</span><div class="quote-icon" aria-hidden="true">“</div><h3 class="focus-word">${esc(v.term)}</h3><span class="part-of-speech">from unit ${focusUnit.number}</span><p class="spaced">${esc(v.definition)}</p><blockquote>${esc(v.example)}</blockquote><button class="text-button" data-save="${esc(wordKey(focusUnit,v))}">${saved(focusUnit,v)?'★ Saved to your words':'☆ Save this word'}</button></div><div class="study-tip"><strong>THE FIVE-MINUTE HABIT</strong>Choose a word, say it aloud, then use it in a sentence about your own life.</div></aside></div>`;
}
function catalogRow(c){
 const available=units.find(u=>u.id===c.id), s=available?stats(available):null;
 return `<a class="catalog-row ${available?'available':'upcoming'}" href="${unitURL(c)}"><span class="catalog-number">${esc(unitLabel(c))}</span><span class="catalog-name"><strong>${esc(c.title)}</strong><small>Book p. ${c.page}${available?` · ${s.total?s.total+' marked questions':'Available to open'}${s.attempted?` · ${s.correct} correct`:''}`:' · Material not added yet'}</small></span><span class="pill ${available?'':'not-ready'}">${available?'Open unit':'Not added'}</span><span class="arrow" aria-hidden="true">→</span></a>`;
}
function courses(){
 setTitle('Course directory');
 main.innerHTML=heading('The whole book. Easy to find.',`${targetUnitCount} unit numbers · ${catalog.length} sections including 60a and 60b · ${units.length} available`)+`
 <div class="catalog-controls panel"><div class="catalog-search"><label for="catalog-search">Find a unit by number or topic</label><input class="input" id="catalog-search" type="search" placeholder="Try 60b, weather, or phrasal verbs…" value="${esc(catalogState.query)}"></div><div><label for="catalog-range">Unit range</label><select class="select" id="catalog-range"><option value="all">All ranges</option>${Array.from({length:12},(_,i)=>i*10+1).map(n=>`<option value="${n}" ${String(n)===catalogState.range?'selected':''}>${n}–${Math.min(n+9,116)}</option>`).join('')}</select></div><div><label for="catalog-status">Availability & progress</label><select class="select" id="catalog-status">${[['all','All units'],['available','Available to study'],['coming','Material not added'],['started','In progress'],['complete','Completed']].map(([v,t])=>`<option value="${v}" ${v===catalogState.status?'selected':''}>${t}</option>`).join('')}</select></div><button class="text-button" data-clear-catalog>Reset filters</button></div>
 <div id="catalog-results"></div>`;
 for(const [id,key] of [['catalog-search','query'],['catalog-range','range'],['catalog-status','status']]) $('#'+id).addEventListener(id==='catalog-search'?'input':'change',event=>{catalogState[key]=event.target.value;catalogState.page=1;renderCatalogResults();});
 renderCatalogResults();
}
function renderCatalogResults(){
 const list=filterCatalog(catalog,units,progress.answers,catalogState),size=15,pages=Math.max(1,Math.ceil(list.length/size));catalogState.page=Math.min(catalogState.page,pages);
 const start=(catalogState.page-1)*size;
 $('#catalog-results').innerHTML=`<div class="section-head"><p role="status">${list.length?`${start+1}–${Math.min(start+size,list.length)} of ${list.length} sections`:'No matching units'}</p><button class="text-button" data-open-switcher>Jump to a unit ↗</button></div><div class="catalog-list">${list.slice(start,start+size).map(catalogRow).join('')}</div>${list.length?'':empty('Try another search','Clear a filter or search for a different number or topic.','')}<div class="pagination"><button class="button secondary small" data-catalog-page="-1" ${catalogState.page<=1?'disabled':''}>← Previous</button><span>Page ${catalogState.page} of ${pages}</span><button class="button secondary small" data-catalog-page="1" ${catalogState.page>=pages?'disabled':''}>Next →</button></div><p class="small muted">Only Units 1–5 have been supplied so far. The other titles come from your contents pages and become available when their JSON content is registered.</p>`;
}
function adjacentUnits(u){const index=catalog.findIndex(c=>c.id===u.id);return {prev:catalog[index-1],next:catalog[index+1]};}
function unitNavigator(u){const {prev,next}=adjacentUnits(u);return `<div class="unit-travel"><a class="back-link" href="#/units">← Course directory</a><div>${prev?`<a href="${unitURL(prev)}" title="${esc(prev.title)}">← Unit ${esc(unitLabel(prev))}</a>`:''}<button class="text-button" data-open-switcher>Switch unit ⌄</button>${next?`<a href="${unitURL(next)}" title="${esc(next.title)}">Unit ${esc(unitLabel(next))} →</a>`:''}</div></div>`;}
function showUpcoming(c){setTitle(`Unit ${unitLabel(c)} · ${c.title}`);main.innerHTML=unitNavigator(c)+`<span class="eyebrow">UNIT ${esc(unitLabel(c))} · BOOK P. ${c.page}</span><h1 class="spaced">${esc(c.title)}</h1>`+empty('The title is here. The lesson is on its way.','This unit is listed in the contents pages, but its lesson document has not been supplied yet. No lesson or questions have been invented for it.','<a class="button" href="#/units">Browse available material →</a>','▤');}
function openSwitcher(){const d=$('#unit-switcher');if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','');$('#switcher-query').value='';renderSwitcher('');$('#switcher-query').focus();}
function closeSwitcher(){const d=$('#unit-switcher');if(typeof d.close==='function')d.close();else d.removeAttribute('open');}
function renderSwitcher(query){const matches=catalog.filter(c=>matchesCatalog(c,query));$('#switcher-results').innerHTML=matches.slice(0,30).map(catalogRow).join('')||'<p class="muted">No matching unit. Try its number, including 60a or 60b.</p>';$('#switcher-count').textContent=`${matches.length} matching sections${matches.length>30?' · first 30 shown; type to narrow':''}`;}
function unitHeader(u,tab){
 return unitNavigator(u)+`<section class="unit-intro"><span class="eyebrow">UNIT ${unitLabel(u).padStart(2,'0')} · ${esc(u.level||'Advanced')}</span><h1>${esc(u.title)}</h1><p>${esc(u.description)}</p><div class="intro-meta"><span>◷ About ${u.estimatedMinutes||35} minutes</span><span>${u.vocabulary?.length||u.vocabularyCount||0} words & phrases</span><span>${allQuestions(u).length} document tasks</span><span class="pill">${stats(u).percent}% correct</span></div></section><nav class="tabs" aria-label="Unit sections">${[['overview','Overview'],['lesson','Lesson'],['vocabulary','Vocabulary'],['practice','Practice'],['listening','Listening']].map(([id,label])=>`<a href="${unitURL(u,id)}" ${tab===id?'class="active" aria-current="page"':''}>${label}</a>`).join('')}</nav>`;
}
function renderUnit(u,tab='overview'){
 progress.lastUnit=u.id;progress.recent=[u.id,...progress.recent.filter(id=>id!==u.id)].slice(0,10);save();setTitle(`Unit ${unitLabel(u)} · ${u.shortTitle}`);
 main.innerHTML=unitHeader(u,tab)+`<div id="unit-content"></div>`;
 if(tab==='lesson')renderLesson(u);
 else if(tab==='vocabulary')renderVocabulary(u);
 else if(tab==='practice')startPractice(u);
 else if(tab==='listening')renderListening(u);
 else renderOverview(u);
}
function renderOverview(u){
 $('#unit-content').innerHTML=`<div class="two-col"><div><section class="panel"><span class="eyebrow">WHAT YOU WILL LEARN</span><h2 class="spaced">A few words. A lot more expression.</h2><ul class="objectives">${u.objectives.map(o=>`<li>${esc(o)}</li>`).join('')}</ul></section><section class="panel"><h2>Your route through this unit</h2><div class="chapter-path">${[['lesson','Read the lesson',`${u.lessons.length} clear explanations with examples`],['vocabulary','Explore the vocabulary',`${u.vocabulary.length} words and phrases, plus flashcards`],['practice','Put it into practice',`${u.exerciseGroups.length} exercise sets with feedback`],['listening','Listen & notice',u.audio?.activities?.length?'Listening answer sheets and your audio tracks':'Your audio library and space for listening notes']].map(([tab,title,desc],i)=>`<a class="path-step" href="${unitURL(u,tab)}"><span class="step-number">${i+1}</span><div><h3>${title}</h3><p>${desc}</p></div><span class="arrow" aria-hidden="true">→</span></a>`).join('')}</div></section></div><aside><section class="panel"><span class="eyebrow">YOUR PROGRESS</span><h2 class="spaced">${stats(u).correct} <span class="muted">/ ${stats(u).total}</span></h2><p class="small muted">Automatically marked questions with a correct latest answer. Open writing responses are saved separately. Retrying updates the result.</p><div class="progress-track" role="img" aria-label="${stats(u).percent}% correct"><span style="width:${stats(u).percent}%"></span></div><a class="button spaced" href="${unitURL(u,'lesson')}">${progress.lessons[u.id]?'Revisit the lesson':'Begin with the lesson'} →</a></section><div class="note">Take your time. Read an example aloud before moving on to the next word.</div></aside></div>${source(u)}`;
}
function renderLesson(u){
 const pdf=u.source?.pdf&&safeRelativePath(u.source.pdf)?`<a class="button secondary small" href="${esc(u.source.pdf)}" target="_blank" rel="noopener">Open original pages ↗</a>`:'';
 $('#unit-content').innerHTML=`<div class="section-head"><p class="small muted">Lesson vocabulary and examples from the supplied document · pp. ${esc((u.source?.pages||[]).join('–'))}</p>${pdf}</div><div class="two-col"><article><div class="lesson-list">${u.lessons.map((l,i)=>`<section class="lesson-section" id="lesson-${i}"><div><h2>${esc(l.title)}</h2><p>${esc(l.body)}</p>${l.examples.length?`<div class="examples">${l.examples.map(e=>`<p>${esc(e)}</p>`).join('')}</div>`:''}<div class="lesson-terms">${(l.terms||[]).map(term=>u.vocabulary.find(v=>v.term===term)).filter(Boolean).map(v=>wordCard(u,v)).join('')}</div></div></section>`).join('')}</div><section class="panel"><h3>Now try the document’s exercises.</h3><p class="small muted">The Practice tab has the original tasks, word banks and an expandable lesson reference.</p><div class="settings-actions"><button class="button secondary" data-lesson-read="${u.id}">${progress.lessons[u.id]?'✓ Lesson marked as read':'Mark lesson as read'}</button><a class="button" href="${unitURL(u,'practice')}">Practise this unit →</a></div></section></article><aside class="panel sticky lesson-outline"><span class="eyebrow">IN THIS LESSON</span><ol class="lesson-outline">${u.lessons.map((l,i)=>`<li><a href="#lesson-${i}" data-scroll="lesson-${i}">${String(i+1).padStart(2,'0')} &nbsp; ${esc(l.title)}</a></li>`).join('')}</ol><a class="text-button" href="${unitURL(u,'practice')}">Go to practice →</a></aside></div>${source(u)}`;
}
function wordCard(u,v){const key=wordKey(u,v);return `<article class="word-card"><div class="word-head"><h3>${esc(v.term)}</h3><div class="word-actions"><button class="icon-button ${saved(u,v)?'saved':''}" data-save="${esc(key)}" aria-pressed="${saved(u,v)}" aria-label="${saved(u,v)?'Unsave':'Save'} ${esc(v.term)}">${saved(u,v)?'★':'☆'}</button><button class="icon-button" data-speak="${esc(v.term)}" aria-label="Pronounce ${esc(v.term)}">♪</button></div></div><p>${esc(v.definition)}</p><span class="example-label">${v.exampleSource?.startsWith('Supplied document')?'BOOK EXAMPLE':'EXAMPLE'}${v.sourcePage?' · P. '+v.sourcePage:''}</span><blockquote>${esc(v.example)}</blockquote>${v.note?`<div class="word-note">${esc(v.note)}</div>`:''}</article>`;}
function renderVocabulary(u){
 $('#unit-content').innerHTML=`<div class="toolbar"><label class="sr-only" for="vocab-search">Search this unit’s vocabulary</label><input class="input search" type="search" id="vocab-search" placeholder="Search words, meanings or examples…"><div class="tab-tools"><button class="button ${vocabMode==='cards'?'':'secondary'} small" data-vocab-mode="cards" aria-pressed="${vocabMode==='cards'}">Word bank</button><button class="button ${vocabMode==='flash'?'':'secondary'} small" data-vocab-mode="flash" aria-pressed="${vocabMode==='flash'}">Flashcards</button></div></div><div id="vocab-content"></div>`;
 renderWordList(u,'');
 $('#vocab-search').addEventListener('input',event=>{flash={index:0,flipped:false};renderWordList(u,event.target.value);});
}
function filteredWords(u,text){const query=text.toLowerCase().trim();return u.vocabulary.filter(v=>[v.term,v.definition,v.example,v.note||''].join(' ').toLowerCase().includes(query));}
function renderWordList(u,text){
 const words=filteredWords(u,text);const el=$('#vocab-content');
 if(!words.length){el.innerHTML=empty('No words found','Try a shorter word or a different spelling.','');return;}
 if(vocabMode==='flash'){
  flash.index=((flash.index%words.length)+words.length)%words.length;const v=words[flash.index];
  el.innerHTML=`<div class="flash-wrap"><p class="small muted">${flash.index+1} of ${words.length} · Select the card to ${flash.flipped?'see the word':'reveal the meaning'}</p><button class="flashcard" data-flip aria-label="${flash.flipped?'Show word':'Reveal meaning'}"><span class="eyebrow">${flash.flipped?'MEANING & CONTEXT':'DO YOU REMEMBER?'}</span>${flash.flipped?`<span class="definition">${esc(v.definition)}</span><span class="example">“${esc(v.example)}”</span><span class="small muted">${esc(v.note||'')}</span>`:`<span class="term">${esc(v.term)}</span><span class="small muted">Take a moment. What does it mean?</span>`}</button><div class="flash-controls"><button class="button secondary small" data-flash-step="-1">← Previous</button><button class="text-button" data-save="${esc(wordKey(u,v))}">${saved(u,v)?'★ Saved':'☆ Save word'}</button><button class="button secondary small" data-flash-step="1">Next →</button></div></div>`;
 }else el.innerHTML=`<p class="small muted">${words.length} words & phrases · Save the ones you want to revisit.</p><div class="vocab-grid">${words.map(v=>wordCard(u,v)).join('')}</div>`;
}
function renderSaved(){
 setTitle('Saved vocabulary');const rows=units.flatMap(u=>(u.vocabulary||[]).filter(v=>saved(u,v)).map(v=>({u,v})));
 main.innerHTML=heading('Words worth keeping.',`${rows.length} saved words and phrases. Revisit them whenever you like.`)+`${rows.length?`<div class="vocab-grid">${rows.map(({u,v})=>`<div><a class="eyebrow" href="${unitURL(u,'vocabulary')}">UNIT ${u.number}</a>${wordCard(u,v)}</div>`).join('')}</div>`:empty('Start your own word collection','Select the star beside any word to keep it here. Then try using it in a sentence about your day.','<a class="button" href="#/units">Find your first word →</a>','☆')}`;
}
function renderReview(){
 setTitle('Review mistakes');const count=units.reduce((n,u)=>n+missCount(u),0);
 main.innerHTML=heading('A second look makes it stick.',`${count} questions to revisit. A correct retry clears a question from this list.`)+`${count?`<div class="panel">${units.filter(u=>missCount(u)).map(u=>`<div class="review-row"><div><span class="eyebrow">UNIT ${u.number}</span><h3>${esc(u.shortTitle)}</h3><p>${missCount(u)} questions to revisit</p></div><a class="button secondary" href="${unitURL(u,'practice')}?mode=mistakes">Review this unit →</a></div>`).join('')}</div><p class="small muted">This list uses your latest answer for each question, rather than counting every attempt.</p>`:empty('A fresh page','Mistakes are part of learning. When you miss a practice question, it will appear here for another try.','<a class="button" href="#/units">Practise a little →</a>','↺')}`;
}
function startPractice(u,groupId=null,mode=null){
 const params=new URLSearchParams(location.hash.split('?')[1]||'');mode=mode||params.get('mode')||'all';
 const g=u.exerciseGroups.find(g=>g.id===groupId)||u.exerciseGroups[0];
 let questions=mode==='mistakes'?mistakes(u):allQuestions(u).filter(q=>q.group.id===g.id);
 run={unit:u,group:g.id,mode,questions,index:0,checked:{},drafts:{},finished:false};
 $('#unit-content').innerHTML=`<div class="practice-layout"><div id="practice-main"></div><aside class="panel exercise-sidebar"><label for="exercise-set">YOUR PRACTICE SET</label><select class="select" id="exercise-set">${mode==='mistakes'?'<option value="mistakes">Your missed questions</option>':''}${u.exerciseGroups.map(g=>`<option value="${g.id}" ${mode!=='mistakes'&&g.id===run.group?'selected':''}>${esc(g.title)} (${g.questions.length})</option>`).join('')}</select><p class="spaced">Use the source passage, word bank and lesson reference whenever you need them. Open-ended tasks use model comparison, not automatic marking.</p><a class="text-button" href="${unitURL(u,'lesson')}">Revisit the lesson →</a><div id="question-jumps" class="question-jumps" aria-label="Jump to a question"></div><div id="practice-reference"></div><hr style="border:0;border-top:1px solid var(--line);margin:20px 0"><p>Written responses ignore capital letters, smart apostrophes and extra spaces. Spelling and word order still matter.</p></aside></div>`;
 $('#exercise-set').addEventListener('change',event=>startPractice(u,event.target.value,event.target.value==='mistakes'?'mistakes':'all'));
 renderQuestion();
}
function rememberDraft(){if(!run||!run.questions[run.index])return;const form=$('#question-form');if(form){const value=new FormData(form).get('answer');if(value!==null)run.drafts[run.questions[run.index].key]=value;}}
function renderQuestion(){
 const box=$('#practice-main');if(!box||!run)return;
 if(!run.questions.length){box.innerHTML=empty('All clear for this unit','There are no missed questions to review. Try another practice set.','<button class="button" data-practice-default>Choose a practice set →</button>','✓');return;}
 if(run.finished){renderResult();return;}
 const entry=run.questions[run.index],{question:q,group:g}=entry,checked=run.checked[entry.key];
 const answer=q.type==='self'?q.modelAnswer:(Array.isArray(q.answer)?q.answer.join(' / '):q.answer);
 const draft=run.drafts[entry.key]??(q.type==='self'?progress.writing[entry.key]:'')??'';
 const value=checked?.value??draft;
 const bank=g.wordBank&&q.type!=='choice'&&!checked?`<details class="bank-box" open><summary>Word bank ${g.bankRequiresChange?'· change the form if needed':''}</summary><p class="small muted">Select a word to put it into your answer. You can then edit it.</p><div class="word-bank">${g.wordBank.map(w=>`<button type="button" data-insert-word="${esc(w)}">${esc(w)}</button>`).join('')}</div></details>`:'';
 box.innerHTML=`${g.passage?`<details class="reading" open><summary>${esc(g.passageTitle||'Read the source passage')}</summary><p class="source-passage">${esc(g.passage)}</p></details>`:''}<p class="group-note">${esc(g.instruction)}</p>${g.support?`<div class="note">${esc(g.support)}</div>`:''}<section class="question-card"><div class="question-meta"><span>Book exercise ${esc(g.title.split(' · ')[0].replace('Exercise ',''))} · item ${esc(q.bookNumber||run.index+1)}</span><span>${run.index+1} / ${run.questions.length}</span></div><div class="progress-track" role="img" aria-label="Question ${run.index+1} of ${run.questions.length}"><span style="width:${run.index/run.questions.length*100}%"></span></div><form id="question-form"><h2 id="question-prompt">${esc(q.prompt)}</h2>${q.type==='choice'?`<fieldset class="options ${q.options.length>6?'many-options':''}" aria-labelledby="question-prompt" style="border:0;margin:0;padding:0">${q.options.map((option,i)=>`<label class="option ${checked?(accepts(q,option)?'correct':checked.value===option?'incorrect':''):''}"><input type="radio" name="answer" value="${esc(option)}" ${value===option?'checked':''} ${checked?'disabled':''} required><span>${esc(option)}</span></label>`).join('')}</fieldset>`:q.type==='self'?`<label class="small muted" for="written-answer">Your own response · compare with a suggested model</label><textarea class="input question-text" id="written-answer" name="answer" rows="3" required maxlength="2000" ${checked?'disabled':''}>${esc(value)}</textarea>`:`<label class="sr-only" for="written-answer">Your answer</label><input class="input question-text" id="written-answer" name="answer" type="text" placeholder="Type the missing word or corrected expression…" autocomplete="off" spellcheck="false" required maxlength="300" value="${esc(value)}" ${checked?'disabled':''}>`}
 ${bank}
 ${checked?`<div class="feedback ${q.type==='self'?'model':checked.correct?'':'wrong'}" role="status"><strong>${q.type==='self'?'Compare with this model — your wording can differ.':checked.correct?'✓ That’s right.':'A useful one to revisit.'}</strong>${checked.correct&&q.type!=='self'?'':`<p>${q.type==='self'?'Suggested model':'Answer'}: <strong style="display:inline">${esc(answer)}</strong></p>`}<p>${esc(q.explanation)}</p>${q.type==='self'?'<p class="small">This response is saved as writing practice. It is not included in your automatic score.</p>':''}</div>`:'<div id="answer-feedback" aria-live="polite"></div>'}
 <div class="question-footer"><div>${run.index>0?'<button class="text-button" type="button" data-question-prev>← Previous</button>':''}${!checked?'<button class="text-button" type="button" data-hint>Show hint</button>':''}</div>${checked?`<button class="button" type="button" data-question-next>${run.index===run.questions.length-1?'See your results':'Next question'} →</button>`:`<button class="button" type="submit">${q.type==='self'?'Compare with a model':'Check answer'} →</button>`}</div>${!checked?'<button class="text-button skip-question" type="button" data-question-skip>Skip for now →</button>':''}</form></section>`;
 $('#question-jumps').innerHTML=run.questions.map((e,i)=>`<button class="${i===run.index?'current ':''}${run.checked[e.key]?(run.checked[e.key].correct?'done':'missed'):''}" data-question-jump="${i}" aria-label="Question ${i+1}${run.checked[e.key]?', reviewed':''}" ${i===run.index?'aria-current="step"':''}>${i+1}</button>`).join('');
 const refs=q.referenceTerms?.length?run.unit.vocabulary.filter(v=>q.referenceTerms.includes(v.term)):run.unit.vocabulary;
 $('#practice-reference').innerHTML=`<details class="practice-help"><summary>Lesson reference <span aria-hidden="true">＋</span></summary><p class="small muted">Keep your question open while checking the document’s meanings and examples.</p>${(refs.length?refs:run.unit.vocabulary).map(v=>`<div class="reference-word"><strong>${esc(v.term)}</strong><p>${esc(v.definition)}</p><blockquote>${esc(v.example)}</blockquote></div>`).join('')}</details>`;
 if(!checked)$('#question-form').addEventListener('submit',event=>{
  event.preventDefault();const value=new FormData(event.currentTarget).get('answer')?.trim();if(!value){announce('Choose or type an answer first.');return;}
  const result={value,correct:q.type==='self'?true:accepts(q,value),date:new Date().toISOString(),selfReview:q.type==='self'};run.checked[entry.key]=result;
  if(q.type==='self')progress.writing[entry.key]=value;else progress.answers[entry.key]=result;
  save();renderQuestion();$('[data-question-next]')?.focus();
 });
}
function renderResult(){
 const auto=run.questions.filter(e=>e.question.type!=='self'),correct=auto.filter(e=>run.checked[e.key]?.correct).length,answered=auto.filter(e=>run.checked[e.key]).length;
 const missed=auto.filter(e=>run.checked[e.key]?.correct===false),skipped=run.questions.filter(e=>!run.checked[e.key]),selfCount=run.questions.filter(e=>e.question.type==='self'&&run.checked[e.key]).length;
 $('#practice-main').innerHTML=`<section class="empty-state" style="margin:0;max-width:none"><div class="result-circle">${auto.length?Math.round(correct/auto.length*100)+'%':'✓'}</div><span class="eyebrow">${skipped.length?'ROUND SUMMARY':'PRACTICE COMPLETE'}</span><h2>${auto.length?'A little more confident.':'Good words, in your own voice.'}</h2><p>${auto.length?`${correct} of ${auto.length} automatically marked questions correct (${answered} answered). `:''}${selfCount?`${selfCount} open responses compared with models. `:''}${skipped.length?`${skipped.length} questions skipped; they are not counted as correct.`:'Your work is saved in this browser.'}</p><div class="result-actions"><button class="button" data-retry-set>Try this set again</button>${missed.length?'<button class="button secondary" data-retry-missed>Retry missed questions</button>':''}${skipped.length?'<button class="button secondary" data-retry-skipped>Answer skipped questions</button>':''}<a class="button secondary" href="${unitURL(run.unit,'lesson')}">Revisit lesson</a></div></section>${missed.length?`<div class="panel spaced"><h3>Keep these in mind</h3>${missed.map(e=>`<div class="setting-item"><p class="answer-line">${esc(e.question.prompt)}</p><p class="answer-line">Your answer: ${esc(run.checked[e.key].value)}</p><p class="answer-line"><strong>${esc(Array.isArray(e.question.answer)?e.question.answer.join(' / '):e.question.answer)}</strong></p><p class="small muted">${esc(e.question.explanation)}</p></div>`).join('')}</div>`:''}`;
}
function audioChoices(){return [...new Set([...audioLibrary.tracks.map(t=>t.file),...loadedFiles.keys()])];}
function selectedTrack(u){return typeof progress.tracks[u.id]==='string'?progress.tracks[u.id]:(u.audio?.track||'');}
function renderListening(u){
 const track=selectedTrack(u),choices=audioChoices();if(track&&!choices.includes(track))choices.push(track);
 $('#unit-content').innerHTML=`<section class="audio-panel"><span class="eyebrow" style="color:#dcb49b">LISTEN CLOSELY</span><h2 class="spaced">A feel for spoken English.</h2><p>Choose the recording that belongs to this unit. Use the player to pause, replay and notice the words in context.</p><div class="audio-controls"><label for="audio-track">Track for Unit ${u.number}<select id="audio-track" class="select"><option value="">Choose a recording…</option>${choices.map(file=>`<option value="${esc(file)}" ${file===track?'selected':''}>${esc(file)}${loadedFiles.has(file)?' · local preview':''}</option>`).join('')}</select></label><label class="button secondary file-picker">Preview local MP3s<input type="file" id="local-audio" accept="audio/*,.mp3,.m4a,.wav,.ogg" multiple aria-label="Select local audio files for preview"></label></div><div id="audio-slot"></div><p class="audio-status" id="audio-status" aria-live="polite">${track?'Loading the selected track…':'Select a track to begin. Recordings are not included in this app download.'}</p></section>
 <div class="note warning">${esc(u.audio?.note||'Track-to-unit mappings have not been verified.')} ${u.audio?.suggestedTrack?`<br>Suggested filename: <strong>${esc(u.audio.suggestedTrack)}</strong>. <button class="text-button" data-suggest-track="${esc(u.audio.suggestedTrack)}">Select this track</button>`:''}</div>
 <details class="reading"><summary>Where should I upload the MP3s on GitHub?</summary><p style="font-family:var(--sans);font-size:13px">Create an <code>audio/</code> folder beside <code>index.html</code>. Upload files with their exact names, for example <code>audio/AV-001-2.mp3</code>. GitHub Pages will serve them with the app. Selecting a local file only previews it in this browser; it does not upload it. Local files must be selected again after reopening the page.</p></details>
 ${(u.audio?.activities||[]).map(a=>listeningActivity(u,a)).join('')}
 <section class="panel"><h2>Your listening notebook</h2><label for="listening-notes" class="small muted">New words, useful phrases, or a short summary in your own words.</label><textarea id="listening-notes" class="input spaced" rows="5" style="width:100%;resize:vertical" maxlength="12000" placeholder="What did you notice?">${esc(typeof progress.listening[`${u.id}:notes`]==='string'?progress.listening[`${u.id}:notes`]:'')}</textarea><p class="small muted">Saved automatically in this browser. Export progress in Settings to keep a backup.</p></section>`;
 $('#audio-track').addEventListener('change',event=>{progress.tracks[u.id]=event.target.value;save();mountAudio(u);});
 $('#local-audio').addEventListener('change',event=>{
  const files=[...event.target.files];for(const file of files){if(loadedFiles.has(file.name))URL.revokeObjectURL(loadedFiles.get(file.name));loadedFiles.set(file.name,URL.createObjectURL(file));}
  if(files.length){progress.tracks[u.id]=files[0].name;save();renderListening(u);announce(`${files.length} file${files.length===1?'':'s'} ready for local preview.`);}
 });
 $('#listening-notes').addEventListener('input',event=>{progress.listening[`${u.id}:notes`]=event.target.value;save();});
 $$('.listen-select').forEach(el=>el.addEventListener('change',event=>{progress.listening[event.target.dataset.key]=event.target.value;save();const status=$(`#status-${event.target.dataset.activity}`);if(status)status.textContent='Answer saved. You can change it after listening again.';}));
 mountAudio(u);
}
function listeningActivity(u,a){
 const hasKey=Array.isArray(a.answerKey)&&a.answerKey.length===a.extracts;
 return `<section class="panel"><span class="eyebrow">LISTENING WORKBOOK</span><h2 class="spaced">${esc(a.title)}</h2><p class="small muted">${esc(a.instruction)}</p>${hasKey?'':`<div class="note">Self-study answer sheet. No verified answer key is available, so these responses are saved without a score.</div>`}${Array.from({length:a.extracts},(_,i)=>{const key=`${u.id}:${a.id}:${i}`;return `<div class="listen-row"><label for="listen-${a.id}-${i}">Extract ${i+1}</label><select class="select listen-select" id="listen-${a.id}-${i}" data-key="${key}" data-activity="${a.id}"><option value="">Choose an answer…</option>${a.options.map(o=>`<option value="${esc(o)}" ${progress.listening[key]===o?'selected':''}>${esc(o)}</option>`).join('')}</select></div>`;}).join('')}<p class="listen-status" id="status-${a.id}" aria-live="polite">Responses save automatically.</p>${hasKey?`<button class="button secondary" data-check-listening="${a.id}">Check listening answers</button>`:''}</section>`;
}
function trackPath(track){
 if(track.includes('/'))return safeRelativePath(track)?track:null;
 return safeRelativePath(track)&&safeRelativePath(audioLibrary.basePath+track)?audioLibrary.basePath+track:null;
}
function mountAudio(u){
 const slot=$('#audio-slot'),status=$('#audio-status');if(!slot)return;slot.innerHTML='';currentAudioURL=null;const track=selectedTrack(u);if(!track){status.textContent='Select a track to begin. Recordings are not included in this app download.';return;}
 const path=loadedFiles.get(track)||trackPath(track);if(!path){status.textContent='This track path is invalid. Use a relative path inside your repository.';return;}
 const audio=document.createElement('audio');audio.controls=true;audio.preload='metadata';audio.setAttribute('aria-label',`Audio: ${track}`);audio.src=path;currentAudioURL=path;
 audio.addEventListener('loadedmetadata',()=>{status.textContent=`Ready · ${track}${loadedFiles.has(track)?' · local preview':''}. Use the player menu to adjust speed if your browser supports it.`;});
 audio.addEventListener('error',()=>{status.textContent=`Cannot play ${track}. Upload it to ${trackPath(track)||'audio/'} with this exact filename, or select the local file for preview.`;});
 slot.append(audio);status.textContent=loadedFiles.has(track)?`Local preview: ${track}. This file has not been uploaded.`:`Repository path: ${path}. If the file is missing, upload it to this path on GitHub.`;
}
function settings(){
 setTitle('Progress & settings');const s=totalStats();main.innerHTML=heading('Your learning, your pace.','Keep your progress safe and make this space your own.')+`<div class="two-col"><section class="panel"><h2>Progress stays with your browser.</h2><p class="small muted">Your answers, saved words, lesson checkmarks, audio selections and listening notes are stored on this device. There is no account or server database. Export a backup before switching devices or clearing browser data.</p><div class="settings-actions"><button class="button" data-export>Export progress ↓</button><label class="button secondary file-picker">Import progress<input type="file" id="import-progress" accept="application/json,.json" aria-label="Import progress backup"></label></div><div class="setting-item"><h3>A fresh start</h3><p>Reset all written answers, bookmarks, listening notes and track choices saved in this browser. You can export a backup first.</p><button class="button ghost small" data-reset>Reset progress</button></div><div class="setting-item"><h3>Audio folder on GitHub</h3><p>Place recordings in <code>audio/</code> next to <code>index.html</code>. Preserve exact names such as <code>AV-001-2.mp3</code>. The track list is in <code>data/audio-library.json</code>. Track assignments you make here stay in this browser. For a shared default, set <code>audio.track</code> to <code>audio/AV-001-2.mp3</code> in a unit JSON.</p></div><div class="setting-item"><h3>Adding another unit</h3><p>Copy <code>unit-template.json</code> to <code>data/unit-6.json</code>, fill it from the new source document, and add its ID and filename to <code>data/units.json</code>. Its title is already in the course directory. Optional command <code>npm run index</code> generates counts and metadata. The app discovers units from that index. The download includes a step-by-step README and a content validator.</p></div></section><aside><section class="panel"><span class="eyebrow">YOUR COLLECTION</span><h2 class="spaced">${s.attempted} questions tried.</h2><p class="small muted">${s.correct} currently correct<br>${progress.saved.length} saved words<br>${units.filter(u=>progress.lessons[u.id]).length} lessons marked as read</p></section><a class="button secondary" href="#/">Back to your workspace →</a></aside></div>`;
 $('#import-progress').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{if(file.size>5*1024*1024)throw Error('This file is too large for a progress backup.');const raw=JSON.parse(await file.text());if(raw.version!==1||!raw.answers||!Array.isArray(raw.saved))throw Error('Choose an English Atelier version 1 progress backup.');
   if(!confirm('Replace the progress in this browser with this backup?'))return;progress=cleanProgress(raw);save();settings();announce('Progress imported. Welcome back.');
  }catch(error){announce(`Import failed: ${error.message}`);}
 });
}
function searchResults(query){
 setTitle('Search');const q=query.trim().toLowerCase();const foundUnits=q?catalog.filter(u=>matchesCatalog(u,q)):[];const words=q?units.flatMap(u=>filteredWords(u,q).map(v=>({u,v}))):[];
 main.innerHTML=heading(query?`Results for “${query}”`:'Find a word or a unit.',query?`${foundUnits.length} units and ${words.length} vocabulary matches.`:'Use the search field above to explore the course.')+`${foundUnits.length?`<div class="section-head"><h2>Units</h2></div><div class="catalog-list">${foundUnits.map(catalogRow).join('')}</div>`:''}${words.length?`<div class="section-head spaced"><h2>Vocabulary</h2></div><div class="vocab-grid">${words.map(({u,v})=>`<div><a class="eyebrow" href="${unitURL(u,'vocabulary')}">UNIT ${u.number}</a>${wordCard(u,v)}</div>`).join('')}</div>`:''}${q&&!foundUnits.length&&!words.length?empty('No matches yet','Try a shorter word, a meaning or a topic.',''):''}`;
}
async function route(){
 if(!units.length)return;const token=++routeVersion;
 $$('audio').forEach(a=>a.pause());
 const hash=location.hash.slice(1)||'/',[path,search='']=hash.split('?');let parts;
 try{parts=path.split('/').filter(Boolean).map(decodeURIComponent);}catch{parts=[];}
 closeSwitcher();
 try{
  if(parts[0]==='unit'){
   const record=catalog.find(c=>c.id===parts[1]),entry=units.find(u=>u.id===parts[1]);
   if(entry){if(!entry.exerciseGroups)main.innerHTML='<div class="loading"><h2>Opening this unit…</h2></div>';const u=await ensureUnit(entry.id);if(token!==routeVersion)return;const tab=['overview','lesson','vocabulary','practice','listening'].includes(parts[2])?parts[2]:'overview';renderUnit(u,tab);}
   else if(record)showUpcoming(record);
   else{setTitle('Unit not found');main.innerHTML=empty('That unit is not here yet','Choose a unit from the course directory to keep learning.');}
  }else if(parts[0]==='units')courses();
  else if(parts[0]==='saved'||parts[0]==='review'){
   const needed=units.filter(u=>parts[0]==='saved'?progress.saved.some(k=>k.startsWith(u.id+':')):missCount(u)>0);
   await Promise.all(needed.map(u=>ensureUnit(u.id)));if(token!==routeVersion)return;
   if(parts[0]==='saved')renderSaved();else renderReview();
  }else if(parts[0]==='settings')settings();
  else if(parts[0]==='search'){
   main.innerHTML='<div class="loading"><h2>Looking through the available lessons…</h2></div>';
   await Promise.all(units.map(u=>ensureUnit(u.id)));if(token!==routeVersion)return;searchResults(new URLSearchParams(search).get('q')||'');
  }else{await ensureUnit(units.find(u=>u.id===progress.lastUnit)?.id||units[0].id);if(token!==routeVersion)return;dashboard();}
 }catch(error){if(token!==routeVersion)return;main.innerHTML=empty('This unit could not be opened',error.message,'<button class="button" data-retry-route>Try again</button><a class="button secondary" href="#/units">Course directory</a>');}
 updateNav();window.scrollTo({top:0,behavior:'instant'});main.focus({preventScroll:true});
}
function currentUnit(){const id=location.hash.split('/')[2];return units.find(u=>u.id===id);}
main.addEventListener('click',event=>{
 const button=event.target.closest('button,a');if(!button)return;
 if(button.hasAttribute('data-open-switcher')){event.preventDefault();openSwitcher();return;}
 if(button.hasAttribute('data-retry-route')){route();return;}
 if(button.hasAttribute('data-clear-catalog')){catalogState={query:'',range:'all',status:'all',page:1};courses();return;}
 if(button.hasAttribute('data-catalog-page')){catalogState.page+=Number(button.dataset.catalogPage);renderCatalogResults();$('#catalog-results')?.scrollIntoView({behavior:'smooth'});return;}
 if(button.hasAttribute('data-insert-word')){const input=$('#written-answer');if(input){input.value=button.dataset.insertWord;input.focus();rememberDraft();}return;}
 if(button.hasAttribute('data-question-jump')&&run){rememberDraft();run.index=Number(button.dataset.questionJump);renderQuestion();return;}
 if(button.hasAttribute('data-question-skip')&&run){rememberDraft();if(run.index===run.questions.length-1){run.finished=true;renderResult();}else{run.index++;renderQuestion();}return;}
 if(button.hasAttribute('data-retry-skipped')&&run){run.questions=run.questions.filter(q=>!run.checked[q.key]);run.index=0;run.checked={};run.finished=false;renderQuestion();return;}
 if(button.hasAttribute('data-scroll')){event.preventDefault();document.getElementById(button.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'});return;}
 if(button.hasAttribute('data-save')){
  const key=button.dataset.save;const exists=progress.saved.includes(key);progress.saved=exists?progress.saved.filter(x=>x!==key):[...progress.saved,key];save();
  $$('[data-save]').filter(b=>b.dataset.save===key).forEach(b=>{const icon=b.classList.contains('icon-button');b.textContent=icon?(exists?'☆':'★'):(exists?'☆ Save this word':'★ Saved to your words');b.classList.toggle('saved',!exists);b.setAttribute('aria-pressed',String(!exists));if(icon)b.setAttribute('aria-label',`${exists?'Save':'Unsave'} ${key.split(':').slice(1).join(':')}`);});
  if(location.hash.startsWith('#/saved'))renderSaved();announce(exists?'Word removed from your collection.':'Word saved. Find it in Saved vocabulary.');return;
 }
 if(button.hasAttribute('data-speak')){
  if(!('speechSynthesis'in window)){announce('Pronunciation is unavailable in this browser.');return;}
  speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(button.dataset.speak);utterance.lang='en-GB';utterance.rate=.85;utterance.onerror=()=>announce('Pronunciation is unavailable. Try another browser or check your device’s voices.');speechSynthesis.speak(utterance);return;
 }
 if(button.hasAttribute('data-course-filter')){courses(button.dataset.courseFilter);return;}
 const u=currentUnit();
 if(button.hasAttribute('data-lesson-read')&&u){progress.lessons[u.id]=true;save();button.textContent='✓ Lesson marked as read';announce('Lesson marked as read. Ready for a little practice?');return;}
 if(button.hasAttribute('data-vocab-mode')&&u){vocabMode=button.dataset.vocabMode;flash={index:0,flipped:false};renderVocabulary(u);return;}
 if(button.hasAttribute('data-flip')&&u){flash.flipped=!flash.flipped;renderWordList(u,$('#vocab-search').value);$('.flashcard')?.focus();return;}
 if(button.hasAttribute('data-flash-step')&&u){flash.index+=Number(button.dataset.flashStep);flash.flipped=false;renderWordList(u,$('#vocab-search').value);return;}
 if(button.hasAttribute('data-practice-default')&&u){startPractice(u);return;}
 if(button.hasAttribute('data-question-next')&&run){if(run.index===run.questions.length-1){run.finished=true;renderResult();}else{run.index++;renderQuestion();}$('#practice-main')?.scrollIntoView({behavior:'smooth',block:'start'});$('#question-prompt')?.setAttribute('tabindex','-1');$('#question-prompt')?.focus({preventScroll:true});return;}
 if(button.hasAttribute('data-question-prev')&&run){rememberDraft();run.index--;renderQuestion();return;}
 if(button.hasAttribute('data-hint')&&run){$('#answer-feedback').innerHTML=`<div class="hint">${esc(run.questions[run.index].question.hint)}</div>`;return;}
 if(button.hasAttribute('data-retry-set')&&run){const {unit,group,mode}=run;startPractice(unit,group,mode);return;}
 if(button.hasAttribute('data-retry-missed')&&run){run.questions=run.questions.filter(q=>q.question.type!=='self'&&run.checked[q.key]?.correct===false);run.index=0;run.checked={};run.finished=false;renderQuestion();return;}
 if(button.hasAttribute('data-suggest-track')&&u){progress.tracks[u.id]=button.dataset.suggestTrack;save();renderListening(u);return;}
 if(button.hasAttribute('data-check-listening')&&u){
  const a=u.audio.activities.find(a=>a.id===button.dataset.checkListening);if(!a?.answerKey)return;
  const answers=Array.from({length:a.extracts},(_,i)=>progress.listening[`${u.id}:${a.id}:${i}`]);if(answers.some(v=>!v)){announce('Choose an answer for every extract first.');return;}
  const n=answers.filter((v,i)=>v===a.answerKey[i]).length;$(`#status-${a.id}`).textContent=`${n} of ${a.extracts} correct. Answers: ${a.answerKey.join(', ')}.`;return;
 }
 if(button.hasAttribute('data-export')){download('english-atelier-progress.json',JSON.stringify({...progress,exportedAt:new Date().toISOString()},null,2));announce('Progress backup downloaded.');return;}
 if(button.hasAttribute('data-reset')){if(confirm('Reset all English Atelier progress in this browser? Export a backup first if you want to keep it.')){progress=cleanProgress(null);save();settings();announce('Your learning space has been reset.');}return;}
});
$$('[data-switcher-trigger]').forEach(button=>button.addEventListener('click',openSwitcher));
$('#close-switcher').addEventListener('click',closeSwitcher);
$('#switcher-query').addEventListener('input',event=>renderSwitcher(event.target.value));
$('#switcher-results').addEventListener('click',event=>{if(event.target.closest('a'))closeSwitcher();});
$('#unit-jump-form').addEventListener('submit',event=>{event.preventDefault();const query=$('#unit-jump').value.trim().toLowerCase().replace(/^unit\s*/,'');const record=catalog.find(c=>unitLabel(c).toLowerCase()===query);if(record){closeSwitcher();location.hash=unitURL(record).slice(1);}else{openSwitcher();$('#switcher-query').value=query;renderSwitcher(query);}});
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openSwitcher();}});
$('#global-search').addEventListener('submit',event=>{event.preventDefault();location.hash=`/search?q=${encodeURIComponent($('#search').value.trim())}`;});
document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){event.preventDefault();$('#search').focus();}});
window.addEventListener('hashchange',route);
window.addEventListener('beforeunload',()=>{for(const url of loadedFiles.values())URL.revokeObjectURL(url);});
async function init(){
 try{
  try{progress=cleanProgress(JSON.parse(localStorage.getItem(KEY)||'null'));}catch{progress=cleanProgress(null);}
  const manifest=await getJSON('data/units.json');if(manifest.schemaVersion!==1||!Array.isArray(manifest.units)||!manifest.units.length)throw Error('The unit index must contain at least one unit.');
  const ids=new Set();for(const entry of manifest.units){if(!entry.id||ids.has(entry.id)||!safeRelativePath(entry.file))throw Error('Invalid or duplicate unit index entry.');ids.add(entry.id);}
  const catalogPath=manifest.catalog||'catalog.json';if(!safeRelativePath(catalogPath))throw Error('Invalid catalog path');
  const directory=await getJSON(`data/${catalogPath}`);if(!Array.isArray(directory.units)||new Set(directory.units.map(c=>c.id)).size!==directory.units.length)throw Error('Invalid course catalog');
  catalog=directory.units;targetUnitCount=directory.targetUnitCount||116;
  units=manifest.units.map(entry=>{const c=catalog.find(c=>c.id===entry.id);return {description:'Open this unit to load its lesson and exercises.',shortTitle:c?.title||entry.id,questionKeys:[],...c,...entry};}).sort((a,b)=>(a.order||a.number)-(b.order||b.number));

  loadUnitData=createUnitLoader(units,getJSON);
  try{audioLibrary=await getJSON('data/audio-library.json');if(!Array.isArray(audioLibrary.tracks)||!safeRelativePath(audioLibrary.basePath))throw Error('Invalid audio library');}catch{audioLibrary={basePath:'audio/',tracks:[]};announce('Audio index could not load. You can still preview local files.');}
  await route();
 }catch(error){
  setTitle('Let’s get the app running');main.innerHTML=`<section class="panel"><span class="eyebrow">SETUP HELP</span><h1 class="spaced">Your learning space is almost ready.</h1><p>This app loads unit JSON files, so it needs to run through a web server such as GitHub Pages.</p><ol><li>Upload the extracted app files to your GitHub repository, with <code>index.html</code> at the root.</li><li>Open Settings → Pages. Deploy from your branch and select <code>/ (root)</code>.</li><li>Visit the Pages website URL after GitHub finishes publishing.</li></ol><p>For a local preview, run <code>python -m http.server 8000</code> in the app folder and open <code>http://localhost:8000</code>.</p><p class="error-message">${esc(error.message)}</p><button class="button" data-reload>Try again</button></section>`;
  $('[data-reload]').addEventListener('click',()=>location.reload());
 }
}
init();

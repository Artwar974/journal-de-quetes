(() => {
  'use strict';

  const KEY = 'jdq_v1';
  const DAYS = ['L', 'Ma', 'Me', 'J', 'V', 'S', 'D'];
  const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const ICONS = ['⚔️','✨','💼','🏃','🩺','🧹','📚','🎸','🎨','🎮','🍳','🧘','☕','🌙','💊','🐕','✍️','🎧','🎤','💪','🛏️','📞','🎬','🎂','✈️','🌱'];
  const EVENT_ICONS = ['📅','🎤','🎸','🎬','🩺','💉','🍽️','☕','🎂','✈️','🎓','🏥','🎾','👥','📷'];
  const TYPES = { principale:{label:'Principale',base:50}, secondaire:{label:'Secondaire',base:25}, evenement:{label:'Événement',base:40} };
  const QUESTIONS = [
    'Quelle petite victoire veux-tu garder de cette journée ?',
    'Qu’est-ce qui a été plus facile que prévu aujourd’hui ?',
    'De quoi as-tu besoin pour rendre demain plus doux ?',
    'Quel moment t’a donné de l’énergie aujourd’hui ?',
    'Qu’as-tu fait aujourd’hui dont tu peux être fier·e ?',
    'Quelle pensée aimerais-tu déposer ici avant de dormir ?',
    'Quel petit pas te rapprocherait d’un grand rêve cette semaine ?',
    'Qu’est-ce qui t’a demandé du courage aujourd’hui ?'
  ];
  const META = {
    quests:['Quêtes','Tes chemins du jour, entre priorités et élans secondaires.'],
    agenda:['Agenda','Calendrier, routines de la semaine et événements.'],
    history:['Historique','Tes victoires et tes abandons, jour après jour.'],
    diary:['Carnet','Un espace calme pour déposer ta journée.']
  };

  const dialog = document.querySelector('#journalDialog');
  const openButton = document.querySelector('#journalOpen');
  const closeButton = document.querySelector('#journalClose');
  const content = document.querySelector('#journalContent');
  const tabs = [...document.querySelectorAll('[data-journal-tab]')];
  if (!dialog || !openButton || !closeButton || !content || !tabs.length) return;

  const fields = {
    level:document.querySelector('#journalLevel'), mood:document.querySelector('#journalMood'),
    xpFill:document.querySelector('#journalXpFill'), xpLabel:document.querySelector('#journalXpLabel'),
    streak:document.querySelector('#journalPotion'), total:document.querySelector('#journalCrystal'),
    coins:document.querySelector('#journalCoins'), best:document.querySelector('#journalGifts')
  };
  const params = new URLSearchParams(location.search);
  let activeTab = META[params.get('journalTab')] ? params.get('journalTab') : 'quests';
  let questPath = 'principale', selectedDate = today(), calendarDate = new Date(), historyPath = 'done', diaryDate = today(), weekOpen = true;
  let timerId = 0, saveTimer = 0;

  const modalLayer = node('div','journal-modal-layer'); modalLayer.hidden = true;
  const toastNode = node('div','journal-toast'); toastNode.hidden = true;
  const fab = node('button','journal-fab','+'); fab.type = 'button'; fab.setAttribute('aria-label','Créer');
  dialog.querySelector('.journal-layout').append(fab,modalLayer,toastNode);

  function uid(){ return Math.random().toString(36).slice(2,10); }
  function pad(v){ return String(v).padStart(2,'0'); }
  function iso(date=new Date()){ return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`; }
  function today(){ return iso(new Date()); }
  function fromIso(value){ const [y,m,d]=String(value||'').split('-').map(Number); return y&&m&&d?new Date(y,m-1,d,12):new Date(); }
  function addDays(value,amount){ const d=fromIso(value); d.setDate(d.getDate()+amount); return iso(d); }
  function dow(date){ return (date.getDay()+6)%7; }
  function monday(date){ const d=new Date(date); d.setDate(d.getDate()-dow(d)); return d; }
  function formatDate(value,options={weekday:'long',day:'numeric',month:'long'}){ return new Intl.DateTimeFormat('fr-FR',options).format(fromIso(value)); }
  function esc(value){ return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function node(tag,className='',text){ const n=document.createElement(tag); if(className)n.className=className; if(text!==undefined)n.textContent=text; return n; }
  function button(text,className='',handler){ const b=node('button',`journal-button ${className}`,text); b.type='button'; if(handler)b.addEventListener('click',handler); return b; }
  function duration(start,end){
    if(!start||!end)return 0; const [sh,sm]=start.split(':').map(Number),[eh,em]=end.split(':').map(Number);
    if(![sh,sm,eh,em].every(Number.isFinite))return 0; let value=eh*60+em-sh*60-sm; if(value<0)value+=1440; return value;
  }
  function makeQuest(title,type,icon,rec,time='',days=[0,1,2,3,4,5,6]){
    return {id:uid(),title,type,icon,rec,time,fin:'',dur:0,days,steps:[],date:rec==='oneshot'?today():'',doneToday:false,abandonedToday:false};
  }
  function makeEvent(title,icon,date,time,reminder=0){ return {id:uid(),title,type:'evenement',icon,date,time,reminder,notified:false,remFired:false}; }
  function seed(){
    return {xpTotal:0,coins:0,streak:0,best:0,totalDone:0,lastDay:today(),objJour:3,history:{},done:[],abandoned:[],diary:{days:{}},quests:[
      makeQuest('Prendre mon traitement','principale','💊','tous','08:00'),
      makeQuest('Bloc de travail concentré','principale','💼','certains','09:30',[0,1,2,3,4]),
      makeQuest('Séance de sport','principale','🏃','certains','18:00',[0,2,4]),
      makeQuest('Lire 10 pages','secondaire','📚','oneshot'),
      makeQuest('Jouer de la guitare','secondaire','🎸','tous','20:30'),
      makeEvent('Concert — La Cigale','🎤',addDays(today(),3),'20:00',120),
      makeEvent('RDV médecin','🩺',addDays(today(),8),'14:30',1440)
    ]};
  }
  function normalize(raw){
    const s=raw&&typeof raw==='object'?raw:seed();
    if(!Array.isArray(s.quests))s.quests=[]; if(!Array.isArray(s.done))s.done=[]; if(!Array.isArray(s.abandoned))s.abandoned=[];
    if(!s.history||typeof s.history!=='object')s.history={}; if(!s.diary||typeof s.diary!=='object')s.diary={days:{}}; if(!s.diary.days)s.diary.days={};
    s.xpTotal=Number(s.xpTotal)||0; s.coins=Number(s.coins)||0; s.streak=Number(s.streak)||0; s.best=Number(s.best)||0; s.totalDone=Number(s.totalDone)||s.done.length;
    s.objJour=Math.min(9,Math.max(1,Number(s.objJour)||3)); s.lastDay=/^\d{4}-\d{2}-\d{2}$/.test(s.lastDay||'')?s.lastDay:today();
    s.quests.forEach(item=>{
      item.id||=uid(); item.icon||=item.type==='evenement'?'📅':'⚔️';
      if(item.type!=='evenement'){
        item.type=item.type==='secondaire'?'secondaire':'principale'; item.rec||='tous'; item.days=Array.isArray(item.days)?item.days:[0,1,2,3,4,5,6];
        item.steps=Array.isArray(item.steps)?item.steps.map(step=>typeof step==='string'?{t:step,d:false}:step):[]; item.time||=''; item.fin||=''; item.dur=Number(item.dur)||duration(item.time,item.fin);
      }
    }); return s;
  }
  function load(){ try{ const raw=localStorage.getItem(KEY); return normalize(raw?JSON.parse(raw):seed()); }catch{return normalize(seed());} }
  function save(){ try{localStorage.setItem(KEY,JSON.stringify(state));}catch{toast('Sauvegarde impossible sur cet appareil.');} }
  let state=load();

  function rollover(){
    if(state.lastDay===today())return; const previous=state.lastDay;
    const done=state.done.filter(x=>!x.day||x.day===previous), abandoned=state.abandoned.filter(x=>!x.day||x.day===previous);
    if(done.length||abandoned.length)state.history[previous]={done,abandoned};
    const realDone=done.filter(x=>x.type!=='evenement').length; if(realDone>=state.objJour){state.streak++;state.best=Math.max(state.best,state.streak);}else if(!realDone)state.streak=0;
    state.done=state.done.filter(x=>x.day&&x.day!==previous); state.abandoned=state.abandoned.filter(x=>x.day&&x.day!==previous);
    state.quests.forEach(item=>{ if(item.type!=='evenement'){item.doneToday=false;item.abandonedToday=false;item.doneDay='';item.abandonedDay='';item.snoozeDay='';item.steps?.forEach(step=>step.d=false);} });
    const limit=addDays(today(),-60); Object.keys(state.history).forEach(key=>{if(key<limit)delete state.history[key];}); state.lastDay=today(); save();
  }
  rollover();

  function xpForLevel(level){return 120+(level-1)*45;}
  function levelInfo(total){let level=1,current=Math.max(0,Number(total)||0);while(current>=xpForLevel(level)){current-=xpForLevel(level);level++;}return{level,current,next:xpForLevel(level)};}
  function multiplier(){return 1+Math.min(state.streak,10)*.1;}
  function gainFor(item){const base=Number(item.base)||TYPES[item.type]?.base||25,xp=Math.round(base*.9*multiplier());return{xp,gold:Math.round(xp*1.5)};}
  function doneToday(item){return item.doneDay===today()||(item.doneToday&&state.lastDay===today());}
  function abandonedToday(item){return item.abandonedDay===today()||(item.abandonedToday&&state.lastDay===today());}
  function activeOn(item,date){if(item.type==='evenement')return item.date===date;if(item.rec==='oneshot')return(item.date||today())===date;return(item.days||[]).includes(dow(fromIso(date)));}
  function recurrence(item){if(item.rec==='oneshot')return item.date===today()?'Aujourd’hui':formatDate(item.date||today(),{day:'numeric',month:'short'});const days=item.days||[];return days.length===7?'Tous les jours':days.map(d=>DAYS[d]).join(' · ');}
  function completedToday(){return state.done.filter(x=>(x.day===today()||!x.day)&&x.type!=='evenement').length;}

  function updateProfile(){
    const info=levelInfo(state.xpTotal),completed=completedToday(); fields.level.textContent=`NIV. ${info.level}`; fields.mood.textContent=completed>=state.objJour?'Rayonnant':completed?'En route':'Prêt';
    fields.xpLabel.textContent=`${info.current} / ${info.next} XP`; fields.xpFill.style.setProperty('--xp',`${info.current/info.next*100}%`);
    fields.streak.textContent=`🔥 ${state.streak}`; fields.total.textContent=`✓ ${state.totalDone}`; fields.coins.textContent=`🪙 ${state.coins}`; fields.best.textContent=`🏆 ${state.best}`;
  }
  function toast(message){toastNode.textContent=message;toastNode.hidden=false;clearTimeout(toastNode._timer);toastNode._timer=setTimeout(()=>toastNode.hidden=true,2600);}
  function createPanel(){content.replaceChildren();content.scrollTop=0;const root=node('article',`journal-panel journal-panel-${activeTab}`),head=node('header','journal-view-head');head.append(node('h1','journal-section-title',META[activeTab][0]),node('p','journal-section-subtitle',META[activeTab][1]));root.append(head);content.append(root);return root;}
  function rule(parent,text){parent.append(node('div','journal-rule',text));}
  function empty(parent,icon,message){const e=node('div','journal-empty');e.append(node('span','',icon),node('p','',message));parent.append(e);}

  function renderDayStrip(parent){
    const strip=node('div','journal-day-strip'),start=monday(fromIso(selectedDate));
    for(let i=0;i<7;i++){const date=new Date(start);date.setDate(start.getDate()+i);const key=iso(date),b=button('',`journal-day${key===selectedDate?' is-selected':''}${key===today()?' is-today':''}`);b.innerHTML=`<span>${DAYS[i]}</span><strong>${date.getDate()}</strong><i></i>`;b.setAttribute('aria-label',formatDate(key));b.setAttribute('aria-pressed',String(key===selectedDate));if(key===today())b.setAttribute('aria-current','date');b.onclick=()=>{selectedDate=key;render();};strip.append(b);}parent.append(strip);
  }
  function renderQuestCard(item,parent){
    const reward=gainFor(item),card=node('article',`journal-quest-card ${item.type}`),icon=node('span','journal-card-icon',item.icon||'⚔️'),body=node('div','journal-card-body'),line=node('div','journal-card-titleline');
    line.append(node('strong','',item.title||'Sans titre'));if(item.time||item.fin)line.append(node('time','',[item.time,item.fin].filter(Boolean).join(' – ')));
    const chips=node('div','journal-chips');chips.append(node('span','journal-chip kind',TYPES[item.type].label),node('span','journal-chip',recurrence(item)),node('span','journal-chip reward',`+${reward.xp} XP · +${reward.gold} 🪙`));if(item.steps?.length)chips.append(node('span','journal-chip',`☑ ${item.steps.filter(s=>s.d).length}/${item.steps.length}`));
    const actions=node('div','journal-card-actions'),options=node('div','journal-card-options');
    if(selectedDate===today()){if(item.steps?.length)actions.append(button(`☑ Étapes ${item.steps.filter(s=>s.d).length}/${item.steps.length}`,'secondary',()=>openSteps(item)));actions.append(button(item.dur>0?'▶ Accepter':'✓ Valider','primary',()=>item.dur>0?openTimer(item):complete(item)));}
    const more=button('•••','icon journal-more');more.setAttribute('aria-label','Afficher les options');more.setAttribute('aria-expanded','false');more.onclick=()=>{const open=options.classList.toggle('is-open');more.setAttribute('aria-expanded',String(open));};actions.append(more);
    if(selectedDate===today()&&(item.time||item.fin))options.append(button(item.snoozeDay===today()?'↩ Reprendre':'⏰ Repousser','secondary',()=>{item.snoozeDay=item.snoozeDay===today()?'':today();saveAndRender();toast(item.snoozeDay?'Quête repoussée à plus tard.':'Quête reprise.');}));
    if(selectedDate===today())options.append(button('✕ Refuser','danger',()=>abandon(item)));options.append(button('✎ Modifier','secondary',()=>openQuestForm(item)),button('🗑 Retirer','ghost',()=>removeQuest(item)));
    body.append(line,chips,actions,options);card.append(icon,body);parent.append(card);
  }
  function renderQuests(root){
    const paths=node('div','journal-paths');paths.setAttribute('aria-label','Chemin de quêtes');[['principale','⚔️','Principales'],['secondaire','✦','Secondaires']].forEach(([type,icon,label])=>{const count=state.quests.filter(x=>x.type===type&&activeOn(x,selectedDate)&&!doneToday(x)&&!abandonedToday(x)).length,b=button(`${icon} ${label}${count?` · ${count}`:''}`,questPath===type?'is-active':'',()=>{questPath=type;render();});b.setAttribute('aria-pressed',String(questPath===type));paths.append(b);});root.append(paths);renderDayStrip(root);
    root.append(node('div','journal-date-title',selectedDate===today()?'Aujourd’hui':formatDate(selectedDate)));
    const goal=node('div','journal-goal'),count=completedToday();goal.innerHTML=`<span><b>🏅</b> Objectif du jour</span><strong>${Math.min(count,state.objJour)} / ${state.objJour}</strong><i style="--goal:${Math.min(100,count/state.objJour*100)}%"></i>`;root.append(goal);rule(root,questPath==='principale'?'Chemin principal':'Chemin secondaire');
    const list=node('div','journal-list'),items=state.quests.filter(x=>x.type===questPath&&activeOn(x,selectedDate)&&!(selectedDate===today()&&(doneToday(x)||abandonedToday(x)))).sort((a,b)=>Number(a.snoozeDay===today())-Number(b.snoozeDay===today())||(a.time||'99').localeCompare(b.time||'99'));
    if(!items.length)empty(list,questPath==='principale'?'⚔️':'✨',`Aucune quête ${questPath==='principale'?'principale':'secondaire'} pour cette journée.`);items.forEach(x=>renderQuestCard(x,list));root.append(list);
  }

  function renderCalendar(root){
    const year=calendarDate.getFullYear(),month=calendarDate.getMonth(),head=node('div','journal-calendar-head');
    head.append(button('‹','round',()=>{calendarDate=new Date(year,month-1,1);render();}),node('strong','',`${MONTHS[month]} ${year}`),button('›','round',()=>{calendarDate=new Date(year,month+1,1);render();}));root.append(head);
    const calendar=node('div','journal-calendar');DAYS.forEach(name=>calendar.append(node('div','journal-weekday',name)));const offset=dow(new Date(year,month,1)),days=new Date(year,month+1,0).getDate();
    for(let i=0;i<offset;i++)calendar.append(node('span','journal-calendar-day is-empty'));
    for(let day=1;day<=days;day++){const date=iso(new Date(year,month,day)),has=state.quests.some(x=>x.type==='evenement'&&x.date===date),b=button(String(day),`journal-calendar-day${date===today()?' is-today':''}${has?' has-event':''}`,()=>openEventForm(null,date));b.setAttribute('aria-label',`${formatDate(date)}${has?', événement prévu':''}`);if(date===today())b.setAttribute('aria-current','date');calendar.append(b);}root.append(calendar);
  }
  function renderRoutine(root){
    const toggle=button(`🗓️ Routine de la semaine ${weekOpen?'⌄':'›'}`,'journal-routine-toggle',()=>{weekOpen=!weekOpen;render();});toggle.setAttribute('aria-expanded',String(weekOpen));root.append(toggle);if(!weekOpen)return;
    const block=node('div','journal-routine'),start=monday(new Date());
    for(let i=0;i<7;i++){const date=new Date(start);date.setDate(start.getDate()+i);const key=iso(date),day=node('section','journal-routine-day');day.append(node('h3','',`${DAYS[i]} ${date.getDate()}`));const rows=state.quests.filter(x=>(x.type==='principale'||x.type==='secondaire')&&x.rec!=='oneshot'&&activeOn(x,key)).sort((a,b)=>(a.time||'99').localeCompare(b.time||'99'));if(!rows.length)day.append(node('p','','Repos'));rows.forEach(x=>day.append(button(`${x.time?`${x.time} · `:''}${x.icon} ${x.title}`,`journal-routine-row ${x.type}`,()=>openQuestForm(x))));block.append(day);}block.append(button('+ Nouvelle routine','primary wide',()=>openQuestForm(null,'principale')));root.append(block);
  }
  function reminderLabel(value){if(value>=1440)return`${value/1440} j`;if(value>=60)return`${value/60} h`;return`${value} min`;}
  function renderEventCard(item,parent){
    const card=node('article','journal-event-card'),days=Math.round((fromIso(item.date)-fromIso(today()))/86400000),countdown=days===0?'Aujourd’hui':days===1?'Demain':days>1?`J−${days}`:'Passé';
    card.innerHTML=`<span class="journal-card-icon">${esc(item.icon||'📅')}</span><div class="journal-card-body"><div class="journal-card-titleline"><strong>${esc(item.title)}</strong><time>${esc(item.time||'')}</time></div><div class="journal-chips"><span class="journal-chip kind">${esc(formatDate(item.date,{day:'numeric',month:'short'}))}</span><span class="journal-chip">${countdown}</span>${item.reminder?`<span class="journal-chip">🔔 −${reminderLabel(item.reminder)}</span>`:''}</div><div class="journal-card-actions"></div></div>`;
    const actions=card.querySelector('.journal-card-actions');if(days>=0)actions.append(button('✓ Fait','primary',()=>complete(item)));actions.append(button('✎ Modifier','secondary',()=>openEventForm(item)),button('🗑','ghost',()=>removeQuest(item)));parent.append(card);
  }
  function renderAgenda(root){
    renderCalendar(root);const actions=node('div','journal-agenda-actions');actions.append(button('+ Événement','primary wide',()=>openEventForm()));if('Notification'in window&&Notification.permission!=='granted')actions.append(button('🔔 Activer','secondary',requestNotifications));root.append(actions);renderRoutine(root);rule(root,'Événements à venir');
    const list=node('div','journal-list'),events=state.quests.filter(x=>x.type==='evenement'&&x.date>=today()).sort((a,b)=>`${a.date}${a.time||''}`.localeCompare(`${b.date}${b.time||''}`)).slice(0,12);if(!events.length)empty(list,'🏕️','Aucun événement à venir. Touche un jour ou le bouton Événement.');events.forEach(x=>renderEventCard(x,list));root.append(list);
  }

  function historyEntries(status){
    const items=[],current=status==='done'?state.done.filter(x=>x.day===today()||!x.day):state.abandoned.filter(x=>x.day===today()||!x.day);current.forEach(x=>items.push({...x,_date:today()}));
    Object.keys(state.history).sort().reverse().forEach(date=>{const entry=state.history[date]||{},rows=status==='done'?(entry.done||[]):(entry.abandoned||[]);rows.forEach(x=>items.push({...x,_date:date}));});return items;
  }
  function renderHistory(root){
    const paths=node('div','journal-paths history');paths.setAttribute('aria-label','État des quêtes');const doneButton=button('🏆 Faites',historyPath==='done'?'is-active':'',()=>{historyPath='done';render();}),abandonedButton=button('🍂 Abandonnées',historyPath==='abandoned'?'is-active':'',()=>{historyPath='abandoned';render();});doneButton.setAttribute('aria-pressed',String(historyPath==='done'));abandonedButton.setAttribute('aria-pressed',String(historyPath==='abandoned'));paths.append(doneButton,abandonedButton);root.append(paths);
    const allDone=historyEntries('done'),summary=node('div','journal-history-summary');summary.innerHTML=`<div><b>${allDone.length}</b><span>Réussies</span></div><div><b>${state.xpTotal}</b><span>XP gagnés</span></div><div><b>${state.coins}</b><span>Or gagné</span></div>`;root.append(summary);
    const items=historyEntries(historyPath),grouped=new Map();items.forEach(x=>{if(!grouped.has(x._date))grouped.set(x._date,[]);grouped.get(x._date).push(x);});if(!items.length){empty(root,historyPath==='done'?'🏆':'🌿',historyPath==='done'?'Aucune quête réussie pour l’instant.':'Rien d’abandonné. Belle discipline.');return;}
    grouped.forEach((rows,date)=>{rule(root,date===today()?'Aujourd’hui':formatDate(date));const day=node('div','journal-history-day');rows.forEach(item=>{const xp=Number(item.gain)||0,gold=Number(item.gold)||Math.round(xp*1.5),card=node('article',`journal-history-card ${historyPath}`);card.innerHTML=`<span>${esc(item.icon||'📜')}</span><div><strong>${esc(item.title||'Sans titre')}</strong><small>${historyPath==='done'?`+${xp} XP · +${gold} 🪙`:'Quête abandonnée'}</small></div><b>${historyPath==='done'?'✓':'×'}</b>`;day.append(card);});root.append(day);});
  }

  function getDiaryDay(date){let entry=state.diary.days[date];if(!entry)entry=state.diary.days[date]={t:''};if(entry.t==null)entry.t=String(entry.txt||'');return entry;}
  function dailyQuestion(date){let hash=0;for(const char of date)hash=(hash*31+char.charCodeAt(0))|0;return QUESTIONS[(hash>>>0)%QUESTIONS.length];}
  function renderDiary(root){
    const entry=getDiaryDay(diaryDate),nav=node('div','journal-diary-nav');nav.append(button('‹','round',()=>{diaryDate=addDays(diaryDate,-1);render();}),node('strong','',formatDate(diaryDate)),button('›','round',()=>{diaryDate=addDays(diaryDate,1);render();}));root.append(nav);
    if(diaryDate===today()&&!entry.qa&&!entry.qRef){const prompt=node('div','journal-diary-prompt');prompt.innerHTML='<span><b>✦</b> Question du jour ?</span><div></div>';prompt.lastElementChild.append(button('Accepter','primary',()=>{entry.t=`${entry.t?`${entry.t}\n`:''}✨ ${dailyQuestion(diaryDate)}\n`;entry.qa=1;saveAndRender();}),button('Refuser','ghost',()=>{entry.qRef=1;saveAndRender();}));root.append(prompt);}
    const page=node('div','journal-diary-page');if(entry.qa)page.append(node('blockquote','',dailyQuestion(diaryDate)));const textarea=node('textarea','journal-diary-text');textarea.value=entry.t||'';textarea.placeholder='Écris ici — pensées, humeur, victoires…';textarea.setAttribute('aria-label','Page du carnet');textarea.oninput=()=>{entry.t=textarea.value;clearTimeout(saveTimer);saveTimer=setTimeout(save,350);};page.append(textarea,node('footer','','‹     1 / 1     ›'));root.append(page);
  }

  function render(){
    rollover();updateProfile();const root=createPanel();if(activeTab==='quests')renderQuests(root);if(activeTab==='agenda')renderAgenda(root);if(activeTab==='history')renderHistory(root);if(activeTab==='diary')renderDiary(root);
    tabs.forEach(tab=>{const on=tab.dataset.journalTab===activeTab;tab.classList.toggle('is-active',on);if(on)tab.setAttribute('aria-current','page');else tab.removeAttribute('aria-current');});fab.hidden=activeTab==='history'||activeTab==='diary';fab.setAttribute('aria-label',activeTab==='agenda'?'Créer un événement':'Créer une quête');
  }
  function selectTab(tab){if(!META[tab])return;activeTab=tab;render();}
  function saveAndRender(){save();render();}
  function complete(item){
    const reward=gainFor(item);state.xpTotal+=reward.xp;state.coins+=reward.gold;state.totalDone++;state.done.push({title:item.title,icon:item.icon,type:item.type,day:today(),gain:reward.xp,gold:reward.gold,rating:4});
    if(item.type==='evenement'||item.rec==='oneshot')state.quests=state.quests.filter(x=>x.id!==item.id);else{item.doneToday=true;item.doneDay=today();}closeModal();saveAndRender();toast(`+${reward.xp} XP · +${reward.gold} or`);
  }
  function abandon(item){item.abandonedToday=true;item.abandonedDay=today();state.abandoned.push({title:item.title,icon:item.icon,type:item.type,day:today()});saveAndRender();toast('Quête rangée dans les abandons du jour.');}
  function removeQuest(item){confirmModal('Retirer cette quête ?','Cette action supprime la quête de ton journal.',()=>{state.quests=state.quests.filter(x=>x.id!==item.id);saveAndRender();toast('Quête retirée.');});}
  function openSteps(item){
    const box=openModal(`${item.icon||'☑'} ${item.title}`,'Coche les petites étapes, puis valide la quête quand tu es prêt·e.'),list=node('div','journal-step-list');item.steps.forEach((step,i)=>{const row=button('',`journal-step${step.d?' is-done':''}`,()=>{item.steps[i].d=!item.steps[i].d;save();openSteps(item);});row.innerHTML=`<i>${step.d?'✓':''}</i><span>${esc(step.t)}</span>`;list.append(row);});box.append(list,button(item.steps.every(step=>step.d)?'✓ Valider la quête':'Enregistrer les étapes','primary wide',()=>item.steps.every(step=>step.d)?complete(item):closeModal()));
  }
  function openTimer(item){
    const box=openModal(`⏱ ${item.title}`,`Objectif : ${item.dur} minutes. Le temps réel continue même si l’écran se met en veille.`);let running=true,elapsed=0,started=Date.now();const display=node('div','journal-timer','00:00'),track=node('i','journal-timer-progress'),controls=node('div','journal-modal-actions'),pause=button('⏸ Pause','secondary');
    const tick=()=>{const seconds=Math.floor((elapsed+(running?Date.now()-started:0))/1000);display.textContent=`${pad(Math.floor(seconds/60))}:${pad(seconds%60)}`;track.style.setProperty('--timer',`${Math.min(100,seconds/(item.dur*60)*100)}%`);};pause.onclick=()=>{if(running)elapsed+=Date.now()-started;else started=Date.now();running=!running;pause.textContent=running?'⏸ Pause':'▶ Reprendre';tick();};controls.append(pause,button('✓ Terminer','primary',()=>complete(item)));box.append(display,track,controls,button('✕ Abandonner','danger wide',()=>{closeModal();abandon(item);}));clearInterval(timerId);timerId=setInterval(tick,500);tick();
  }

  function addStepField(parent,step={t:''}){const row=node('div','journal-step-field'),input=document.createElement('input');input.maxLength=60;input.placeholder='Nom de l’étape';input.value=step.t||'';row.append(input,button('×','ghost icon',()=>row.remove()));parent.append(row);}
  function openQuestForm(editing=null,preferredType=questPath){
    let type=editing?.type==='secondaire'?'secondaire':preferredType==='secondaire'?'secondaire':'principale',rec=editing?.rec||'oneshot',icon=editing?.icon||(type==='principale'?'⚔️':'✨'),days=[...(editing?.days||[0,1,2,3,4,5,6])];
    const box=openModal(editing?'Modifier la quête':'Nouvelle quête','Choisis son chemin, son rythme et les aides qui te seront utiles.');box.innerHTML+=`<form class="journal-form" id="questForm"><label>Titre<input name="title" maxlength="42" required value="${esc(editing?.title||'')}" placeholder="Ex : Méditer dix minutes"></label><fieldset><legend>Chemin</legend><div class="journal-choice" data-choice="type"><button type="button" data-value="principale">⚔️ Principale</button><button type="button" data-value="secondaire">✦ Secondaire</button></div></fieldset><fieldset><legend>Récurrence</legend><div class="journal-choice three" data-choice="rec"><button type="button" data-value="oneshot">One shot</button><button type="button" data-value="certains">Certains jours</button><button type="button" data-value="tous">Tous les jours</button></div></fieldset><label class="quest-date">Jour de la quête<input name="date" type="date" value="${esc(editing?.date||selectedDate)}"></label><fieldset class="quest-days"><legend>Jours actifs</legend><div class="journal-day-choices">${DAYS.map((name,i)=>`<button type="button" data-day="${i}">${name}</button>`).join('')}</div></fieldset><fieldset><legend>Horaires</legend><label class="journal-check"><input name="hasTime" type="checkbox" ${editing?.time||editing?.fin?'checked':''}> Donner une heure de début ou de fin</label><div class="journal-time-fields"><label>Début<input name="time" type="time" value="${esc(editing?.time||'')}"></label><label>Fin<input name="fin" type="time" value="${esc(editing?.fin||'')}"></label></div><small class="duration-preview"></small></fieldset><fieldset><legend>Étapes</legend><label class="journal-check"><input name="hasSteps" type="checkbox" ${editing?.steps?.length?'checked':''}> Découper la quête en petites étapes</label><div class="journal-step-editor"></div><button class="journal-button secondary add-step" type="button">+ Ajouter une étape</button></fieldset><fieldset><legend>Icône</legend><div class="journal-icon-grid">${ICONS.map(value=>`<button type="button" data-icon="${value}">${value}</button>`).join('')}</div></fieldset><div class="journal-reward-preview"></div><div class="journal-modal-actions"><button class="journal-button ghost" type="button" data-cancel>Annuler</button><button class="journal-button primary" type="submit">${editing?'Enregistrer':'Créer +'}</button></div>${editing?'<button class="journal-button danger wide" type="button" data-delete>Supprimer la quête</button>':''}</form>`;
    const form=box.querySelector('#questForm'),typeChoice=form.querySelector('[data-choice="type"]'),recChoice=form.querySelector('[data-choice="rec"]'),editor=form.querySelector('.journal-step-editor');
    const update=()=>{typeChoice.querySelectorAll('button').forEach(n=>{const on=n.dataset.value===type;n.classList.toggle('is-active',on);n.setAttribute('aria-pressed',String(on));});recChoice.querySelectorAll('button').forEach(n=>{const on=n.dataset.value===rec;n.classList.toggle('is-active',on);n.setAttribute('aria-pressed',String(on));});form.querySelector('.quest-days').hidden=rec!=='certains';form.querySelector('.quest-date').hidden=rec!=='oneshot';form.querySelectorAll('[data-day]').forEach(n=>{const on=days.includes(Number(n.dataset.day));n.classList.toggle('is-active',on);n.setAttribute('aria-pressed',String(on));});form.querySelectorAll('[data-icon]').forEach(n=>{const on=n.dataset.icon===icon;n.classList.toggle('is-active',on);n.setAttribute('aria-pressed',String(on));});const hasTime=form.elements.hasTime.checked;form.querySelector('.journal-time-fields').hidden=!hasTime;const mins=hasTime?duration(form.elements.time.value,form.elements.fin.value):0;form.querySelector('.duration-preview').textContent=mins?`Chronomètre calculé : ${mins} minutes`:'La fin sert d’échéance ; début + fin activent le chronomètre.';const hasSteps=form.elements.hasSteps.checked;editor.hidden=!hasSteps;form.querySelector('.add-step').hidden=!hasSteps;const reward=gainFor({type});form.querySelector('.journal-reward-preview').textContent=`Récompense prévue : +${reward.xp} XP · +${reward.gold} or`;};
    typeChoice.onclick=e=>{if(e.target.dataset.value){type=e.target.dataset.value;update();}};recChoice.onclick=e=>{if(e.target.dataset.value){rec=e.target.dataset.value;update();}};form.querySelector('.journal-day-choices').onclick=e=>{if(e.target.dataset.day!=null){const day=Number(e.target.dataset.day);days=days.includes(day)?days.filter(v=>v!==day):[...days,day];update();}};form.querySelector('.journal-icon-grid').onclick=e=>{if(e.target.dataset.icon){icon=e.target.dataset.icon;update();}};['hasTime','hasSteps','time','fin'].forEach(name=>form.elements[name].addEventListener('input',update));
    (editing?.steps?.length?editing.steps:[{t:''},{t:''}]).forEach(step=>addStepField(editor,step));form.querySelector('.add-step').onclick=()=>addStepField(editor);form.querySelector('[data-cancel]').onclick=closeModal;form.querySelector('[data-delete]')?.addEventListener('click',()=>removeQuest(editing));
    form.onsubmit=e=>{e.preventDefault();if(rec==='certains'&&!days.length){toast('Choisis au moins un jour actif.');return;}const values=new FormData(form),hasTime=form.elements.hasTime.checked,time=hasTime?String(values.get('time')||''):'',fin=hasTime?String(values.get('fin')||''):'',steps=form.elements.hasSteps.checked?[...editor.querySelectorAll('input')].map(input=>input.value.trim()).filter(Boolean).map(text=>({t:text,d:editing?.steps?.find(step=>step.t===text)?.d||false})):[];const result={id:editing?.id||uid(),title:String(values.get('title')||'').trim()||'Quête sans nom',type,icon,rec,date:rec==='oneshot'?String(values.get('date')||today()):'',days:rec==='tous'?[0,1,2,3,4,5,6]:days.sort(),time,fin,dur:duration(time,fin),steps,doneToday:editing?.doneToday||false,abandonedToday:editing?.abandonedToday||false,creeT:Date.now()};if(editing)Object.assign(editing,result);else state.quests.push(result);questPath=type;selectedDate=result.date||today();closeModal();saveAndRender();toast(editing?'Quête modifiée.':'Quête créée.');};update();
  }

  function openEventForm(editing=null,preferredDate=''){
    let icon=editing?.icon||'📅';const box=openModal(editing?'Modifier l’événement':'Nouvel événement','Inscris un rendez-vous dans ton agenda et choisis son rappel.');box.innerHTML+=`<form class="journal-form" id="eventForm"><label>Titre<input name="title" maxlength="42" required value="${esc(editing?.title||'')}" placeholder="Ex : Rendez-vous médecin"></label><div class="journal-form-row"><label>Date<input name="date" type="date" required value="${esc(editing?.date||preferredDate||addDays(today(),1))}"></label><label>Heure<input name="time" type="time" value="${esc(editing?.time||'20:00')}"></label></div><label>Rappel<select name="reminder">${[[0,'Aucun'],[15,'15 min avant'],[30,'30 min avant'],[60,'1 h avant'],[120,'2 h avant'],[360,'6 h avant'],[720,'12 h avant'],[1440,'24 h avant']].map(([value,label])=>`<option value="${value}" ${Number(editing?.reminder||0)===value?'selected':''}>${label}</option>`).join('')}</select></label><fieldset><legend>Icône</legend><div class="journal-icon-grid">${EVENT_ICONS.map(value=>`<button type="button" data-icon="${value}">${value}</button>`).join('')}</div></fieldset><div class="journal-reward-preview">Récompense : +36 XP · +54 or</div><div class="journal-modal-actions"><button class="journal-button ghost" type="button" data-cancel>Annuler</button><button class="journal-button primary" type="submit">${editing?'Enregistrer':'Créer +'}</button></div>${editing?'<button class="journal-button danger wide" type="button" data-delete>Supprimer l’événement</button>':''}</form>`;
    const form=box.querySelector('#eventForm'),draw=()=>form.querySelectorAll('[data-icon]').forEach(n=>{const on=n.dataset.icon===icon;n.classList.toggle('is-active',on);n.setAttribute('aria-pressed',String(on));});draw();form.querySelector('.journal-icon-grid').onclick=e=>{if(e.target.dataset.icon){icon=e.target.dataset.icon;draw();}};form.querySelector('[data-cancel]').onclick=closeModal;form.querySelector('[data-delete]')?.addEventListener('click',()=>removeQuest(editing));form.onsubmit=e=>{e.preventDefault();const values=new FormData(form),result={id:editing?.id||uid(),title:String(values.get('title')||'').trim()||'Événement',type:'evenement',icon,date:String(values.get('date')),time:String(values.get('time')||''),reminder:Number(values.get('reminder'))||0,notified:false,remFired:false};if(editing)Object.assign(editing,result);else state.quests.push(result);closeModal();saveAndRender();toast(editing?'Événement modifié.':'Événement créé.');};
  }

  function openModal(title,subtitle=''){clearInterval(timerId);modalLayer.hidden=false;modalLayer.replaceChildren();const sheet=node('section','journal-modal'),head=node('header','journal-modal-head'),copy=node('div'),heading=node('h2','',title);heading.id='journalModalTitle';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby',heading.id);copy.append(heading);if(subtitle)copy.append(node('p','',subtitle));const close=button('×','journal-modal-close',closeModal);close.setAttribute('aria-label','Fermer');head.append(copy,close);sheet.append(head);modalLayer.append(sheet);requestAnimationFrame(()=>{modalLayer.classList.add('is-open');close.focus({preventScroll:true});});return sheet;}
  function closeModal(){clearInterval(timerId);modalLayer.classList.remove('is-open');modalLayer.hidden=true;modalLayer.replaceChildren();}
  function confirmModal(title,message,action){const box=openModal(title,message),actions=node('div','journal-modal-actions');actions.append(button('Annuler','ghost',closeModal),button('Confirmer','danger',()=>{closeModal();action();}));box.append(actions);}
  function requestNotifications(){if(!('Notification'in window)){toast('Notifications non disponibles ici.');return;}Notification.requestPermission().then(permission=>{toast(permission==='granted'?'Rappels activés.':'Rappels non autorisés.');render();});}
  function checkSchedule(){
    const now=new Date();let changed=false;
    state.quests.filter(x=>x.type==='evenement'&&x.date&&x.time).forEach(item=>{const target=new Date(`${item.date}T${item.time}`),diff=target-now;if(item.reminder&&!item.remFired&&diff<=item.reminder*60000&&diff>-60000){item.remFired=true;changed=true;notify(`Rappel : ${item.title}`,`Dans ${reminderLabel(item.reminder)}.`);}if(!item.notified&&diff<=0&&diff>-90000){item.notified=true;changed=true;notify(`C’est l’heure : ${item.title}`,item.time);}});
    const minute=now.getHours()*60+now.getMinutes();
    state.quests.filter(x=>(x.type==='principale'||x.type==='secondaire')&&activeOn(x,today())&&!doneToday(x)&&!abandonedToday(x)).forEach(item=>{
      if(item.time&&!item.notifDay&&minute>=Number(item.time.slice(0,2))*60+Number(item.time.slice(3,5))&&minute<Number(item.time.slice(0,2))*60+Number(item.time.slice(3,5))+2){item.notifDay=true;changed=true;notify(`C’est l’heure : ${item.title}`,item.time);}
      const end=item.fin||item.time;if(!end)return;let limit=Number(end.slice(0,2))*60+Number(end.slice(3,5))+60;
      if(item.snoozeDay===today()&&item.snoozeT)limit=Math.floor((item.snoozeT-Date.now()+120*60000)/60000)+minute;
      if(minute>=limit&&Date.now()-(item.creeT||0)>120000){item.abandonedToday=true;item.abandonedDay=today();state.abandoned.push({title:item.title,icon:item.icon,type:item.type,day:today(),automatic:true});changed=true;toast(`${item.title} a rejoint les abandons du jour.`);}
    });
    if(changed){save();if(dialog.open&&modalLayer.hidden)render();}
  }
  function notify(title,body){if('Notification'in window&&Notification.permission==='granted'){try{new Notification(title,{body});}catch{}}toast(title);}
  function openJournal(){rollover();render();dialog.showModal();openButton.hidden=true;}
  function closeJournal(){closeModal();dialog.close();openButton.hidden=false;openButton.focus({preventScroll:true});}

  openButton.onclick=openJournal;closeButton.onclick=closeJournal;tabs.forEach(tab=>tab.onclick=()=>selectTab(tab.dataset.journalTab));fab.onclick=()=>activeTab==='agenda'?openEventForm():openQuestForm(null,questPath);modalLayer.onclick=e=>{if(e.target===modalLayer||e.target.closest('.journal-modal-close'))closeModal();};dialog.addEventListener('cancel',e=>{e.preventDefault();if(!modalLayer.hidden)closeModal();else closeJournal();});window.addEventListener('storage',e=>{if(e.key===KEY){state=load();if(dialog.open)render();}});document.addEventListener('visibilitychange',()=>{if(!document.hidden){rollover();checkSchedule();if(dialog.open)render();}});setInterval(checkSchedule,30000);render();if(params.get('journal')==='1')requestAnimationFrame(openJournal);
})();

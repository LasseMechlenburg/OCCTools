// Hover previews are read-only. Creating a checklist requires an explicit confirmation.
let checklistStartState={ready:false};
void api('checklist-start').then(s=>{checklistStartState=s;drawTemplatePreview();}).catch(()=>{});
const startCodes={'Preops':'PreOps','Wetlease':'Wetlease','Diversion':'DIV','Crew ILL':'Crew ILL','Adhoc Sale':'AdHoc Sale'};
function openChecklistStart(label){
 closeTemplatePreview();closeUtilityPreview();
 showDetail('Ny aktiv checkliste','Start '+label,'');
 const c=$('#detailContent'),code=startCodes[label],requestId=crypto.randomUUID();
 const field=el('label','field',code==='Crew ILL'?'Crewnummer':'Flightnummer'),input=el('input');input.maxLength=100;field.append(input);
 const message=el('p','muted',(code==='PreOps'?'Preops oprettes med dags dato i Danmark. ':'Der oprettes en ny checkliste i SharePoint. ')+'Alle skabelonpunkter for typen medtages, også dem som ikke vises i dagens forhåndsvisning.');message.setAttribute('role','status');
 if(code!=='PreOps')c.append(field);c.append(message);
 const submit=button('Opret checkliste','primary',async()=>{
  const reference=code==='PreOps'?'':input.value.trim();
  if(code!=='PreOps'&&!reference){message.textContent='Udfyld '+(code==='Crew ILL'?'crewnummer.':'flightnummer.');input.focus();return;}
  submit.disabled=true;input.disabled=true;message.textContent='Opretter i SharePoint… Vent på bekræftelse.';
  try{
   const r=await api('checklist-start',{method:'POST',body:JSON.stringify({checklistCode:code,reference,requestId})});
   if(r.ok!==true)throw new Error('Oprettelsen blev ikke bekræftet. Kontrollér flowhistorikken før et nyt forsøg.');
   message.textContent='Oprettet i SharePoint. Henter åbne checklister…';
   try{await loadOpenChecklistData(true);message.textContent='Oprettet. Åbn oversigten for at se checklisten.';}catch{message.textContent='Oprettet, men oversigten kunne ikke opdateres. Opret ikke igen; brug Opdatér under Åbne checklister.';}
   c.append(button('Åbn checklister','quiet',()=>openChecklistStandalone()));
  }catch(e){message.className='error';message.textContent=e.message;}
 });
 submit.disabled=!checklistStartState.ready;c.append(submit);
}
function templateCalendar(now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Copenhagen',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
 const date=parts.year+'-'+parts.month+'-'+parts.day;
 const weekday=new Date(date+'T12:00:00Z').getUTCDay()||7;
 const year=now.getUTCFullYear();
 const lastSunday=month=>{const d=new Date(Date.UTC(year,month+1,0));d.setUTCDate(d.getUTCDate()-d.getUTCDay());return d;};
 return {date,weekday,season:now>=lastSunday(2)&&now<lastSunday(9)?'S':'W'};
}
function templateApplies(item,calendar=templateCalendar()){
 const days=String(item.days||'').trim();
 if(days&&!days.split(/[,;\s]+/).map(Number).includes(calendar.weekday))return false;
 const from=String(item.validFrom||'').trim().slice(0,10),to=String(item.validTo||'').trim().slice(0,10);
 // Both date boundaries are inclusive; missing boundaries are unrestricted.
 if(from&&calendar.date<from||to&&calendar.date>to)return false;
 const season=String(item.season||'').trim().toUpperCase();
 return !season||season==='ALL'||season===calendar.season;
}
const templateOrder=['D','CD','N','CN','Preops','Wetlease','Diversion','Crew ILL','Adhoc Sale'];
let templateData=null,templatePending=null,templateError='',templateSelected='',templateCloseTimer;
const templateRail=el('aside','templateRail');templateRail.setAttribute('aria-label','Checklist-skabeloner');
templateRail.append(el('h2','','Checklister'));
const templateButtons=new Map();
const templatePanel=el('section','templatePanel');templatePanel.hidden=true;templatePanel.id='templatePreview';
const templateGroupButtons=new Map(),templateGroupTitle=el('h2'),templateWheel=el('div','checklistGroupWheel'),templateContent=el('div');
let templateGroup='';
const templateGroupHeader=el('div','templatePanelTop');templateGroupHeader.append(templateGroupTitle,button('×','close',closeTemplatePreview));templateGroupHeader.lastChild.setAttribute('aria-label','Luk checklist-menu');
templatePanel.append(templateGroupHeader,el('p','muted','Hold musen over et felt, eller klik for at se checklisten.'),templateWheel,templateContent);
templatePanel.setAttribute('aria-label','Checklist-oversigt');
const codeOf=v=>{const code=String(v||'').trim().toLowerCase();return code==='div'?'diversion':code;};
function templateRows(code){const calendar=templateCalendar();return templateData?.items.filter(item=>codeOf(item.code)===codeOf(code)&&templateApplies(item,calendar))||[];}
function closeTemplatePreview(){clearTimeout(templateCloseTimer);templatePanel.hidden=true;templateSelected='';templateGroup='';templateButtons.forEach(b=>b.setAttribute('aria-expanded','false'));templateGroupButtons.forEach(b=>b.setAttribute('aria-expanded','false'));}
function scheduleTemplateClose(){clearTimeout(templateCloseTimer);templateCloseTimer=setTimeout(closeTemplatePreview,220);}
function templateUpdatedLabel(){return templateData?'Opdateret '+new Date(templateData.generatedAt).toLocaleTimeString('da-DK',{hour:'2-digit',minute:'2-digit'}):'Henter skabeloner…';}
function drawTemplatePreview(){
 if(!templateSelected)return;
 templateContent.replaceChildren();
 const top=el('div','templatePanelTop'),title=el('div');title.append(el('span','eyebrow','Checklist-skabelon'),el('h2','',templateSelected));
 top.append(title,button('×','close',closeTemplatePreview));top.lastChild.setAttribute('aria-label','Luk checklist-oversigt');templateContent.append(top);
 const actions=el('div','templateActions');actions.append(el('span','muted',templateUpdatedLabel()));templateContent.append(actions);
 if(templateError)templateContent.append(el('p','error',templateError+(templateData?' Viser senest hentede data.':'')));
 if(templateData?.partial)templateContent.append(el('p','notice','Ufuldstændig oversigt: flowet sender kun første side. Slå Pagination til i Get items.'));
 if(!templateData){templateContent.append(el('p','notice',templateError?'Skabelonerne kunne ikke hentes. Genindlæs siden for at prøve igen.':'Henter skabeloner…'));return;}
 const rows=templateRows(templateSelected);templateContent.append(el('p','muted',rows.length+' punkter gælder i dag · '+templateCalendar().date));
 if(startCodes[templateSelected]){
  templateContent.append(el('p','muted','Forhåndsvisningen viser dagens relevante punkter. Ved oprettelse medtages alle punkter for typen.'));
  const start=button('Start '+templateSelected,'checklistStartButton',()=>openChecklistStart(templateSelected));start.disabled=!checklistStartState.ready;templateContent.append(start);
  if(!checklistStartState.ready)templateContent.append(el('p','notice','Start afventer kontrol af henteflowet. Skabelonen kan stadig læses.'));
 }
 const list=el('ol','templateItems');
 rows.forEach(item=>{const row=el('li');row.append(el('strong','',item.title));if(item.info)row.append(el('p','prose',item.info));
  const conditions=[];if(item.days&&item.days!=='1,2,3,4,5,6,7')conditions.push('Ugedage: '+item.days);if(item.season&&item.season!=='All')conditions.push('Sæson: '+item.season);if(item.visibleFrom)conditions.push('Fra kl. '+item.visibleFrom);if(conditions.length)row.append(el('p','muted',conditions.join(' · ')));
  if(item.link)row.append(link('Åbn link ↗',item.link,'textButton'));list.append(row);
 });templateContent.append(list);
 if(!rows.length)templateContent.append(el('p','empty',templateData.partial?'Denne liste er ikke med i det modtagne udsnit.':'Ingen punkter gælder i dag i denne liste.'));
}
function showTemplatePreview(code){closeUtilityPreview();clearTimeout(templateCloseTimer);if(templateSelected===code&&!templatePanel.hidden)return;templateSelected=code;templatePanel.hidden=false;templateButtons.forEach((b,k)=>b.setAttribute('aria-expanded',String(k===code)));drawTemplatePreview();}
function showTemplateGroup(group){
 closeUtilityPreview();clearTimeout(templateCloseTimer);
 if(templateGroup===group&&!templatePanel.hidden)return;
 templateGroup=group;templateSelected='';templatePanel.hidden=false;templatePanel.scrollTop=0;
 templateGroupButtons.forEach((b,k)=>b.setAttribute('aria-expanded',String(k===group)));
 templateGroupTitle.textContent=group==='daily'?'Se checklister':'Se og opret adhoc-checklister';
 templateContent.replaceChildren(el('p','notice',group==='daily'?'D, CD, N og CN er et hurtigt opslag i skabelonerne. Aktive lister findes under Åbne checklister.':'Vælg en type for at læse punkterne. Oprettelse kræver, at du klikker på Start og derefter bekræfter.'));
 templateWheel.replaceChildren();templateButtons.clear();
 const codes=group==='daily'?templateOrder.slice(0,4):templateOrder.slice(4),step=360/codes.length;
 const svg=(tag,attrs={})=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n;};
 const drawing=svg('svg',{viewBox:'0 0 400 400',class:'wheelDrawing'}),point=(r,a)=>[200+r*Math.cos(a*Math.PI/180),200+r*Math.sin(a*Math.PI/180)];
 codes.forEach((code,i)=>{
  const mid=-90+i*step,start=mid-step/2+1,end=mid+step/2-1,a=point(190,start),bEnd=point(190,end),c=point(67,end),d=point(67,start);
  const b=svg('g',{class:'wheelSegment',role:'button',tabindex:'0','aria-label':code,'aria-expanded':'false','aria-controls':'templateGroupContent'});
  b.append(svg('path',{d:`M ${a} A 190 190 0 0 1 ${bEnd} L ${c} A 67 67 0 0 0 ${d} Z`}));
  const [x,y]=point(132,mid),glyph=svg('svg',{x:x-11,y:y-30,width:22,height:22,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.6','aria-hidden':'true'});glyph.append(svg('path',{d:paths.book}));b.append(glyph);
  const label=svg('text',{x,y:y+12,'text-anchor':'middle'});label.textContent=code;b.append(label);
  b.onclick=()=>showTemplatePreview(code);b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showTemplatePreview(code);}};
  b.onpointerenter=e=>{if(e.pointerType==='mouse')showTemplatePreview(code);};b.onfocus=()=>showTemplatePreview(code);templateButtons.set(code,b);drawing.append(b);
 });
 const close=button('','wheelCenter',closeTemplatePreview);close.setAttribute('aria-label','Luk checklist-menu');close.append(icon('book'),el('small','','Luk ×'));templateWheel.append(drawing,close);
}
templateContent.id='templateGroupContent';
for(const [group,label,sub] of [['daily','Se checklister','D · CD · N · CN'],['adhoc','Se og opret adhoc-checklister','Preops · Wetlease m.fl.']]){
 const b=button('','templateCircle checklistGroupLauncher',()=>showTemplateGroup(group));b.append(el('strong','',label));b.setAttribute('aria-expanded','false');b.setAttribute('aria-controls','templatePreview');b.onpointerenter=e=>{if(e.pointerType==='mouse')showTemplateGroup(group);};b.onfocus=()=>showTemplateGroup(group);templateGroupButtons.set(group,b);templateRail.append(b);
}
const templateStatus=el('p','templateStatus','Henter…');templateStatus.setAttribute('role','status');
templateRail.onpointerleave=scheduleTemplateClose;templatePanel.onpointerleave=scheduleTemplateClose;
templatePanel.onpointerenter=()=>clearTimeout(templateCloseTimer);
function focusLeft(e){if(!templateRail.contains(e.relatedTarget)&&!templatePanel.contains(e.relatedTarget))scheduleTemplateClose();}
templateRail.onfocusout=focusLeft;templatePanel.onfocusout=focusLeft;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!templatePanel.hidden)closeTemplatePreview();});
document.addEventListener('pointerdown',e=>{if(!templateRail.contains(e.target)&&!templatePanel.contains(e.target))closeTemplatePreview();});
document.body.classList.add('hasTemplateRail');document.querySelector('main').prepend(templateRail);document.body.append(templatePanel);
let utilitySelected='',utilityTimer;
const utilityButtons=new Map(),utilityNav=el('nav','utilityRail');utilityNav.setAttribute('aria-label','FlightPoint-genveje');
utilityNav.append(el('h2','','Overblik'));
function closeUtilityPreview(){clearTimeout(utilityTimer);if(!utilitySelected)return;utilitySelected='';utilityButtons.forEach(b=>b.setAttribute('aria-expanded','false'));if($('#detail').classList.contains('sideDetail'))$('#detail').close();closeCalendarFloat();}
function scheduleUtilityClose(){clearTimeout(utilityTimer);utilityTimer=setTimeout(closeUtilityPreview,300);}
function wireUtilityPanel(panel){if(!panel)return;panel.onpointerenter=()=>clearTimeout(utilityTimer);panel.onpointerleave=scheduleUtilityClose;}
function showUtilityPreview(key){
 clearTimeout(utilityTimer);if(utilitySelected===key&&((key==='calendar'&&$('#calendarFloat'))||(key!=='calendar'&&$('#detail').open)))return;
 closeUtilityPreview();closeTemplatePreview();utilitySelected=key;utilityButtons.forEach((b,k)=>b.setAttribute('aria-expanded',String(k===key)));
 $('#detail').classList.toggle('rightSideDetail',key==='runitems');
 sidePreviewOpening=true;
 try{if(key==='calendar'){openCalendarQuickView();$('#calendarFloat')?.classList.add('sideCalendar');wireUtilityPanel($('#calendarFloat'));}else{if($('#detail').open)$('#detail').close();if(key==='runitems')openChecklistStandalone();else if(key==='contacts')openContacts();else if(key==='crewlog'||key==='trafficlog')openLogView(key);else openListView('passwords');wireUtilityPanel($('#detail'));}}finally{sidePreviewOpening=false;}
}
for(const [key,label] of [['calendar','Kalender'],['runitems','Åbne checklister'],['contacts','Contacts'],['passwords','Passwords'],['crewlog','Crew log'],['trafficlog','Trafik log']]){
 if(key==='runitems'){const appLink=link('Checklist PowerApp','https://apps.powerapps.com/play/e/default-98f2d82c-c037-4c5f-a381-074c1428381c/a/dbd3d3fd-7854-44e0-8970-a372ca103ddb?tenantId=98f2d82c-c037-4c5f-a381-074c1428381c&hint=3fa496f2-8c53-4708-a6b6-18ae90fffae0&sourcetime=1771054357524','templateCircle utilityCircle checklistAppLink');appLink.setAttribute('aria-label','Checklist PowerApp – åbner i nyt vindue');utilityNav.append(appLink);}
 const b=button(label,'templateCircle utilityCircle',()=>showUtilityPreview(key));b.setAttribute('aria-expanded','false');b.onpointerenter=e=>{if(e.pointerType==='mouse')showUtilityPreview(key);};b.onpointerleave=scheduleUtilityClose;b.onfocus=()=>showUtilityPreview(key);utilityButtons.set(key,b);utilityNav.append(b);
}
document.querySelector('main').prepend(utilityNav);
const flightMonitoring=link('','http://occ.ne.int/flightmon/dashboard','templateCircle flightMonitoring');flightMonitoring.title='Sunclass Flight Monitoring';flightMonitoring.setAttribute('aria-label','Sunclass Flight Monitoring – åbner i nyt vindue');
const globePlane=el('span','globePlane');globePlane.setAttribute('aria-hidden','true');globePlane.innerHTML='<svg viewBox="0 0 48 48" fill="none"><g stroke="#ff982e" stroke-width="1.6"><circle cx="24" cy="24" r="20"/><ellipse cx="24" cy="24" rx="9" ry="20"/><path d="M4 24h40M7 14h34M7 34h34"/></g><path d="m12 25 11-3 7-13 4 1-3 13 9 6-1 3-11-3-5 8-3-1 2-9-10 1z" fill="white" stroke="#16324c" stroke-width="1.6" stroke-linejoin="round"/></svg>';
flightMonitoring.append(globePlane,el('strong','','Flight Monitoring'));
function placeFlightMonitoring(){const nav=document.querySelector('.wheelCategories');if(!nav)return;const wrap=el('div','directShortcut');flightMonitoring.className='wheelLauncher flightMonitoring';wrap.append(flightMonitoring);nav.append(wrap);}
document.addEventListener('portalrender',placeFlightMonitoring);placeFlightMonitoring();
// Handle rail shortcuts directly, before the browser's generic link handling.
for(const shortcut of [utilityNav.querySelector('.checklistAppLink'),flightMonitoring]){
 const label=shortcut===flightMonitoring?'Sunclass Flight Monitoring':'Checklist PowerApp';
 shortcut.title=label+' – åbner i nyt vindue';shortcut.setAttribute('aria-label',shortcut.title);
 shortcut.addEventListener('click',e=>{
  if(e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
  e.preventDefault();e.stopPropagation();
  window.open(shortcut.href,'_blank','popup=yes,width=1280,height=900,resizable=yes,scrollbars=yes,noopener,noreferrer');
 });
}
const checklistAppShortcut=utilityNav.querySelector('.checklistAppLink');
const dailyShortcut=templateGroupButtons.get('daily');
templateRail.insertBefore(checklistAppShortcut,dailyShortcut);
templateRail.insertBefore(utilityButtons.get('runitems'),dailyShortcut.nextSibling);
document.addEventListener('pointerdown',e=>{if(!utilityNav.contains(e.target)&&!utilityButtons.get('runitems').contains(e.target)&&!$('#detail').contains(e.target)&&!$('#calendarFloat')?.contains(e.target))closeUtilityPreview();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeUtilityPreview();});
async function loadTemplates(force=false){
 if(templatePending)return templatePending;if(templateData&&!force)return templateData;
 templateError='';templateStatus.textContent='Henter…';
 templatePending=(async()=>{try{const r=await api('templates',{method:'POST',body:'{}'});if(!Array.isArray(r.data?.items))throw new Error('Svaret mangler skabelonpunkter.');templateData=r.data;return templateData;}catch(e){templateError=e.message;}finally{templatePending=null;templateStatus.textContent=templateError?'Kunne ikke opdatere':templateData?.partial?'Ufuldstændig liste':templateUpdatedLabel();drawTemplatePreview();}})();
 drawTemplatePreview();return templatePending;
}
let logsData=null,logsPending=null,logsError='';
function updateLogCounts(){
 for(const [key,dataKey,label] of [['crewlog','crewLog','Crew log'],['trafficlog','trafficLog','Trafik log']]){
  const b=utilityButtons.get(key);if(b)b.textContent=label;
 }
}
async function loadLogs(force=false){
 if(logsPending)return logsPending;if(logsData&&!force)return logsData;
 logsError='';
 logsPending=(async()=>{try{
  const r=await api('logs',{method:'POST',body:'{}'});
  if(!Array.isArray(r.data?.crewLog?.items)||!Array.isArray(r.data?.trafficLog?.items))throw new Error('Log-flowets svar mangler en af listerne.');
  logsData=r.data;return logsData;
 }catch(e){logsError=e.message;}finally{logsPending=null;updateLogCounts();}})();return logsPending;
}
function openLogView(key){
 const title=key==='crewlog'?'Crew log':'Trafik log',dataKey=key==='crewlog'?'crewLog':'trafficLog';
 showDetail('FlightPoint',title,'');
 const c=$('#detailContent'),view=el('section');c.replaceChildren(view);
 let query='';
 const current=()=>c.contains(view);
 function render(){
  if(!current())return;
  view.replaceChildren(el('h2','',title));
  const refresh=button(logsPending?'Henter…':'Opdatér','quiet',async()=>{const task=loadLogs(true);render();await task;render();});refresh.disabled=!!logsPending;view.append(refresh);
  if(logsError)view.append(el('p','error',logsError+(logsData?' Viser senest hentede data.':'')));
  if(!logsData){view.append(el('p','notice',logsPending?'Henter åbne logposter…':'Ingen logdata hentet.'));return;}
  const source=logsData[dataKey];
  view.append(el('p','muted',source.items.length+' åbne poster · Opdateret '+new Date(logsData.generatedAt).toLocaleString('da-DK')));
  if(source.partial)view.append(el('p','notice','Oversigten kan være ufuldstændig. Kontrollér pagination i log-flowet.'));
  const label=el('label','field','Søg i '+title.toLowerCase()),input=el('input');input.type='search';input.placeholder='Søg efter titel eller kategori';input.value=query;label.append(input);view.append(label);
  const list=el('div','contactsList');view.append(list);
  function draw(){
   list.replaceChildren();const rows=source.items.filter(x=>(x.title+' '+x.category).toLocaleLowerCase('da-DK').includes(query.toLocaleLowerCase('da-DK')));
   for(const item of rows){
    const card=el('article','calendarEvent');card.append(el('strong','',item.title||'Uden titel'));
    const date=item.date?new Date(item.date):null;const dateLabel=date&&!Number.isNaN(date.getTime())?date.toLocaleDateString('da-DK',{timeZone:'Europe/Copenhagen'}):'';
    card.append(el('p','muted',[dateLabel,item.category].filter(Boolean).join(' · ')));
    if(item.link)card.append(link('Åbn i SharePoint ↗',item.link,'textButton'));list.append(card);
   }
   if(!rows.length)list.append(el('p','empty',source.items.length?'Ingen poster matcher søgningen.':'Ingen åbne poster i denne log.'));
  }
  input.oninput=()=>{query=input.value;draw();};draw();
 }
 const task=loadLogs();render();void task.then(render);
}
// Load each independent flow once on page load; opening a preview uses its cache.
void loadLogs();
void loadTemplates();
void refreshFlightpoint();
void loadOpenChecklistData().catch(()=>{});
// Re-evaluate cached items after midnight/season changes without another flow call.
setInterval(()=>{if(templateData){drawTemplatePreview();}},60000);

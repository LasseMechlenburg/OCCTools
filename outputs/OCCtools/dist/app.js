const $=s=>document.querySelector(s),el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const paths={hotel:'M3 21V7h18v14M7 7V3h10v4M7 11h2m6 0h2M7 15h2m6 0h2M10 21v-3h4v3',roster:'M4 5h16v16H4zM8 3v4m8-4v4M4 10h16M8 14h2m4 0h2m-8 3h2',plane:'m3 12 7-2 1-7h2l1 7 7 2v2l-7-1v5l3 2v1l-5-1-5 1v-1l3-2v-5-0l-7 1z',book:'M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1m0-15c3-2 6-2 9-1v15c-3-1-6-1-9 1V5',calendar:'M4 5h16v16H4zM8 3v4m8-4v4M4 10h16m-12 4h3m2 0h3m-8 3h3'};
function icon(name){const n=el('span','icon');n.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.book}"/></svg>`;return n;}
let sidePreviewOpening=false;
let data,activeCategory,auth={authenticated:false},draft,editorTab='general',selectedGroup,selectedTool,selectedProject;
async function api(route,options={}){const r=await fetch('./api/'+route,{...options,headers:{'Content-Type':'application/json',...(auth.csrf?{'X-CSRF-Token':auth.csrf}:{}),...options.headers}});const v=await r.json();if(!r.ok)throw new Error(v.error||'Der opstod en fejl.');return v;}
function link(name,url,cls='primary'){const a=el('a',cls,name);a.href=url;a.target='_blank';a.rel='noopener noreferrer';if(cls==='textButton'){a.title=name;a.setAttribute('aria-label',name+' – åbner i nyt vindue');}return a;}
// A normal click on an outbound link requests its own movable browser window.
// PDF panels and internal menus handle their own clicks and are not targeted here.
document.addEventListener('click',e=>{
 const a=e.target.closest?.('a[target="_blank"]');
 if(!a||e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||a.hasAttribute('download'))return;
 const address=a.getAttribute('href');if(!address)return;
 const url=new URL(address,location.href);if(!['http:','https:'].includes(url.protocol))return;
 e.preventDefault();window.open(url.href,'_blank','popup=yes,width=1280,height=900,resizable=yes,scrollbars=yes,noopener,noreferrer');
});
function button(text,cls,fn){const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;}
function copyButton(value,label){
 const b=button('Kopiér','quiet copyButton',async()=>{
  b.disabled=true;
  try{
   if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
   await navigator.clipboard.writeText(value);
   b.textContent='Kopieret ✓';toast('Kopieret til udklipsholder.');
  }catch{b.textContent='Prøv igen';toast('Kunne ikke kopiere. Tillad udklipsholder i browseren, eller kopiér manuelt.');}
  finally{b.disabled=false;setTimeout(()=>{if(b.isConnected)b.textContent='Kopiér';},2200);}
 });
 b.setAttribute('aria-label','Kopiér '+label);b.title='Kopiér '+label;return b;
}
function initializeTheme(){
 const root=document.documentElement;let dark=false;
 try{dark=localStorage.getItem('occ-theme')==='dark';}catch{}
 const toggle=button('','quiet themeToggle',()=>{dark=!dark;apply();try{localStorage.setItem('occ-theme',dark?'dark':'light');}catch{}});
 function apply(){root.dataset.theme=dark?'dark':'light';toggle.textContent=dark?'☀ Lys tilstand':'☾ Mørk tilstand';toggle.setAttribute('aria-label','Mørk tilstand');toggle.setAttribute('aria-pressed',String(dark));}
 const actions=el('div','headerActions'),admin=$('#adminButton');admin.before(actions);actions.append(toggle,admin);apply();
}
initializeTheme();
function toast(msg){$('#toast').textContent=msg;$('#toast').hidden=false;setTimeout(()=>$('#toast').hidden=true,4500);}
function showDetail(eyebrow,title,body,links=[]){$('#detailEyebrow').textContent=eyebrow;const c=$('#detailContent');delete c.dataset.contacts;delete c.dataset.listView;c.replaceChildren(el('h2','',title),el('div','prose',body));const actions=el('div','actions');links.filter(l=>l.url).forEach(l=>actions.append(link(l.name,l.url)));c.append(actions);if(!$('#detail').open){if(sidePreviewOpening){$('#detail').classList.add('sideDetail');$('#detail').show();}else{$('#detail').classList.remove('sideDetail');$('#detail').showModal();}}}
function toolInfo(t){if(t.id.startsWith('library-')){openDocumentLibrary(t.id.slice(8));return;}if(t.display==='pdf'&&t.url){openPdf(t);return;}showDetail('Værktøj',t.name,(!t.url?'Linket er endnu ikke tilføjet.\n\n':'')+(t.description||'Der er endnu ikke tilføjet en forklaring.'),[{name:'Åbn værktøj ↗',url:t.url},{name:'How-to / guideline ↗',url:t.manual}]);}
function openPdf(t){
 if(t.url.startsWith('/OCCtools/documents/')&&typeof openLocalPdf==='function'){openLocalPdf(t);return;}
 let panel=$('#pdfViewer');if(!panel){panel=el('dialog','pdfViewer');panel.id='pdfViewer';document.body.append(panel);panel.addEventListener('close',()=>panel.replaceChildren());}
 panel.replaceChildren();const top=el('div','dialogTop'),heading=el('h2','',t.name),close=button('×','close',()=>panel.close());heading.id='pdfViewerTitle';close.setAttribute('aria-label','Luk PDF');top.append(heading,close);panel.setAttribute('aria-labelledby','pdfViewerTitle');
 const actions=el('div','pdfActions');actions.append(link('Åbn original i nyt vindue ↗',t.url,'quiet'),el('span','muted','Hvis dokumentet ikke vises eller kræver login, brug originalen.'));
 const frame=el('iframe');frame.title=t.name;frame.src=t.url+(t.page?'#page='+t.page:'');frame.referrerPolicy='no-referrer';panel.append(top,actions);if(t.url.startsWith('/OCCtools/documents/')){panel.append(el('p','muted','Lokal kopi – kontrollér gældende version i Comply365.'));if(typeof documentPdfSearch==='function')panel.append(documentPdfSearch(t,frame));}panel.append(frame);if(!panel.open)panel.showModal();
}
function renderEmergency(){
 $('#emergencyShortcut')?.remove();const t=data.categories.flatMap(g=>g.tools).find(t=>t.id==='emergency');if(!t?.url)return;
 const a=link('Emergency ↗',t.url,'emergencyShortcut');a.id='emergencyShortcut';a.setAttribute('aria-label','Emergency – FlightPoint, åbner i nyt vindue');document.body.append(a);
}
const builtInTools=new Set(['occ-calendar','adhoc-calendar','contacts-twr','passwords','runitems']);
function pendingLink(t){return !t.id.startsWith('library-')&&!t.url&&!builtInTools.has(t.id)&&t.id!=='gnatool';}
function startWheel(group){
 if(group?.id==='flightpoint'){
  const wrap=el('div','directShortcut'),home=group.tools.find(t=>t.id==='flightpoint-home');
  const shortcut=link(group.name,home?.url||'https://bwoty.sharepoint.com/sites/FlightPoint/SitePages/Home.aspx','wheelLauncher');
  shortcut.replaceChildren(icon(group.icon),el('strong','',group.name));shortcut.setAttribute('aria-label',group.name+' – åbner i nyt vindue');wrap.append(shortcut);return wrap;
 }
 const tools=group?group.tools.filter(t=>t.id!=='emergency'):['occ-calendar','adhoc-calendar','checklist'].map(id=>data.categories.flatMap(g=>g.tools).find(t=>t.id===id)).filter(Boolean),name=group?.name||'Start vagten',panelId='wheel-'+(group?.id||'start');
 const wrap=el('div','startWheel'),launcher=button('','wheelLauncher',()=>setOpen(panel.hidden));
 launcher.append(icon(group?.icon||'calendar'),el('strong','',name),el('small','',`${tools.length} genveje`));launcher.setAttribute('aria-expanded','false');launcher.setAttribute('aria-controls',panelId);if(tools.length&&tools.every(pendingLink)){launcher.classList.add('awaitingLink');launcher.querySelector('small').textContent='Afventer links';}
 const panel=el('div','wheelPanel');panel.id=panelId;panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-label',name+' – genveje');panel.addEventListener('click',e=>{const seg=e.target.closest?.('.wheelSegment');if(!seg)return;const id=seg.dataset.toolId;if(id==='passwords'||id==='runitems'){e.preventDefault();setOpen(false);openListView(id);}});
 const svgNS='http://www.w3.org/2000/svg',svg=(tag,attrs={})=>{const n=document.createElementNS(svgNS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n;};
 const wheel=svg('svg',{viewBox:'0 0 400 400',class:'wheelDrawing'});
 const point=(r,a)=>[200+r*Math.cos(a*Math.PI/180),200+r*Math.sin(a*Math.PI/180)];
 let page=0;const pageSize=8;function draw(){wheel.replaceChildren();const shown=tools.slice(page*pageSize,(page+1)*pageSize);shown.forEach((t,i)=>{const step=360/shown.length,mid=-90+i*step,start=mid-step/2+1,end=mid+step/2-1;
 const a=point(190,start),b=point(190,end),c=point(67,end),d=point(67,start),large=end-start>180?1:0;
 const segment=svg('a',{class:'wheelSegment',tabindex:'0','aria-label':t.name+(t.url?' – åbner i nyt vindue':' – læs mere'),...(t.url&&t.display!=='pdf'&&!['contacts-twr','adhoc-calendar'].includes(t.id)?{href:t.url,target:'_blank',rel:'noopener noreferrer'}:{role:'button'})});segment.addEventListener('pointerdown',e=>{if(!segment.hasAttribute('href'))e.preventDefault();});segment.dataset.toolId=t.id;if(pendingLink(t))segment.classList.add('awaitingLink');if(t.id==='runitems'||t.id==='passwords'){const openList=e=>{e.preventDefault();e.stopImmediatePropagation();setOpen(false);openListView(t.id);};segment.addEventListener('click',openList);segment.addEventListener('pointerup',openList);}
 if(t.id==='occ-calendar'){segment.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){clearTimeout(calendarCloseTimer);calendarOpenTimer=setTimeout(()=>openCalendarQuickView(true),250);}});segment.addEventListener('pointerleave',()=>{clearTimeout(calendarOpenTimer);scheduleCalendarClose();});}
 if(t.id==='adhoc-calendar'){segment.addEventListener('click',e=>{e.preventDefault();setOpen(false);selectedCalendar='adhocCalendar';calendarSnapshot=flightpointData?.adhocCalendar||null;openCalendarQuickView();});segment.setAttribute('aria-label',t.name+' – hent nyeste data');}
 const shape=svg('path',{d:`M ${a} A 190 190 0 ${large} 1 ${b} L ${c} A 67 67 0 ${large} 0 ${d} Z`});
 const title=svg('title');title.textContent=t.description||t.name;segment.append(title,shape);
 const [x,y]=point(shown.length>4?140:128,mid),glyph=svg('svg',{x:x-11,y:y-37,width:22,height:22,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.6','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'});glyph.append(svg('path',{d:paths[t.id==='checklist'?'book':(group?.icon||'calendar')]}));segment.append(glyph);
 const label=svg('text',{x,y:y-2,'text-anchor':'middle'});const names={'occ-calendar':['OCC-kalender'],'adhoc-calendar':['Adhoc / Maint','kalender'],checklist:['OCC-checklister']};const lines=names[t.id]||wrapWords(t.name,shown.length>4?13:18);lines.slice(0,3).forEach((line,j)=>{const s=svg('tspan',{x,dy:j?17:0});s.textContent=line+(j===2&&lines.length>3?'…':'');label.append(s);});segment.append(label);if(pendingLink(t)||t.id==='gnatool'){const status=svg('text',{x,y:y+Math.min(lines.length,3)*17+4,'text-anchor':'middle',class:'wheelLinkStatus'});status.textContent=t.id==='gnatool'?'Via Raido':'Afventer link';segment.append(status);}if(!t.url){const pending=svg('title');pending.textContent='Link tilføjes – klik for information';segment.append(pending);segment.setAttribute('aria-label',t.name+(t.id==='gnatool'?' – via Raido, læs mere':' – afventer link, læs mere'));}
 if(t.display==='pdf'&&t.url){segment.setAttribute('aria-label',t.name+' – vis PDF');segment.addEventListener('click',e=>{e.preventDefault();setOpen(false);openPdf(t);});segment.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();segment.dispatchEvent(new Event('click'));}});}else if(t.id==='occ-calendar'){segment.addEventListener('click',e=>{e.preventDefault();setOpen(false);openCalendarQuickView();});segment.setAttribute('aria-label','OCC-kalender – vis tre dage');}else if(t.id==='contacts-twr'){segment.addEventListener('click',e=>{e.preventDefault();setOpen(false);openContacts();});segment.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();segment.dispatchEvent(new Event('click'));}});segment.setAttribute('aria-label','Airlines contacts / TWR – åbn kontaktliste');}else if(!t.url){segment.addEventListener('click',()=>{setOpen(false);toolInfo(t);});segment.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();segment.dispatchEvent(new Event('click'));}});}else segment.addEventListener('click',()=>setOpen(false));
 if(t.id.startsWith('library-')){segment.setAttribute('aria-label',t.name+' – åbn dokumentbibliotek');const titles=segment.querySelectorAll('title');if(titles.length>1)titles[titles.length-1].remove();}
 segment.addEventListener('contextmenu',e=>{e.preventDefault();setOpen(false);toolInfo(t);});wheel.append(segment);
 });}draw();
 const close=button('','wheelCenter',()=>setOpen(false));close.setAttribute('aria-label','Luk '+name);close.append(icon(group?.icon||'calendar'),el('small','','Luk ×'));panel.append(wheel,close);if(!tools.length)panel.append(el('p','wheelEmpty','Ingen links endnu.'));if(tools.length>pageSize){const next=button('Flere links →','quiet wheelNext',()=>{page=(page+1)%Math.ceil(tools.length/pageSize);draw();next.textContent=`Flere links → (${page+1}/${Math.ceil(tools.length/pageSize)})`;});panel.append(next);}wrap.append(launcher,panel);if(group){launcher.oncontextmenu=e=>{e.preventDefault();categoryInfo(group);};}
 function setOpen(open){document.querySelectorAll('.startWheel').forEach(w=>{if(w!==wrap){w.querySelector('.wheelPanel').hidden=true;w.querySelector('.wheelLauncher').setAttribute('aria-expanded','false');w.classList.remove('isOpen');}});panel.hidden=!open;wrap.classList.toggle('isOpen',open);launcher.setAttribute('aria-expanded',String(open));launcher.focus();}
 wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();setOpen(false);}if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(e.key)&&!panel.hidden){const links=[...panel.querySelectorAll('a'),close],index=links.indexOf(document.activeElement),back=e.key==='ArrowLeft'||e.key==='ArrowUp';if(index>=0||document.activeElement===launcher){e.preventDefault();links[index<0?(back?links.length-1:0):(index+(back?-1:1)+links.length)%links.length].focus();}}});
 wrap.addEventListener('focusout',()=>setTimeout(()=>{if(!wrap.contains(document.activeElement)){panel.hidden=true;launcher.setAttribute('aria-expanded','false');}}));
 if(!group){const b=button('▦ Kalender · 3 dage','wheelHelp',()=>openCalendarQuickView());b.setAttribute('aria-controls','calendarFloat');b.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){clearTimeout(calendarCloseTimer);calendarOpenTimer=setTimeout(()=>openCalendarQuickView(true),250);}});b.addEventListener('pointerleave',()=>{clearTimeout(calendarOpenTimer);scheduleCalendarClose();});wrap.append(b);}return wrap;
}
function wrapWords(text,max){const words=text.split(/\s+/),lines=[];let line='';for(const word of words){if(line&&(line+' '+word).length>max){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;}
document.addEventListener('pointerdown',e=>{document.querySelectorAll('.startWheel').forEach(w=>{if(!w.contains(e.target)){w.querySelector('.wheelPanel').hidden=true;w.querySelector('.wheelLauncher').setAttribute('aria-expanded','false');w.classList.remove('isOpen');}});});document.addEventListener('click',e=>{const seg=e.composedPath?.().find(n=>n?.dataset?.toolId);if(seg&&(seg.dataset.toolId==='runitems'||seg.dataset.toolId==='passwords')){e.preventDefault();e.stopImmediatePropagation();openListView(seg.dataset.toolId);}},true);
function render(){data.categories.forEach(g=>g.tools.forEach(t=>{if(t.id==='runitems')t.name='Åbne checklister';}));document.title=data.title;const p=$('#portal');p.replaceChildren();const title=el('div','pageTitle');const left=el('div');left.append(el('h1','',data.title),el('p','','Dine værktøjer og nye tiltag i OCC.'));title.append(left,el('span','eyebrow','Fælles overblik · daglig operation'));p.append(title);
title.lastElementChild.remove();
p.append(portalSearch());
const projects=data.projects.filter(x=>x.visible);
const head=el('div','sectionHead');head.append(el('h2','','Værktøjer'),el('span','muted','Åbn et område'));p.append(head);const nav=el('nav','wheelCategories');nav.setAttribute('aria-label','Værktøjskategorier');data.categories.forEach(g=>nav.append(startWheel(g)));renderEmergency();p.append(nav);document.dispatchEvent(new Event('portalrender'));if(data.projectsVisible&&projects.length)p.append(projectTimeline(projects));p.hidden=false;$('#loading').hidden=true;}
function projectInfo(p,milestone){
 closeCalendarFloat();
 showDetail('Nye tiltag',p.name+' · '+p.label,'');
 const c=$('#detailContent');
 c.append(el('p','projectDetailStatus',[p.status,p.date].filter(Boolean).join(' · ')),el('p','projectLead',p.summary));
 if(milestone)c.append(el('p','notice',milestone.date+' — '+milestone.text));
 if(p.id==='gna'){
  const docs=el('section','projectManuals');docs.append(el('h3','','Manualer til GnA'),el('p','muted','Start med OCC-vejledningen. PowerPointen er udarbejdet ud fra hovedmanualen fra Avionworx.'));
  const ppt=link('Hent OCC-vejledning · PowerPoint ↓','./manuals/gna-occ-howto.pptx','primary');ppt.download='GnA Slot Browser Extension OCC HowTo.pptx';
  const pdf=link('Åbn hovedmanual · PDF ↗','./manuals/gna-slot-extension.pdf','quiet');
  const actions=el('div','actions');actions.append(ppt,pdf);docs.append(actions,el('p','muted','OCC-vejledning: 12 slides. Hovedmanual: 11 sider, udgivet 3. september 2026.'));
  c.append(docs);
  c.append(el('p','prose','Materialet gennemgår browserudvidelsens opsætning og fanerne Slots, SAQ og Inbox. Brug manualerne til den detaljerede arbejdsgang; datoerne nedenfor er projektets plan og ikke en bekræftelse på idriftsættelse.'));
 }
 for(const paragraph of String(p.body||'').split(/\n\s*\n/)){
  const lines=paragraph.split('\n'),block=el('section','projectDetailSection');
  if(lines.length>1){block.append(el('h3','',lines.shift()),el('p','prose',lines.join('\n')));}else block.append(el('p','prose',paragraph));c.append(block);
 }
 if(p.milestones.length){const list=el('ul','projectMilestoneList');c.append(el('h3','','Tidspunkter og milepæle'));for(const m of p.milestones){const li=el('li');li.append(el('strong','',m.date),document.createTextNode(' · '+m.text));list.append(li);}c.append(list);}
}
function projectTimeline(projects){
 const section=el('details','sharedProjects projectDropdown'),summary=el('summary');summary.append(el('span','','Nye tiltag · Efterår 2026'),el('span','projectExpandHint','Åbn overblik, tidslinje og manualer'));section.append(summary);
 section.append(el('p','muted','Klik på “Læs mere” for at se, hvad tiltaget betyder for OCC. Du kan også klikke på en milepæl i tidslinjen.'));
 const cards=el('div','projectOverview');
 projects.forEach(p=>{const card=el('article','projectOverviewCard');card.append(el('span','eyebrow',p.status),el('h3','',p.name),el('p','',p.label),el('p','muted',p.summary));const more=button(p.id==='gna'?'Læs mere og se manualer →':'Læs mere om '+p.name+' →','projectReadMore',()=>projectInfo(p));card.append(more);cards.append(card);});section.append(cards,el('h3','projectTimelineTitle','Fælles tidslinje'));
 const months=['januar','februar','marts','april','maj','juni','juli','august','september','oktober','november','december'];
 const entries=projects.flatMap(p=>p.milestones.map(m=>{const lower=m.date.toLowerCase(),month=months.findIndex(n=>lower.includes(n)),year=Number(lower.match(/20\d{2}/)?.[0]||new Date().getFullYear());return {p,m,month:month<0?null:year*12+month};}));
 const dated=entries.filter(x=>x.month!==null),now=new Date(),fallback=now.getFullYear()*12+now.getMonth();
 const first=dated.length?Math.min(...dated.map(x=>x.month)):fallback,last=dated.length?Math.max(...dated.map(x=>x.month)):fallback+2;
 const scroll=el('div','projectTimelineScroll'),grid=el('div','projectMonthGrid');grid.style.gridTemplateColumns='140px repeat('+(last-first+1)+', minmax(220px, 1fr))';grid.append(el('div','monthHeader','Projekt'));
 for(let m=first;m<=last;m++)grid.append(el('div','monthHeader',months[m%12]+' '+Math.floor(m/12)));
 projects.forEach(p=>{const label=button('','projectRowLabel',()=>projectInfo(p));label.append(el('strong','',p.name),el('small','projectTimelineMore','Læs mere →'));grid.append(label);for(let m=first;m<=last;m++){const cell=el('div','projectMonthCell');entries.filter(x=>x.p===p&&x.month===m).sort((a,b)=>(Number(a.m.date.match(/^(\d+)/)?.[1])||15)-(Number(b.m.date.match(/^(\d+)/)?.[1])||15)).forEach(x=>{const b=button('','projectMonthEvent',()=>projectInfo(p,x.m));b.append(el('small','',x.m.date),el('strong','',x.m.text),el('span','projectTimelineMore','Se detaljer →'));cell.append(b);});grid.append(cell);}});
 scroll.append(grid);section.append(scroll);
 const other=entries.filter(x=>x.month===null);if(other.length){const notes=el('div','ongoing');other.forEach(({p,m})=>notes.append(button(p.name+' · '+m.date+': '+m.text+' · Læs mere →','ongoingItem',()=>projectInfo(p,m))));section.append(notes);}
 return section;
}
function categoryInfo(g){showDetail('Område',g.name,g.description||'Der er endnu ikke tilføjet en forklaring.',[{name:'How-to / guideline ↗',url:g.manual}]);}
function renderTools(){const panel=$('#toolsPanel'),g=data.categories.find(g=>g.id===activeCategory);panel.replaceChildren();if(!g){panel.append(el('p','empty','Der er endnu ingen værktøjskategorier.'));return;}const head=el('div','panelHead'),text=el('div');text.append(el('h3','',g.name),el('p','',g.description));const more=button('⋯','quiet',()=>categoryInfo(g));more.setAttribute('aria-label',`Information og guideline til ${g.name}`);head.append(text,more);panel.append(head);const grid=el('div','toolGrid');g.tools.forEach(t=>{const row=el('div','tool');const main=t.url?link(' ',t.url,'toolMain'):el('div','toolMain disabled');const text=el('span');text.append(el('strong','',t.name));if(!t.url)text.append(el('small','','Link tilføjes'));main.append(text);if(t.url)main.append(el('span','muted','↗'));const more=button('ⓘ','info',()=>toolInfo(t));more.title='Forklaring og how-to';more.setAttribute('aria-label',`Om ${t.name}`);row.append(main,more);row.oncontextmenu=e=>{e.preventDefault();toolInfo(t);};grid.append(row);});panel.append(grid);if(!g.tools.length)panel.append(el('p','empty','Ingen værktøjer i dette område endnu.'));}
function closeAdmin(){if(auth.authenticated&&draft&&JSON.stringify(draft)!==JSON.stringify(data)&&!confirm('Luk uden at gemme dine ændringer?'))return;$('#admin').close();}
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').id==='admin'?closeAdmin():b.closest('dialog').close());
$('#admin').addEventListener('cancel',e=>{e.preventDefault();closeAdmin();});
$('#helpButton').onclick=()=>showDetail('Hjælp','Når et link ikke åbner','Værktøjerne åbner i en ny fane. FlightPoint og Power Apps bruger dit Microsoft-login.\n\nNogle interne værktøjer kræver adgang til virksomhedens netværk eller VPN.\n\nHvis Edge ændrer http:// til https://, kan du kopiere linkets adresse og prøve den i Firefox. Portalen bevarer den adresse, der er gemt, men kan ikke styre browserens sikkerhedspolitikker eller åbne en bestemt browser automatisk.\n\nEt værktøj med “Link tilføjes” har endnu ingen adresse på portalen.');
$('#adminButton').onclick=async()=>{try{auth=await api('session');openAdmin();}catch(e){toast(e.message);}};
function openAdmin(){const c=$('#adminContent');c.replaceChildren();if(!auth.authenticated){c.append(el('h2','','Log ind som admin'),el('p','muted','Redigér links, menuer og projektinformation.'));const form=el('form');const u=field('Brugernavn','Lasse'),pw=field('Adgangskode','','password');u.input.autocomplete='username';pw.input.autocomplete='current-password';const err=el('p','error');const submit=el('button','primary','Log ind');submit.type='submit';form.append(u.label,pw.label,err,submit);form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;try{auth=await api('login',{method:'POST',body:JSON.stringify({username:u.input.value,password:pw.input.value})});openAdmin();}catch(ex){err.textContent=ex.message;}finally{submit.disabled=false;}};c.append(form);if(!auth.configured)c.append(el('p','notice','Adminadgang aktiveres under installation på serveren. Forsiden kan allerede bruges.'));}else{draft=structuredClone(data);editorTab='general';renderEditor();}if(!$('#admin').open)$('#admin').showModal();}
function field(label,value,type='text',onchange){const l=el('label','field',label);const input=type==='textarea'?el('textarea'):type==='select'?el('select'):el('input');if(input.tagName==='INPUT')input.type=type;input.value=value??'';if(onchange)input.oninput=()=>onchange(input.value);l.append(input);return{label:l,input};}
function renderEditor(){const c=$('#adminContent');c.replaceChildren();const head=el('div','adminHeader');head.append(el('h2','','Redigér portalen'),button('Log ud','quiet',async()=>{try{await api('logout',{method:'POST',body:'{}'});auth={authenticated:false};openAdmin();}catch(e){toast(e.message);}}));c.append(head,el('p','notice','Menuændringer udgives med “Gem ændringer”. PDF-upload og PDF-udskiftning gemmes straks.'));const nav=el('div','editorNav');[['general','Generelt'],['tools','Menuer og links'],['projects','Projekter'],['documents','PDF-dokumenter']].forEach(([key,name])=>{const b=button(name,'quiet',()=>{editorTab=key;renderEditor();});b.setAttribute('aria-pressed',String(editorTab===key));nav.append(b);});c.append(nav);const area=el('div');c.append(area);
if(editorTab==='general'){area.append(field('Sidens overskrift',draft.title,'text',v=>draft.title=v).label);const l=el('label','check');const input=el('input');input.type='checkbox';input.checked=draft.projectsVisible;input.onchange=()=>draft.projectsVisible=input.checked;l.append(input,document.createTextNode('Vis projektområdet og tidslinjen'));area.append(l);}
if(editorTab==='tools')renderToolsEditor(area);
if(editorTab==='projects')renderProjectsEditor(area);
if(editorTab==='documents')renderDocumentsAdmin(area);
const error=el('p','error');error.setAttribute('role','alert');const actions=el('div','actions');const save=button('Gem ændringer','primary',async()=>{save.disabled=true;error.textContent='';try{data=await api('content',{method:'PUT',body:JSON.stringify(draft)});draft=structuredClone(data);render();toast('Ændringerne er gemt.');}catch(e){error.textContent=e.message;}finally{save.disabled=false;}});actions.append(save,button('Luk','quiet',()=>{if(confirm('Luk admin? Ændringer, der ikke er gemt, går tabt.'))$('#admin').close();}));c.append(error,actions);}
function picker(label,items,selected,onchange){const f=field(label,'','select');items.forEach(x=>{const o=el('option','',x.name);o.value=x.id;f.input.append(o);});f.input.value=selected||'';f.input.onchange=()=>onchange(f.input.value);return f.label;}
function uid(){return 'id-'+Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');}
function move(items,item,delta){const i=items.indexOf(item),j=i+delta;if(j<0||j>=items.length)return;items.splice(i,1);items.splice(j,0,item);renderEditor();}
function renderToolsEditor(area){if(!draft.categories.some(g=>g.id===selectedGroup))selectedGroup=draft.categories[0]?.id;area.append(picker('Menu',draft.categories,selectedGroup,v=>{selectedGroup=v;selectedTool=null;renderEditor();}));area.append(button('+ Ny menu','quiet',()=>{const g={id:uid(),name:'Ny menu',icon:'book',description:'',manual:'',tools:[]};draft.categories.push(g);selectedGroup=g.id;renderEditor();}));const g=draft.categories.find(g=>g.id===selectedGroup);if(!g)return;
area.append(field('Menunavn',g.name,'text',v=>g.name=v).label,field('Forklaring til menu',g.description,'textarea',v=>g.description=v).label,field('Fælles how-to / guideline-link',g.manual,'url',v=>g.manual=v).label);const icons=field('Ikon','','select');Object.keys(paths).forEach((key,i)=>{const o=el('option','',['Hotel','Roster','Fly','Manual','Kalender'][i]);o.value=key;icons.input.append(o);});icons.input.value=g.icon;icons.input.onchange=()=>g.icon=icons.input.value;area.append(icons.label);const ga=el('div','actions');ga.append(button('Flyt menu op','quiet',()=>move(draft.categories,g,-1)),button('Flyt menu ned','quiet',()=>move(draft.categories,g,1)),button('Slet menu','quiet danger',()=>{if(confirm(`Slet ${g.name} og dens ${g.tools.length} links?`)){draft.categories=draft.categories.filter(x=>x!==g);renderEditor();}}));area.append(ga,el('h3','','Værktøjer i menuen'));
if(!g.tools.some(t=>t.id===selectedTool))selectedTool=g.tools[0]?.id;area.append(picker('Værktøj',g.tools,selectedTool,v=>{selectedTool=v;renderEditor();}),button('+ Nyt link','quiet',()=>{const t={id:uid(),name:'Nyt værktøj',url:'',description:'',manual:''};g.tools.push(t);selectedTool=t.id;renderEditor();}));const t=g.tools.find(x=>x.id===selectedTool);if(!t)return;area.append(field('Navn',t.name,'text',v=>t.name=v).label,field('Adresse (http:// eller https://)',t.url,'url',v=>t.url=v).label,field('Hvad kan man i værktøjet?',t.description,'textarea',v=>t.description=v).label,field('How-to / guideline-link',t.manual,'url',v=>t.manual=v).label,picker('Flyt værktøjet til menu',draft.categories,g.id,v=>{if(v===g.id)return;g.tools=g.tools.filter(x=>x!==t);draft.categories.find(x=>x.id===v).tools.push(t);selectedGroup=v;renderEditor();}));area.append(picker('Åbn som',[{id:'link',name:'Link i nyt vindue'},{id:'pdf',name:'PDF i fast panel'}],t.display||'link',v=>{t.display=v;}));const ta=el('div','actions');ta.append(button('Flyt link op','quiet',()=>move(g.tools,t,-1)),button('Flyt link ned','quiet',()=>move(g.tools,t,1)),button('Slet link','quiet danger',()=>{if(confirm(`Slet ${t.name}?`)){g.tools=g.tools.filter(x=>x!==t);renderEditor();}}));area.append(ta);}
function renderProjectsEditor(area){if(!draft.projects.some(p=>p.id===selectedProject))selectedProject=draft.projects[0]?.id;area.append(picker('Projekt',draft.projects,selectedProject,v=>{selectedProject=v;renderEditor();}),button('+ Nyt projekt','quiet',()=>{const p={id:uid(),name:'Nyt projekt',label:'',status:'Planlagt',date:'',summary:'',visible:true,milestones:[],body:''};draft.projects.push(p);selectedProject=p.id;renderEditor();}));const p=draft.projects.find(x=>x.id===selectedProject);if(!p)return;[['Projektnavn','name'],['Underoverskrift','label'],['Status','status'],['Kort dato på kortet','date']].forEach(([label,key])=>area.append(field(label,p[key],'text',v=>p[key]=v).label));area.append(field('Kort beskrivelse',p.summary,'textarea',v=>p.summary=v).label,field('Uddybende tekst',p.body,'textarea',v=>p.body=v).label);const l=el('label','check'),check=el('input');check.type='checkbox';check.checked=p.visible;check.onchange=()=>p.visible=check.checked;l.append(check,document.createTextNode('Vis projektet på forsiden'));area.append(l,el('h3','','Milepæle'));p.milestones.forEach((m,i)=>{const row=el('div','formRow');row.append(field('Dato / forventning',m.date,'text',v=>m.date=v).label,field('Beskrivelse',m.text,'text',v=>m.text=v).label);area.append(row,button('Fjern milepæl','quiet',()=>{p.milestones.splice(i,1);renderEditor();}));});area.append(button('+ Milepæl','quiet',()=>{p.milestones.push({date:'',text:''});renderEditor();}));const actions=el('div','actions');actions.append(button('Flyt projekt op','quiet',()=>move(draft.projects,p,-1)),button('Flyt projekt ned','quiet',()=>move(draft.projects,p,1)),button('Slet projekt','quiet danger',()=>{if(confirm(`Slet projektet ${p.name}?`)){draft.projects=draft.projects.filter(x=>x!==p);renderEditor();}}));area.append(actions);}
let calendarSnapshot=null,calendarOpenTimer,calendarCloseTimer,calendarPinned=false,calendarQuery='';
function scheduleCalendarClose(){clearTimeout(calendarCloseTimer);calendarCloseTimer=setTimeout(()=>{const p=$('#calendarFloat');if(p&&!calendarPinned&&!p.matches(':hover')&&!p.contains(document.activeElement))closeCalendarFloat();},450);}
function closeCalendarFloat(){clearTimeout(calendarCloseTimer);$('#calendarFloat')?.remove();calendarPinned=false;}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCalendarFloat();});
document.addEventListener('pointerdown',e=>{const p=$('#calendarFloat');if(p&&!p.contains(e.target)&&!e.target.closest('[aria-controls="calendarFloat"]'))closeCalendarFloat();});
function portalSearchLegacy(){const section=el('section','portalSearch'),label=el('label','searchLabel','Søg i OCC'),input=el('input'),results=el('div','searchResults'),status=el('p','muted');input.type='search';input.placeholder='Værktøjer, links, projekter og kalender…';label.append(input);results.hidden=true;status.setAttribute('role','status');section.append(label,status,results);
 function search(){const q=input.value.trim().toLocaleLowerCase('da');results.replaceChildren();results.hidden=!q;status.textContent='';if(!q)return;const found=[];data.categories.forEach(g=>g.tools.forEach(t=>{if([g.name,t.name,t.url,t.description,t.manual].join(' ').toLocaleLowerCase('da').includes(q))found.push({title:t.name,kind:g.name,action:()=>toolInfo(t)});}));data.projects.filter(p=>p.visible).forEach(p=>{if([p.name,p.summary,p.body].join(' ').toLocaleLowerCase('da').includes(q))found.push({title:p.name,kind:'Projekt',action:()=>projectInfo(p)});});calendarSnapshot?.items.forEach(t=>{if([t.title,t.category,calendarPlain(t.description)].join(' ').toLocaleLowerCase('da').includes(q))found.push({title:t.title,kind:`Kalender · ${t.start}`,action:()=>{calendarQuery=q;openCalendarQuickView();}});});status.textContent=`${found.length} resultater${calendarSnapshot?' · kalender fra testudtræk':''}`;found.slice(0,40).forEach(r=>{const b=button('','searchResult',r.action);b.append(el('strong','',r.title),el('small','muted',r.kind));results.append(b);});if(!found.length)results.append(el('p','empty','Ingen match i de tilgængelige data.'));if(found.length>40)results.append(el('p','muted','Viser de første 40. Skriv mere for at afgrænse.'));}
 input.oninput=search;input.addEventListener('focus',async()=>{if(!calendarSnapshot){try{const r=await api('calendar-preview');if(r.available){calendarSnapshot=normalizeCalendar(r.snapshot);search();}}catch{}}});return section;}
function normalizeCalendar(raw){
 const rows=raw?.body?.value||raw?.items||raw?.value;if(!Array.isArray(rows))throw new Error('Filen skal indeholde body.value eller items fra kalenderflowet.');
 if(raw.statusCode&&raw.statusCode!==200)throw new Error('Flowet rapporterer en fejl.');
 const stamp=raw.headers?.Date||raw.generatedAt||null;
 const validDay=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
 const items=rows.map(t=>({id:t.ID??t.id,title:t.Title??t.title??'',start:t.StartTime??t.start??t.FlightDate?.slice(0,10),end:t.EndTime??t.end??t.FlightDate?.slice(0,10),description:t.Description??t.descriptionHtml??'',category:t.Category?.Value??(typeof t.category==='string'?t.category:''),url:t['{Link}']??t.url??''}));
 if(items.some(t=>!validDay(t.start)||!validDay(t.end)||t.end<t.start||typeof t.title!=='string'||typeof t.description!=='string'))throw new Error('En kalenderpost har ugyldig dato eller tekst.');
 let date=raw.coverageStart;if(!validDay(date)){const d=stamp?new Date(stamp):new Date();if(Number.isNaN(d.getTime()))throw new Error('Opdateringstidspunktet er ugyldigt.');date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Copenhagen'}).format(d);}
 return {items,stamp,date,partial:!!raw.body?.['@odata.nextLink']||!!raw.partial,live:!!raw.live};
}
function calendarPlain(html){const clean=html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<\s*br\s*\/?\s*>|<\/\s*(p|div|li)\s*>/gi,'\n').replace(/<[^>]*>/g,'');const box=document.createElement('textarea');box.innerHTML=clean;return box.value.replace(/\u200b/g,'').trim();}
async function openCalendarQuickView(hover=false){
 clearTimeout(calendarCloseTimer);if(!hover)calendarPinned=true;let panel=$('#calendarFloat');if(panel){if(!hover)await ensureFlightpoint();return;}panel=el('section','calendarFloat');panel.id='calendarFloat';panel.setAttribute('role','region');panel.setAttribute('aria-label','Kalender for tre dage');const top=el('div','dialogTop');top.append(el('span','eyebrow','FlightPoint · kalender'),button('Luk ×','quiet',closeCalendarFloat));const c=el('div');c.id='calendarFloatContent';panel.append(top,c);panel.addEventListener('pointerenter',()=>clearTimeout(calendarCloseTimer));panel.addEventListener('pointerleave',scheduleCalendarClose);panel.addEventListener('focusout',scheduleCalendarClose);document.body.append(panel);c.replaceChildren(el('h2','','Kalender · tre dage'),el('p','','Henter kalender…'));
 if(!hover){await ensureFlightpoint();renderCalendarQuickView();return;}
 if(!calendarSnapshot){try{const response=await api('flightpoint');if(response.data)acceptFlightpoint(response.data);}catch{}}
 renderCalendarQuickView();
}
$('#detail').addEventListener('close',()=>$('#detail').classList.remove('calendarDialog'));
function addCalendarImport(c){const actions=el('div','actions'),input=el('input');input.type='file';input.accept='.json,.txt,application/json,text/plain';input.id='calendarFile';input.hidden=true;input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{if(file.size>5000000)throw new Error('Filen er for stor (maks. 5 MB).');calendarSnapshot=normalizeCalendar(JSON.parse(await file.text()));renderCalendarQuickView();}catch(e){toast(e.message);}};actions.append(button('Indlæs flow-resultat','quiet',()=>input.click()),link('Åbn kalender i FlightPoint ↗','https://bwoty.sharepoint.com/sites/FlightPoint/Lists/Calendar/CalendarView.aspx','quiet'),input);c.append(actions);}
function mergedCalendar(){
 if(!flightpointData)return calendarSnapshot;
 const sources=[['calendar','OCC'],['adhocCalendar','Adhoc / Maint']];
 const base=flightpointData.calendar;
 return {...base,partial:sources.some(([k])=>flightpointData[k]?.partial),items:sources.flatMap(([key,source])=>(flightpointData[key]?.items||[]).map(item=>({...item,id:key+':'+item.id,source})))};
}
function renderCalendarQuickView(){const c=$('#calendarFloatContent');if(!c)return;calendarSnapshot=mergedCalendar();c.replaceChildren(el('h2','','Kalender · tre dage'));const tabs=el('div','editorNav');const refresh=button(flightpointLoading?'Henter…':'Opdatér fra FlightPoint','quiet',refreshFlightpoint);refresh.disabled=flightpointLoading;tabs.append(refresh);c.append(tabs);if(flightpointError)c.append(el('p','error',flightpointError+' Tidligere data er ikke opdateret.'));if(!calendarSnapshot){c.append(el('p','notice',flightpointLoading?'Henter friske kalenderdata…':'Klik på Opdatér fra FlightPoint for at hente de tre dage.'));return;}
 const snap=calendarSnapshot,fmt=new Intl.DateTimeFormat('da-DK',{day:'numeric',month:'long',weekday:'long',timeZone:'UTC'}),stamp=snap.stamp?new Intl.DateTimeFormat('da-DK',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Copenhagen'}).format(new Date(snap.stamp)):'ukendt tidspunkt';
 c.append(el('p','notice',snap.live?`Hentet fra FlightPoint ${stamp}. Klik på Opdatér for at hente igen.`:`Testudtræk · hentet ${stamp}. Ingen automatisk opdatering.`));if(snap.partial)c.append(el('p','error','Udtrækket indeholder flere sider. Oversigten kan mangle poster.'));
 const days=el('div','calendarDays');for(let i=0;i<3;i++){const d=new Date(snap.date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);const iso=d.toISOString().slice(0,10),items=snap.items.filter(t=>t.start<=iso&&t.end>=iso).sort((a,b)=>a.start.localeCompare(b.start)||a.title.localeCompare(b.title,'da'));
 const day=el('section','calendarDay');day.append(el('h3','',fmt.format(d)),el('span','muted',`${items.length} kalenderposter`));for(const t of items){const card=el('details','calendarEvent'),summary=el('summary');summary.append(el('span','projectTag',[t.source,t.category].filter(Boolean).join(' · ')||'Kalender'),el('strong','',t.title),el('small','muted',t.start!==t.end?'Gælder flere dage':'Dagsoplysning'));card.append(summary);const text=calendarPlain(t.description);card.append(el('p','prose',text||'Ingen yderligere beskrivelse i udtrækket.'));if(/<img\b/i.test(t.description))card.append(el('p','notice','Denne post indeholder et billede, som ikke følger med i udtrækket. Åbn originalen i FlightPoint for at se det.'));if(t.start!==t.end)card.append(el('p','muted',`${t.start} – ${t.end}`));try{const u=new URL(t.url);if(u.protocol==='https:'&&u.hostname==='bwoty.sharepoint.com')card.append(link('Åbn original ↗',u.href,'textButton'));}catch{}day.append(card);}if(!items.length)day.append(el('p','empty',snap.partial?'Ingen poster i denne del af udtrækket.':'Ingen poster i udtrækket for denne dag.'));days.append(day);}
 const filter=el('label','searchLabel','Søg i kalenderen'),input=el('input');input.type='search';input.placeholder='Søg i titel, kategori og beskrivelse…';input.value=calendarQuery;filter.append(input);c.append(filter,days);function applyFilter(){calendarQuery=input.value;const q=calendarQuery.trim().toLocaleLowerCase('da');days.querySelectorAll('.calendarDay').forEach(day=>{let count=0;day.querySelectorAll('.calendarEvent').forEach(card=>{card.hidden=!card.textContent.toLocaleLowerCase('da').includes(q);if(!card.hidden)count++;});day.querySelector(':scope > .muted').textContent=`${count} ${q?'match':'kalenderposter'}`;});}input.oninput=applyFilter;applyFilter();addCalendarImport(c);
}
let flightpointData=null,flightpointLoading=false,flightpointError='',selectedCalendar='calendar',contactsQuery='',listView='',runitemDone=new Set();
function acceptFlightpoint(raw){const calendar=normalizeCalendar({...raw.calendar,generatedAt:raw.generatedAt,live:true}),adhocCalendar=normalizeCalendar({...raw.adhocCalendar,generatedAt:raw.generatedAt,live:true});const text=v=>typeof v==='string'?v:typeof v==='number'?String(v):v?.Value||'';const rows=k=>raw[k]?.value||[];const contacts=rows('contacts').map(t=>({id:t.ID,title:text(t.Title),phone:text(t.Phone),email:text(t.Email),url:text(t['{Link}'])}));const passwords=rows('passwords').map(t=>({id:t.ID,title:text(t.Title),user:text(t.UserName),password:text(t.Password),url:text(t.URL)||text(t['{Link}'])}));const runitems=rows('runitems').map(t=>{const run=text(t.Run),parts=run.trim().match(/^(\d{4}-\d{2}-\d{2})\s+(D|CD|N|CN)$/i),done=t.Completed===true||t.Done===true||['true','yes'].includes(text(t.Completed??t.Done).toLowerCase());return{id:t.ID,title:text(t.Title)||run,day:text(t.Day||t.Code||t.Duty||parts?.[2]).toUpperCase(),date:text(t.FlightDate||parts?.[1]),description:text(t.Description),done,status:text(t.Status)};});flightpointData={calendar,adhocCalendar,contacts,passwords,runitems,contactsPartial:!!raw.contacts?.partial,passwordsPartial:!!raw.passwords?.partial,runitemsPartial:!!raw.runitems?.partial,stamp:raw.generatedAt};calendarSnapshot=flightpointData[selectedCalendar];}
let flightpointRequest=null;
async function refreshFlightpoint(){
 if(flightpointRequest)return flightpointRequest;
 flightpointLoading=true;flightpointError='';
 const draw=()=>{renderCalendarQuickView();renderContacts();renderPasswordsView();};
 draw();
 flightpointRequest=(async()=>{try{const r=await api('flightpoint',{method:'POST',body:'{}'});acceptFlightpoint(r.data);}catch(e){flightpointError=e.message;}finally{flightpointLoading=false;draw();$('#portalSearchInput')?.dispatchEvent(new Event('input'));}})();
 try{return await flightpointRequest;}finally{flightpointRequest=null;}
}
function ensureFlightpoint(){return flightpointData?Promise.resolve():refreshFlightpoint();}
let openChecklistCache=null,openChecklistPending=null;
async function loadOpenChecklistData(force=false){
 if(openChecklistPending)return openChecklistPending;
 if(openChecklistCache&&!force)return openChecklistCache;
 openChecklistPending=api('runitems',{method:'POST',body:'{}'}).then(r=>{if(!Array.isArray(r.data?.runitems?.value))throw new Error('Svaret mangler checklist-punkter.');openChecklistCache=r;return r;});
 try{return await openChecklistPending;}finally{openChecklistPending=null;}
}
async function openContacts(query=''){closeCalendarFloat();contactsQuery=query;showDetail('FlightPoint','Airlines Contacts / TWR','Henter kontakter…');$('#detailContent').dataset.contacts='true';renderContacts();await ensureFlightpoint();}
$('#detail').addEventListener('close',()=>delete $('#detailContent').dataset.contacts);
function renderContacts(){const c=$('#detailContent');if(!$('#detail').open||!c.dataset.contacts)return;c.replaceChildren(el('h2','','Airlines Contacts / TWR'));const refresh=button(flightpointLoading?'Henter…':'Opdatér fra FlightPoint','quiet',refreshFlightpoint);refresh.disabled=flightpointLoading;c.append(refresh);if(flightpointError)c.append(el('p','error',flightpointError+' Tidligere data er ikke opdateret.'));if(!flightpointData){c.append(el('p','notice',flightpointLoading?'Henter kontaktlisten…':'Kontaktlisten kunne ikke hentes.'));return;}c.append(el('p','muted',`Hentet ${new Date(flightpointData.stamp).toLocaleString('da-DK',{timeZone:'Europe/Copenhagen'})}`));if(flightpointData.contactsPartial)c.append(el('p','error','Listen er ufuldstændig. Slå paginering til i flowet.'));const label=el('label','searchLabel','Søg i kontakter'),input=el('input');input.type='search';input.placeholder='Navn, telefon eller email…';input.value=contactsQuery;label.append(input);const count=el('p','muted'),list=el('div','contactsList');count.setAttribute('role','status');c.append(label,count,list);function search(){contactsQuery=input.value;const q=contactsQuery.toLocaleLowerCase('da');list.replaceChildren();const found=flightpointData.contacts.filter(t=>[t.title,t.phone,t.email].join(' ').toLocaleLowerCase('da').includes(q));count.textContent=`${found.length} kontakter`;found.forEach(t=>{const card=el('article','calendarEvent');card.append(el('h3','',t.title));if(t.phone){const line=el('p','copyLine');line.append(el('span','',t.phone),copyButton(t.phone,'telefonnummer'));card.append(line);}if(t.email)card.append(el('p','',t.email));try{const u=new URL(t.url);if(u.protocol==='https:'&&u.hostname==='bwoty.sharepoint.com')card.append(link('Åbn original ↗',u.href,'textButton'));}catch{}list.append(card);});if(!found.length)list.append(el('p','empty','Ingen kontakter matcher søgningen.'));}input.oninput=search;search();}
function searchToolGroup(t){
 if(t.display==='pdf'||/\.pdf(?:[?#]|$)/i.test(t.url||''))return 'PDF-links';
 if(/apps\.powerapps\.com/i.test(t.url||''))return 'Apps';
 return 'Værktøjer og links';
}
function portalSearch(){
 const section=el('section','portalSearch'),label=el('label','searchLabel','Søg i OCC'),input=el('input'),results=el('div','searchGroups'),status=el('p','muted');
 input.id='portalSearchInput';input.type='search';input.placeholder='Søg i apps, værktøjer, PDF’er, kalender og kontakter…';
 label.append(input);results.hidden=true;status.setAttribute('role','status');section.append(label,status,results);
 function search(){
  const q=input.value.trim().toLocaleLowerCase('da');results.replaceChildren();results.hidden=!q;status.textContent='';if(!q)return;
  const found=[],match=v=>v.join(' ').toLocaleLowerCase('da').includes(q);
  data.categories.forEach(g=>g.tools.forEach(t=>{if(match([g.name,t.name,t.url,t.description]))found.push({title:t.name,group:searchToolGroup(t),kind:'Menu: '+g.name,tool:t,action:()=>{delete $('#detailContent').dataset.contacts;toolInfo(t);}});}));
  data.projects.filter(p=>p.visible).forEach(p=>{if(match([p.name,p.summary,p.body]))found.push({title:p.name,group:'Nye tiltag',kind:'Nye tiltag',action:()=>{delete $('#detailContent').dataset.contacts;projectInfo(p);}});});
  for(const key of ['calendar','adhocCalendar'])flightpointData?.[key].items.forEach(t=>{if(match([t.title,t.category,calendarPlain(t.description)]))found.push({title:t.title,group:'Kalender',kind:key==='calendar'?'OCC-kalender':'Adhoc / Maint',action:()=>{selectedCalendar=key;calendarSnapshot=flightpointData[key];calendarQuery=q;openCalendarQuickView();}});});
  flightpointData?.contacts.forEach(t=>{if(match([t.title,t.phone,t.email]))found.push({title:t.title,group:'Kontakter',kind:'Contacts / TWR',action:()=>openContacts(q)});});
  status.textContent=found.length+' match i menuer, tiltag og FlightPoint · PDF-indhold vises separat nedenfor';
  for(const group of ['Apps','Værktøjer og links','PDF-links','Nye tiltag','Kalender','Kontakter']){
   const rows=found.filter(r=>r.group===group).sort((a,b)=>Number(b.title.toLocaleLowerCase('da').includes(q))-Number(a.title.toLocaleLowerCase('da').includes(q)));if(!rows.length)continue;
   const block=el('section','searchGroup'),heading=el('h3','',group+' · '+rows.length),grid=el('div','groupResultGrid');
   for(const r of rows.slice(0,20)){
    const direct=r.tool?.url&&!builtInTools.has(r.tool.id)&&!['adhoc-calendar'].includes(r.tool.id)&&r.tool.display!=='pdf'&&/^https?:/i.test(r.tool.url);
    const b=direct?link('',r.tool.url,'searchResult'):button('','searchResult',r.action);
    b.append(el('strong','',r.title+(direct?' ↗':'')),el('small','muted',r.kind));grid.append(b);
   }
   block.append(heading,grid);if(rows.length>20)block.append(el('p','muted','Viser de første 20. Afgræns søgningen.'));results.append(block);
  }
  if(!found.length)results.append(el('p','empty','Ingen match i menuer eller FlightPoint. Se PDF-søgningen nedenfor.'));
 }
 input.oninput=search;input.onfocus=async()=>{if(!flightpointData){try{const r=await api('flightpoint');if(r.data){acceptFlightpoint(r.data);search();}}catch{}}};return section;
}
api('content').then(v=>{data=v;render();}).catch(e=>{const l=$('#loading');l.replaceChildren(el('p','error','Portalen kunne ikke indlæses. '+e.message),button('Prøv igen','quiet',()=>location.reload()));});
async function refreshRunitems(){if(flightpointLoading)return;flightpointLoading=true;flightpointError='';renderListView();try{const r=await api('runitems',{method:'POST',body:'{}'});const incoming=r.data?.runitems?.value||[];if(flightpointData)flightpointData={...flightpointData,runitems:incoming.map(t=>{const text=v=>typeof v==='string'?v:typeof v==='number'?String(v):v?.Value||'';const run=text(t.Run),parts=run.trim().match(/^(\d{4}-\d{2}-\d{2})\s+(D|CD|N|CN)$/i);return{id:t.ID,title:text(t.Title)||run,day:text(t.Day||t.Code||t.Duty||parts?.[2]).toUpperCase(),date:text(t.FlightDate||parts?.[1]),description:text(t.Description),done:t.Completed===true||t.Done===true||['true','yes'].includes(text(t.Completed??t.Done).toLowerCase()),status:text(t.Status)};})};else flightpointData={runitems:[]};}catch(e){flightpointError=e.message;}finally{flightpointLoading=false;renderListView();}}
function openListView(kind){closeCalendarFloat();listView=kind;showDetail('FlightPoint',kind==='passwords'?'Passwords':'OCC runitems','Henter…');$('#detailContent').dataset.listView=kind;if(kind==='runitems')refreshRunitems();else if(kind==='passwords'){renderPasswordsView();ensureFlightpoint().then(renderPasswordsView);}else{renderListView();refreshFlightpoint();}}/*
function renderListView(){const c=$('#detailContent');if(!$('#detail').open||!c.dataset.listView)return;const kind=c.dataset.listView;c.replaceChildren(el('h2','',kind==='passwords'?'Passwords':'OCC runitems'));const refresh=button(flightpointLoading?'Henter…':'Opdatér fra FlightPoint','quiet',refreshFlightpoint);refresh.disabled=flightpointLoading;c.append(refresh);if(flightpointError)c.append(el('p','error',flightpointError+' Tidligere data er ikke opdateret.'));if(!flightpointData){c.append(el('p','notice','Henter data…'));return;}const rows=flightpointData[kind]||[];c.append(el('p','muted',`${rows.length} poster · hentet ${new Date(flightpointData.stamp).toLocaleString('da-DK',{timeZone:'Europe/Copenhagen'})}`));const input=el('input');input.type='search';input.placeholder=kind==='passwords'?'Søg i navn eller bruger…':'Søg i checklisten…';input.value=contactsQuery;const label=el('label','searchLabel',kind==='passwords'?'Søg i passwords':'Søg i runitems');label.append(input);const list=el('div','contactsList');c.append(label,list);const render=()=>{contactsQuery=input.value;const q=contactsQuery.toLocaleLowerCase('da');list.replaceChildren();rows.filter(t=>[t.title,t.user,t.day,t.description,t.status].join(' ').toLocaleLowerCase('da').includes(q)).forEach(t=>{const card=el('article','calendarEvent');if(kind==='passwords'){card.append(el('h3','',t.title));if(t.user)card.append(el('p','',`Bruger: ${t.user}`));if(t.password){const value=el('code','secretValue','••••••••');const reveal=button('Vis','quiet',()=>{value.textContent=value.textContent==='••••••••'?t.password:'••••••••';reveal.textContent=value.textContent==='••••••••'?'Vis':'Skjul';});card.append(el('p','',value,' '),reveal);}if(t.url)card.append(link('Åbn link ↗',t.url,'textButton'));}else{const row=el('label','runitemRow');const box=document.createElement('input');box.type='checkbox';box.checked=t.done;box.onchange=()=>{t.done=box.checked;};row.append(box,el('span','',`${t.day||'Uden dag'} · ${t.title}`));card.append(row);if(t.description)card.append(el('p','prose',t.description));}list.append(card);});if(!list.children.length)list.append(el('p','empty','Ingen poster matcher søgningen.'));};input.oninput=render;render();}
$('#detail').addEventListener('close',()=>{delete $('#detailContent').dataset.listView;listView='';});/*
function renderListView(){const c=$('#detailContent');if(!$('#detail').open||!c.dataset.listView)return;const kind=c.dataset.listView,rows=(flightpointData?.[kind]||[]).filter(t=>kind!=='runitems'||!t.done);c.replaceChildren(el('h2','',kind==='passwords'?'Passwords':'OCC runitems'));const refresh=button(flightpointLoading?'Henter…':'Opdatér fra FlightPoint','quiet',refreshFlightpoint);refresh.disabled=flightpointLoading;c.append(refresh);if(flightpointError)c.append(el('p','error',flightpointError+' Tidligere data er ikke opdateret.'));if(!flightpointData){c.append(el('p','notice','Henter data…'));return;}c.append(el('p','muted',`${rows.length} åbne poster`));const input=el('input');input.type='search';input.placeholder=kind==='passwords'?'Søg i navn eller bruger…':'Søg i checklisten…';const label=el('label','searchLabel',kind==='passwords'?'Søg i passwords':'Søg i runitems');label.append(input);const list=el('div','contactsList');c.append(label,list);input.oninput=()=>{const q=input.value.toLocaleLowerCase('da');list.replaceChildren();rows.filter(t=>[t.title,t.user,t.day,t.description,t.status].join(' ').toLocaleLowerCase('da').includes(q)).forEach(t=>{const card=el('article','calendarEvent');if(kind==='passwords'){card.append(el('h3','',t.title));if(t.user)card.append(el('p','',`Bruger: ${t.user}`));if(t.password){const value=el('code','secretValue','••••••••');const reveal=button('Vis','quiet',()=>{value.textContent=value.textContent==='••••••••'?t.password:'••••••••';reveal.textContent=value.textContent==='••••••••'?'Vis':'Skjul';});card.append(el('p','',value,' '),reveal);}if(t.url)card.append(link('Åbn link ↗',t.url,'textButton'));}else{const row=el('label','runitemRow');const box=document.createElement('input');box.type='checkbox';box.checked=false;row.append(box,el('span','',`${t.date||''} ${t.day||''} · ${t.title}`));card.append(row);if(t.description)card.append(el('p','prose',t.description));}list.append(card);});if(!list.children.length)list.append(el('p','empty','Ingen åbne poster matcher søgningen.'));};input.oninput();}
*/
function renderListView(){const c=$('#detailContent');if(!$('#detail').open||!c.dataset.listView)return;const kind=c.dataset.listView,rows=(flightpointData?.[kind]||[]).filter(t=>kind!=='runitems'||(!t.done&&!runitemDone.has(String(t.id))));c.replaceChildren(el('h2','',kind==='passwords'?'Passwords':'OCC runitems'));const refresh=button(flightpointLoading?'Henter…':'Opdatér fra FlightPoint','quiet',refreshFlightpoint);refresh.disabled=flightpointLoading;c.append(refresh);if(flightpointError)c.append(el('p','error',flightpointError+' Tidligere data er ikke opdateret.'));if(!flightpointData){c.append(el('p','notice','Henter data…'));return;}c.append(el('p','muted',`${rows.length} åbne poster`));const input=el('input');input.type='search';input.placeholder=kind==='passwords'?'Søg i navn eller bruger…':'Søg i checklisten…';const label=el('label','searchLabel',kind==='passwords'?'Søg i passwords':'Søg i runitems');label.append(input);const list=el('div','contactsList');c.append(label,list);const draw=()=>{const q=input.value.toLocaleLowerCase('da');list.replaceChildren();rows.filter(t=>[t.title,t.user,t.day,t.description,t.status,t.date].join(' ').toLocaleLowerCase('da').includes(q)).forEach(t=>{const card=el('article','calendarEvent');if(kind==='passwords'){card.append(el('h3','',t.title));if(t.user)card.append(el('p','',`Bruger: ${t.user}`));}else{const row=el('label','runitemRow'),box=document.createElement('input');box.type='checkbox';box.checked=false;box.onchange=()=>{runitemDone.add(String(t.id));card.remove();};row.append(box,el('span','',`${t.date||''} ${t.day||''} · ${t.title}`));card.append(row);if(t.description)card.append(el('p','prose',t.description));}list.append(card);});if(!list.children.length)list.append(el('p','empty','Ingen åbne poster matcher søgningen.'));};input.oninput=draw;draw();}
let passwordsQuery='';
function renderPasswordsView(){
 const c=$('#detailContent');if(!$('#detail').open||c.dataset.listView!=='passwords')return;
 c.replaceChildren(el('h2','','Passwords'));
 const refresh=button(flightpointLoading?'Henter…':'Opdatér fra FlightPoint','quiet',refreshFlightpoint);refresh.disabled=flightpointLoading;c.append(refresh);
 if(flightpointError)c.append(el('p','error',flightpointError+' Tidligere data er ikke opdateret.'));
 if(!flightpointData){c.append(el('p','notice',flightpointLoading?'Henter passwords…':'Passwords kunne ikke hentes.'));return;}
 if(flightpointData.passwordsPartial)c.append(el('p','error','Listen er ufuldstændig. Slå paginering til i flowet.'));
 const label=el('label','searchLabel','Søg i passwords'),input=el('input');input.type='search';input.placeholder='Navn, brugernavn eller link…';input.value=passwordsQuery;label.append(input);
 const count=el('p','muted'),list=el('div','contactsList');count.setAttribute('role','status');c.append(label,count,list);
 function search(){
  passwordsQuery=input.value;const q=passwordsQuery.trim().toLocaleLowerCase('da');
  const rows=flightpointData.passwords.filter(t=>[t.title,t.user,t.url].join(' ').toLocaleLowerCase('da').includes(q));
  count.textContent=rows.length+' poster';list.replaceChildren();
  rows.forEach(t=>{const card=el('article','calendarEvent');card.append(el('h3','',t.title));if(t.user)card.append(el('p','','Bruger: '+t.user));
   if(t.password){const value=el('code','secretValue','••••••••');let shown=false;const reveal=button('Show password','quiet',()=>{shown=!shown;value.textContent=shown?t.password:'••••••••';reveal.textContent=shown?'Hide password':'Show password';});const line=el('p','copyLine');line.append(value,reveal,copyButton(t.password,'password'));card.append(line);}else card.append(el('p','muted','Ingen passwordværdi i flowets svar.'));
   if(t.url)card.append(link('Åbn link ↗',t.url,'textButton'));list.append(card);
  });if(!rows.length)list.append(el('p','empty','Ingen passwords matcher søgningen.'));
 }
 input.oninput=search;search();
}
// Open checklists use their own response and never overwrite the main flow.
let checklistViewRequest=0;
function checklistLabel(run){
 const match=run.match(/^(\d{4})-(\d{2})-(\d{2})\s+(D|CD|N|CN)$/i);
 if(!match)return run||'Ukendt checkliste';
 const months=['JAN','FEB','MAR','APR','MAJ','JUN','JUL','AUG','SEP','OKT','NOV','DEC'];
 return match[4].toUpperCase()+' '+match[3]+months[Number(match[2])-1];
}
function groupOpenChecklists(items){
 const groups=new Map();
 for(const item of items){
  if(item.Done===true||item.Completed===true)continue;
  const run=typeof item.Run==='string'?item.Run:item.Run?.Value||'Ukendt checkliste';
  const key=item.Run?.Id!=null?'id:'+item.Run.Id:'title:'+run;
  if(!groups.has(key))groups.set(key,{run,items:[]});
  groups.get(key).items.push(item);
 }
 const order=['D','CD','N','CN'];
 const sortValue=x=>x.SortOrder!==null&&x.SortOrder!==undefined&&String(x.SortOrder).trim()!==''&&Number.isFinite(Number(x.SortOrder))?Number(x.SortOrder):Infinity;
 for(const group of groups.values())group.items.sort((a,b)=>sortValue(a)-sortValue(b)||Number(a.ID)-Number(b.ID));
 return [...groups.values()].map(g=>[g.run,g.items]).sort(([a],[b])=>a.slice(0,10).localeCompare(b.slice(0,10))||order.indexOf(a.split(' ').pop())-order.indexOf(b.split(' ').pop()));
}
async function openChecklistStandalone(force=false){
 const request=++checklistViewRequest;
 closeCalendarFloat();
 showDetail('FlightPoint','Åbne checklister','Henter checklister…');
 const c=$('#detailContent');c.dataset.checklistView=String(request);
 const current=()=>$('#detail').open&&c.dataset.checklistView===String(request)&&c.querySelector('[data-checklist-loading]');
 const loading=el('p','notice','Henter åbne punkter fra FlightPoint…');loading.dataset.checklistLoading='true';
 c.replaceChildren(el('h2','','Åbne checklister'),loading);
 try{
  const r=await loadOpenChecklistData(force===true);
  if(!current())return;
  if(!Array.isArray(r.data?.runitems?.value))throw new Error('Svaret mangler checklist-punkter.');
  const groups=groupOpenChecklists(r.data.runitems.value);
  const total=groups.reduce((n,[,items])=>n+items.length,0);
  c.replaceChildren(el('h2','','Åbne checklister'),button('Opdatér fra FlightPoint','quiet',()=>openChecklistStandalone(true)),el('p','muted',groups.length+' checklister · '+total+' åbne punkter'));
  c.append(el('p','muted','Afkrydsning gemmes i SharePoint med tidspunkt og dit selvangivne navn.'));
  const wrap=el('div','openChecklistGroups');c.append(wrap);
  for(const [run,items] of groups){
   const section=el('details','openChecklistGroup'),summary=el('summary'),count=el('span','openChecklistCount',items.length+' åbne');
   summary.append(el('strong','',checklistLabel(run)),count);summary.title=run;
   const list=el('div','contactsList');let remaining=items.length;
   const nameLabel=el('label','field','Dit navn'),nameInput=el('input');nameInput.type='text';nameInput.maxLength=200;nameInput.placeholder='Skriv dit fulde navn';nameInput.autocomplete='name';nameLabel.append(nameInput);
   const saveStatus=el('p','muted');saveStatus.setAttribute('role','status');
   nameInput.oninput=()=>{list.querySelectorAll('input[type=checkbox]').forEach(b=>{if(!b.dataset.saving)b.disabled=!nameInput.value.trim();});};
   for(const item of items){
    const card=el('article','calendarEvent'),row=el('label','runitemRow'),box=el('input');box.type='checkbox';
    box.setAttribute('aria-label','Markér færdig: '+item.Title);box.disabled=true;
    box.onchange=async()=>{
     const doneBy=nameInput.value.trim();if(!doneBy){box.checked=false;return;}
     box.disabled=true;box.dataset.saving='true';saveStatus.className='muted';saveStatus.textContent='Gemmer i SharePoint…';
     try{const saved=await api('checklist-done',{method:'POST',body:JSON.stringify({itemId:Number(item.ID),doneBy})});if(saved.ok!==true||saved.done!==true)throw new Error('Gemningen blev ikke bekræftet.');
      item.Done=true;for(const cached of openChecklistCache?.data?.runitems?.value||[])if(Number(cached.ID)===Number(item.ID))cached.Done=true;
      card.remove();remaining--;count.textContent=remaining+' åbne';saveStatus.textContent='Gemt i SharePoint.';
      const left=groups.reduce((n,[,rows])=>n+rows.filter(x=>x.Done!==true).length,0);c.querySelector(':scope > .muted').textContent=groups.length+' checklister · '+left+' åbne punkter';
      if(!remaining)list.append(el('p','empty','Alle punkter på denne checkliste er færdige.'));
     }catch(e){box.checked=false;saveStatus.className='error';saveStatus.textContent=e.message;}finally{delete box.dataset.saving;box.disabled=!nameInput.value.trim();}
    };
    row.append(box,el('span','',item.Title||'Uden titel'));card.append(row);
    if(item.Description||item.Info)card.append(el('p','prose',item.Description||item.Info));
    const target=item.Link||item.URL;
    if(typeof target==='string'&&/^https?:\/\//i.test(target))card.append(link('Åbn link ↗',target,'textButton'));
    list.append(card);
   }
   section.append(summary,nameLabel,saveStatus,list);wrap.append(section);
  }
  if(!groups.length)wrap.append(el('p','empty','Ingen åbne checklister i flowets svar.'));
 }catch(e){if(current())c.replaceChildren(el('h2','','Åbne checklister'),button('Prøv igen','quiet',()=>openChecklistStandalone(true)),el('p','error',e.message));}
}
const _openListView=openListView;
openListView=function(kind){if(kind==='runitems')return openChecklistStandalone();return _openListView(kind);};

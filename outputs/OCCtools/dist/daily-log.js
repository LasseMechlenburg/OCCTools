// Shared daily notes. No flow URLs or credentials are exposed in the browser.
(()=>{
 const key='occ-daily-log-draft',isPop=new URLSearchParams(location.search).get('dailyLog')==='1';
 const localDay=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Copenhagen',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 let config={today:localDay(),configured:false,writeConfigured:false},selected=config.today,snapshot=null,loading=false,loadToken=0,message='',failure='',tipToken=0;
 let draft={name:'',entryText:'',date:selected,itemId:null,etag:'',requestId:'',attempted:false,locked:false},busy=false;
 try{const old=JSON.parse(sessionStorage.getItem(key));if(old&&typeof old.entryText==='string'&&typeof old.name==='string'){draft={...draft,...old,locked:!!old.attempted||!!old.locked};if(draft.date)selected=draft.date;}}catch{}
 const remember=()=>{try{sessionStorage.setItem(key,JSON.stringify(draft));}catch{message='Kladde kunne ikke gemmes i denne fane. Behold vinduet åbent, indtil du er færdig.';}};
 const reset=()=>{draft={name:draft.name,entryText:'',date:selected,itemId:null,etag:'',requestId:'',attempted:false,locked:false};remember();};
 const dialog=el('dialog','dailyLogDialog'),head=el('div','dialogTop'),content=el('div');dialog.id='dailyLogDialog';dialog.setAttribute('aria-label','Daily log');
 const close=button('×','close',()=>dialog.close());close.setAttribute('aria-label','Luk Daily log');head.append(el('span','eyebrow','OCC · Fælles Daily log'),close);dialog.append(head,content);document.body.append(dialog);
 dialog.addEventListener('cancel',e=>{if(isPop||busy)e.preventDefault();});
 const time=s=>{const d=new Date(s);return Number.isFinite(+d)?d.toLocaleString('da-DK',{timeZone:'Europe/Copenhagen',hour:'2-digit',minute:'2-digit'}):'';};
 const editable=()=>selected===config.today&&selected===localDay()&&snapshot?.editable===true&&snapshot.date===selected;
 async function getConfig(){config=await api('daily-log');return config;}
 async function refresh(){
  const token=++loadToken,date=selected;loading=true;failure='';draw();
  try{await getConfig();if(!config.configured)throw Error('Daily log-læseflowet er ikke konfigureret på serveren.');const result=await api('daily-log/read',{method:'POST',body:JSON.stringify({date})});if(token!==loadToken)return;snapshot=result;config.today=result.today;}
  catch(e){if(token!==loadToken)return;snapshot=null;failure=e.message;}
  finally{if(token===loadToken){loading=false;draw();}}
 }
 function open(){closeUtilityPreview();closeTemplatePreview();closeCalendarFloat();if(!dialog.open)dialog.showModal();void refresh();}
 function setDate(date){if(busy)return;if(draft.entryText&&!draft.locked&&date!==selected&&!confirm('Din kladde bevares på den oprindelige dag. Vil du skifte dag?'))return;selected=date;message='';void refresh();}
 function draw(){
  content.replaceChildren(el('h2','','Daily log'));
  const controls=el('div','dailyLogToolbar'),date=el('input');date.type='date';date.value=selected;date.max=config.today;date.disabled=busy;date.setAttribute('aria-label','Logdato');date.onchange=()=>{if(date.value)setDate(date.value);};
  const reload=button(loading?'Henter…':'Refresh','quiet',()=>void refresh());reload.disabled=loading||busy;
  const today=button('I dag','quiet',()=>setDate(config.today));today.disabled=busy;controls.append(date,today,reload);
  if(!isPop)controls.append(button('↗ Åbn i eget vindue','quiet',()=>{const u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('dailyLog','1');u.searchParams.set('date',selected);window.open(u.href,'_blank','popup=yes,width=760,height=900,resizable=yes,scrollbars=yes,noopener,noreferrer');}));
  content.append(controls,el('p','muted','Fælles for OCC · Navne er selvangivne · Tidspunkter vises i dansk tid.'));
  if(failure)content.append(el('p','error',failure));
  if(message){const m=el('p','notice',message);m.setAttribute('role','status');content.append(m);}
  if(!editable())content.append(el('p','notice',loading?'Henter dagens status…':selected!==config.today?'Denne dag er låst for ændringer.':failure?'Gemning er deaktiveret, indtil loggen er hentet.':'Dagen er skiftet. Tryk I dag og Refresh.'));
  if(draft.entryText&&draft.date!==selected)content.append(el('p','notice','Du har en kladde fra '+draft.date+'. Vælg den dato for at se eller kopiere den.'));
  if(editable()||draft.date===selected&&draft.entryText)renderEditor();
  const list=el('section','dailyLogEntries');list.setAttribute('aria-label','Dagens entries');content.append(list);
  if(loading)return;
  if(snapshot?.date!==selected)return;
  if(snapshot.partial)list.append(el('p','error','Listen kan være ufuldstændig. Kontrollér flowets pagination før du bruger den som fuldt overblik.'));
  for(const item of snapshot.items){
   const card=el('article','dailyLogEntry'),meta=el('div','dailyLogMeta');meta.append(el('strong','',time(item.created)+' · '+(item.createdBy||'Navn mangler')));
   if(item.modified!==item.created||item.modifiedBy!==item.createdBy)meta.append(el('span','muted','Senest redigeret '+time(item.modified)+' · '+(item.modifiedBy||'Navn mangler')));
   card.append(meta,el('p','dailyLogText',item.text));
   if(editable()){
    const edit=button('Redigér','quiet',()=>{if(busy||draft.locked)return;if(draft.entryText&&!confirm('Erstat den nuværende kladde med denne entry?'))return;draft={...draft,entryText:item.text,itemId:item.id,etag:item.etag,date:selected,requestId:'',attempted:false,locked:false};message='Redigerer entry fra '+time(item.created)+'. Opretterens navn bevares.';remember();draw();content.querySelector('textarea')?.focus();});
    edit.disabled=busy||draft.locked||!/^"\d+"$/.test(item.etag);if(!item.etag)edit.title='Versionsoplysning mangler i flowets svar.';card.append(edit);
   }
   list.append(card);
  }
  if(!snapshot.items.length)list.append(el('p','empty','Ingen entries på denne dag.'));
 }
 function renderEditor(){
  const form=el('form','dailyLogForm'),name=el('input'),text=el('textarea'),count=el('p','muted'),save=el('button','primary',draft.itemId?'Gem ændringer':'Tilføj entry');save.type='submit';
  const same=draft.date===selected,can=editable()&&config.writeConfigured&&!busy&&!draft.locked&&(!draft.entryText||same);
  name.value=draft.name;name.maxLength=200;name.autocomplete='name';name.required=true;name.disabled=!can;
  text.value=same?draft.entryText:'';text.maxLength=63999;text.rows=7;text.required=true;text.placeholder='Skriv din note. Enter giver en ny linje.';text.readOnly=!can;
  const field=(title,input)=>{const label=el('label','field',title);label.append(input);return label;};
  function update(){count.textContent=text.value.length.toLocaleString('da-DK')+' / 63.999 tegn';save.disabled=!can||!name.value.trim()||!text.value.trim();}
  function changed(){draft.name=name.value;draft.entryText=text.value;draft.date=selected;draft.requestId='';remember();update();}
  name.oninput=changed;text.oninput=changed;update();
  form.append(el('h3','',draft.itemId&&same?'Redigér entry':'Ny entry'),field('Dit navn',name),field('Note',text),count,save);
  if(!config.writeConfigured)form.append(el('p','notice','Skriveflowet er ikke konfigureret på serveren.'));
  if(draft.locked){form.append(el('p','error',draft.attempted?'Tidligere gemning skal kontrolleres i SharePoint og flowhistorikken. Noten kan være gemt.':'Redigeringen er afvist. Kopiér din tekst, hent den nyeste entry, og sammenlign ændringerne.'));
   form.append(button('Jeg har kontrolleret resultatet','quiet',()=>{if(!confirm('Har du kontrolleret SharePoint og flowhistorikken og kopieret tekst, du vil bevare? Dette rydder kladden uden at sende den igen.'))return;reset();message='Kladden er ryddet. Opret ikke en entry igen, hvis den allerede findes.';void refresh();}));
  }else if(draft.entryText||draft.itemId)form.append(button('Ryd kladde','quiet',()=>{if(busy||!confirm('Ryd denne kladde? Gemte entries ændres ikke.'))return;reset();draw();}));
  form.onsubmit=async e=>{
   e.preventDefault();if(!can||busy||!editable())return;draft.name=name.value.trim();draft.entryText=text.value;draft.date=selected;draft.requestId||=crypto.randomUUID();draft.attempted=true;busy=true;remember();message='Gemmer…';draw();
   const input={date:selected,mode:draft.itemId?'update':'create',entryText:draft.entryText,name:draft.name,requestId:draft.requestId,...(draft.itemId?{itemId:draft.itemId,etag:draft.etag}:{})};
   try{const r=await api('daily-log/write',{method:'POST',body:JSON.stringify(input)});if(r.ok!==true)throw Error('Gemningen blev ikke bekræftet.');reset();message='Gemt i Daily log.';try{localStorage.setItem('occ-daily-log-changed',JSON.stringify({date:selected,at:Date.now(),nonce:crypto.randomUUID()}));}catch{} }
   catch(e){draft.attempted=e.uncertain!==false;draft.locked=draft.attempted||e.status===409;message=e.message||'Gemningen kunne ikke bekræftes.';if(!draft.locked)draft.requestId='';remember();}
   finally{busy=false;await refresh();}
  };
  content.append(form);
 }
 const buttonEl=button('Daily log','templateCircle utilityCircle',open);buttonEl.setAttribute('aria-haspopup','dialog');utilityNav.append(buttonEl);
 const tip=el('div','dailyLogTooltip');tip.id='dailyLogTooltip';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.append(tip);buttonEl.setAttribute('aria-describedby',tip.id);
 let tipCache=null;
 async function preview(){const token=++tipToken;tip.hidden=false;const rect=buttonEl.getBoundingClientRect();tip.style.top=Math.max(8,Math.min(rect.top,innerHeight-240))+'px';tip.style.left=Math.min(rect.right+12,Math.max(8,innerWidth-340))+'px';tip.replaceChildren(el('strong','','Daily log · I dag'),el('p','','Henter…'));
  try{if(!tipCache||Date.now()-tipCache.at>30000){const c=await getConfig();const data=await api('daily-log/read',{method:'POST',body:JSON.stringify({date:c.today})});tipCache={at:Date.now(),data};}if(token!==tipToken)return;tip.replaceChildren(el('strong','','Daily log · '+tipCache.data.items.length+' entries'));for(const item of tipCache.data.items.slice(-3))tip.append(el('p','',time(item.created)+' · '+item.createdBy+' — '+item.text.slice(0,160)));tip.append(el('small','','Klik for at åbne loggen og vælge tidligere dage.'));}catch{if(token===tipToken)tip.replaceChildren(el('p','','Klik for at åbne Daily log. Forhåndsvisning kunne ikke hentes.'));}
 }
 const hideTip=()=>{tipToken++;tip.hidden=true;};buttonEl.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')void preview();});buttonEl.addEventListener('focus',()=>void preview());buttonEl.addEventListener('pointerleave',hideTip);buttonEl.addEventListener('blur',hideTip);buttonEl.addEventListener('click',hideTip);
 window.addEventListener('storage',e=>{if(e.key!=='occ-daily-log-changed')return;tipCache=null;if(dialog.open){if(draft.entryText||busy){message='Daily log er ændret i et andet vindue. Din kladde er bevaret; brug Refresh for at hente listen.';if(!busy)draw();}else void refresh();}});
 setInterval(()=>{if(dialog.open&&config.today!==localDay()&&!busy){message='En ny dansk dag er begyndt. Gårsdagens entries kan ikke længere redigeres.';void refresh();}},15000);
 if(isPop){document.body.classList.add('dailyLogPopout');close.hidden=true;const date=new URLSearchParams(location.search).get('date');if(/^\d{4}-\d{2}-\d{2}$/.test(date||'')&&!draft.entryText)selected=date;document.title='Daily log · OCC';open();}
})();

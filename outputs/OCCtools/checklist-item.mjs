import {logWriter} from './log-create.mjs';
export function copenhagenDate(now=new Date()){
 return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Copenhagen',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function validateChecklistItem(b,now=new Date()){
 const bad=()=>{throw Object.assign(new Error('Vælg en åben checkliste eller en fremtidig dato og checklistetype. Skriv en titel på 1–255 tegn.'),{status:400,uncertain:false});};
 if(!b||typeof b.title!=='string'||!b.title.trim()||b.title.length>255||/[\x00-\x1f\x7f]/.test(b.title)||!/^[-a-zA-Z0-9]{16,80}$/.test(b.requestId||''))bad();
 const result={mode:b.mode,title:b.title.trim(),requestId:b.requestId};
 if(b.mode==='open'){
  if(!Number.isSafeInteger(b.runId)||b.runId<1)bad();
  result.runId=b.runId;
 }else if(b.mode==='future'){
  if(!['D','CD','N','CN'].includes(b.checklistCode)||typeof b.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.date))bad();
  const parsed=new Date(b.date+'T12:00:00Z');
  if(!Number.isFinite(+parsed)||parsed.toISOString().slice(0,10)!==b.date||b.date<=copenhagenDate(now))bad();
  result.checklistCode=b.checklistCode;result.date=b.date;
 }else bad();
 return result;
}
export function checklistItemWriter(root,file,journal,transport){
 const writer=logWriter(root,file,journal,transport,{validate:validateChecklistItem,script:'checklist-item-request.ps1',payload:({requestId,...rest})=>rest});
 return async input=>{try{return await writer(input);}catch(e){
  if(e.status===503)e.message='Flowet til checklist-punkter er ikke konfigureret korrekt på serveren.';
  throw e;
 }};
}

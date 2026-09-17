import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
export const dayInDenmark=(now=new Date())=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Copenhagen',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const fail=(message,status=502,uncertain=false)=>Object.assign(new Error(message),{status,uncertain});
export function validDay(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===value;
}
export function validateDailyEntry(b,today=dayInDenmark()){
 if(!validDay(b?.date)||b.date!==today)throw fail('Kun dagens log kan ændres. Hent dags dato igen.',409);
 if(!['create','update'].includes(b.mode)||typeof b.entryText!=='string'||!b.entryText.trim()||b.entryText.length>63999||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(b.entryText))throw fail('Skriv en note på 1–63.999 tegn.',400);
 if(typeof b.name!=='string'||!b.name.trim()||b.name.length>200||/[\x00-\x1f\x7f]/.test(b.name))throw fail('Skriv dit navn, højst 200 tegn.',400);
 if(!/^[-a-zA-Z0-9]{16,80}$/.test(b.requestId||''))throw fail('Ugyldigt request-id.',400);
 const result={mode:b.mode,entryText:b.entryText,name:b.name.trim(),requestId:b.requestId};
 if(b.mode==='update'){
  if(!Number.isSafeInteger(b.itemId)||b.itemId<1||typeof b.etag!=='string'||!/^"\d+"$/.test(b.etag))throw fail('Postens version mangler. Tryk Refresh og åbn noten igen.',409);
  result.itemId=b.itemId;result.etag=b.etag;
 }
 return result;
}
export function normalizeDaily(raw,date,today){
 if(!Array.isArray(raw?.value))throw fail('Læseflowets svar mangler value.');
 const items=raw.value.map(t=>({id:Number(t.ID),text:typeof t.EntryText==='string'?t.EntryText:'',created:t.Created||'',modified:t.Modified||'',createdBy:typeof t.CreatedByName==='string'?t.CreatedByName:'',modifiedBy:typeof t.ModifiedByName==='string'?t.ModifiedByName:'',etag:typeof t['@odata.etag']==='string'?t['@odata.etag']:'',requestId:t.RequestId||''}));
 if(items.some(t=>!Number.isSafeInteger(t.id)||t.id<1||!Number.isFinite(Date.parse(t.created))))throw fail('Læseflowet mangler gyldig ID eller Created.');
 // Date-only fields can have tenant-dependent timezone serialization. Fail closed on mismatched days.
 if(items.some(t=>dayInDenmark(new Date(t.created))!==date))throw fail('Datofilteret returnerede en entry fra en anden dansk dag. Kontrollér LogDate og tidszone i flowet.');
 items.sort((a,b)=>a.created.localeCompare(b.created)||a.id-b.id);
 return {date,today,editable:date===today,partial:!!raw['@odata.nextLink']||items.length>=5000,items};
}
function target(file){
 try{const u=new URL(fs.readFileSync(file,'utf8').trim());if(u.protocol!=='https:'||!u.hostname.endsWith('.environment.api.powerplatform.com')||u.username||u.password)throw Error();return u.href;}catch{throw fail('Daily log-flowet er ikke konfigureret korrekt.',503);}
}
function transport(root,request){return new Promise((resolve,reject)=>{
 const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(root,'daily-log-request.ps1')],{windowsHide:true,stdio:['pipe','pipe','pipe']});
 let text='',oversize=false;const timer=setTimeout(()=>{child.kill();reject(Error('Unconfirmed'));},60000);
 child.stdout.setEncoding('utf8');child.stdout.on('data',s=>{text+=s;if(text.length>20000000){oversize=true;child.kill();}});child.stderr.resume();child.stdin.on('error',()=>{});
 child.on('error',()=>{clearTimeout(timer);reject(Error('Unconfirmed'));});child.on('close',code=>{clearTimeout(timer);try{if(code||oversize)throw Error();resolve(JSON.parse(text.replace(/^\uFEFF/,'')));}catch{reject(Error('Unconfirmed'));}});
 child.stdin.end(JSON.stringify(request));
});}
export function dailyLogService({root,readFile,writeFile,journalDir,send=r=>transport(root,r),now=()=>new Date()}){
 const pending=new Map(),reads=new Map();
 const rejected=()=>fail('Dagen er låst, eller noten er ændret af en anden. Tryk Refresh og åbn noten igen.',409);
 const uncertain=()=>fail('Gemningen kunne ikke bekræftes. Kontrollér loggen og flowhistorikken før et nyt forsøg.',502,true);
 async function read(date){
  if(!validDay(date)||date>dayInDenmark(now()))throw fail('Vælg dags dato eller en tidligere dato.',400);
  if(reads.has(date))return reads.get(date);
  const task=(async()=>{let r;try{r=await send({url:target(readFile),body:{date}});}catch(e){if(e.status===503)throw e;throw fail('Daily log kunne ikke hentes. Kontrollér læseflowet.');}if(r.status!==200)throw fail('Daily log kunne ikke hentes.');return normalizeDaily(r.body,date,dayInDenmark(now()));})();
  reads.set(date,task);try{return await task;}finally{reads.delete(date);}
 }
 return {
  status:()=>({configured:fs.existsSync(readFile),writeConfigured:fs.existsSync(writeFile),today:dayInDenmark(now())}),read,
  async write(input){
   const b=validateDailyEntry(input,dayInDenmark(now())),url=target(writeFile),hash=crypto.createHash('sha256').update(JSON.stringify({date:input.date,...b})).digest('hex');
   fs.mkdirSync(journalDir,{recursive:true});const record=path.join(journalDir,b.requestId+'.json');
   if(fs.existsSync(record)){
    let old;try{old=JSON.parse(fs.readFileSync(record,'utf8'));}catch{throw uncertain();}
    if(old.hash!==hash)throw fail('Request-id tilhører et andet forsøg. Kontrollér den tidligere gemning.',409,true);
    if(old.state==='done')return {ok:true};if(old.state==='rejected')throw rejected();
    if(pending.has(b.requestId))return pending.get(b.requestId);throw uncertain();
   }
   fs.writeFileSync(record,JSON.stringify({hash,state:'pending',at:now().toISOString()}),{flag:'wx'});
   const finish=state=>{const temp=record+'.tmp';fs.writeFileSync(temp,JSON.stringify({hash,state,at:now().toISOString()}));fs.renameSync(temp,record);};
   const task=(async()=>{
    try{
     if(b.mode==='update'){
      const snapshot=await read(input.date),item=snapshot.items.find(t=>t.id===b.itemId);
      if(!item||item.etag!==b.etag||!snapshot.editable){finish('rejected');throw rejected();}
     }
     if(input.date!==dayInDenmark(now())){finish('rejected');throw rejected();}
     const r=await send({url,body:b});
     if(r.status===409||r.status===412){finish('rejected');throw rejected();}
     if(r.status!==200||r.body?.ok!==true)throw uncertain();
     finish('done');return {ok:true};
    }catch(e){if(e.status===409&&e.uncertain===false)throw e;throw uncertain();}
   })();pending.set(b.requestId,task);try{return await task;}finally{pending.delete(b.requestId);}
  }
 };
}

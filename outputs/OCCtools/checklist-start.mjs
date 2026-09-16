import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
export function validateStart(b){
 const codes=['PreOps','Wetlease','DIV','AdHoc Sale','Crew ILL'];
 if(!codes.includes(b?.checklistCode)||typeof b.reference!=='string'||b.reference.length>100||/[\x00-\x1f]/.test(b.reference)||!/^[-a-zA-Z0-9]{16,80}$/.test(b.requestId||''))throw Object.assign(new Error('Vælg en gyldig checkliste og reference.'),{status:400});
 const reference=b.reference.trim();
 if(b.checklistCode!=='PreOps'&&!reference)throw Object.assign(new Error('Udfyld flightnummer eller crewnummer.'),{status:400});
 return {checklistCode:b.checklistCode,reference:b.checklistCode==='PreOps'?'':reference,requestId:b.requestId};
}
// The journal deliberately retains uncertain attempts. Never retry creation automatically.
export function startWriter(root,file,journal){
 const pending=new Map();
 return async input=>{
  const b=validateStart(input),payload={checklistCode:b.checklistCode,reference:b.reference};
  if(!fs.existsSync(file))throw new Error('Oprettelsesflowet er ikke konfigureret.');
  const target=new URL(fs.readFileSync(file,'utf8').trim());
  if(target.protocol!=='https:'||!target.hostname.endsWith('.environment.api.powerplatform.com')||target.username||target.password)throw new Error('Flowadressen er ugyldig.');
  const attempts=fs.existsSync(journal)?JSON.parse(fs.readFileSync(journal,'utf8')):{};
  const previous=attempts[b.requestId];
  if(previous){
   if(JSON.stringify(previous.payload)!==JSON.stringify(payload))throw new Error('Anmodningen er allerede brugt til en anden checkliste.');
   if(previous.state==='done')return {ok:true};
   if(pending.has(b.requestId))return pending.get(b.requestId);
   throw new Error('Et tidligere forsøg er ikke bekræftet. Kontrollér OCC_Runs og flowhistorikken før en ny oprettelse.');
  }
  attempts[b.requestId]={payload,state:'pending',at:new Date().toISOString()};
  fs.writeFileSync(journal,JSON.stringify(attempts));
  const request=new Promise((resolve,reject)=>{
   const fail=()=>new Error('Oprettelsen blev ikke bekræftet. Den kan være delvist gennemført. Kontrollér OCC_Runs og flowhistorikken før et nyt forsøg.');
   const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(root,'start-request.ps1')],{windowsHide:true,stdio:['pipe','pipe','pipe']});
   let output='';const timer=setTimeout(()=>{child.kill();reject(fail());},60000);
   child.stdout.setEncoding('utf8');child.stdout.on('data',s=>{output+=s;if(output.length>10000)child.kill();});child.stderr.resume();child.stdin.on('error',()=>{});
   child.on('error',()=>{clearTimeout(timer);reject(fail());});
   child.on('close',code=>{clearTimeout(timer);try{if(code!==0||JSON.parse(output).ok!==true)throw fail();resolve({ok:true});}catch{reject(fail());}});
   child.stdin.end(JSON.stringify({url:target.href,...payload}));
  });
  pending.set(b.requestId,request);
  try{const result=await request;const latest=JSON.parse(fs.readFileSync(journal,'utf8'));latest[b.requestId].state='done';fs.writeFileSync(journal,JSON.stringify(latest));return result;}finally{pending.delete(b.requestId);}
 };
}

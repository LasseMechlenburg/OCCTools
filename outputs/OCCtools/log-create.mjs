import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
const failure=(message,status=502,uncertain=false)=>Object.assign(new Error(message),{status,uncertain});
export function validateLogEntry(b){
 if(!['crew','traffic'].includes(b?.logType)||typeof b.title!=='string'||!b.title.trim()||b.title.length>255||/[\x00-\x1f\x7f]/.test(b.title)||!/^[-a-zA-Z0-9]{16,80}$/.test(b.requestId||''))throw failure('Vælg log og skriv en titel på højst 255 tegn.',400);
 return {logType:b.logType,title:b.title.trim(),requestId:b.requestId};
}
function send(root,url,payload,script='log-create-request.ps1'){
 return new Promise((resolve,reject)=>{
  const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(root,script)],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  let output='',oversize=false;const timer=setTimeout(()=>{child.kill();reject(new Error('Unconfirmed'));},60000);
  child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{output+=chunk;if(output.length>10000){oversize=true;child.kill();}});child.stderr.resume();child.stdin.on('error',()=>{});
  child.on('error',()=>{clearTimeout(timer);reject(new Error('Unconfirmed'));});
  child.on('close',code=>{clearTimeout(timer);try{if(code!==0||oversize||JSON.parse(output).ok!==true)throw new Error();resolve({ok:true});}catch{reject(new Error('Unconfirmed'));}});
  child.stdin.end(JSON.stringify({url,...payload}));
 });
}
export function logWriter(root,file,journalDir,transport,options={}){
 transport??=payload=>send(root,payload.url,payload.body,options.script);
 const pending=new Map();
 return async input=>{
  const b=(options.validate||validateLogEntry)(input),payload=options.payload?options.payload(b):{logType:b.logType,title:b.title},hash=crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  if(!fs.existsSync(file))throw failure('Oprettelse af logposter er ikke konfigureret på serveren.',503);
  let target;try{target=new URL(fs.readFileSync(file,'utf8').trim());if(target.protocol!=='https:'||!target.hostname.endsWith('.environment.api.powerplatform.com')||target.username||target.password)throw new Error();}catch{throw failure('Log-flowets adresse er ugyldig.',503);}
  fs.mkdirSync(journalDir,{recursive:true});const record=path.join(journalDir,b.requestId+'.json');
  const uncertain=()=>failure('Gemningen blev ikke bekræftet. Posten kan være oprettet. Kontrollér SharePoint og flowhistorikken før et nyt forsøg.',502,true);
  if(fs.existsSync(record)){
   let previous;try{previous=JSON.parse(fs.readFileSync(record,'utf8'));}catch{throw uncertain();}
   if(previous.hash!==hash)throw failure('Denne anmodning tilhører en anden titel. Kontrollér det tidligere forsøg.',409,true);
   if(previous.state==='done')return {ok:true};
   if(pending.has(b.requestId))return pending.get(b.requestId);
   throw uncertain();
  }
  fs.writeFileSync(record,JSON.stringify({hash,state:'pending',at:new Date().toISOString()}),{flag:'wx'});
  const task=(async()=>{
   try{
    const result=await transport({url:target.href,body:payload});if(result?.ok!==true)throw new Error('Unconfirmed');
    const temp=record+'.tmp';fs.writeFileSync(temp,JSON.stringify({hash,state:'done',at:new Date().toISOString()}));fs.renameSync(temp,record);return {ok:true};
   }catch{throw uncertain();}
  })();
  pending.set(b.requestId,task);try{return await task;}finally{pending.delete(b.requestId);}
 };
}

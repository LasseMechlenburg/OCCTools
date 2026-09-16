import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
const str=v=>typeof v==='string'?v:typeof v?.Value==='string'?v.Value:'';
function safeLink(v){try{const u=new URL(str(v));return u.protocol==='https:'&&u.hostname==='bwoty.sharepoint.com'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function normalizeLogs(raw){
 const result={generatedAt:new Date().toISOString()};
 for(const key of ['crewLog','trafficLog']){
  const source=raw?.[key];
  if(!Array.isArray(source?.value))throw new Error('Log-flowets svar mangler '+key+'.value.');
  if(source.value.length>5000)throw new Error('Log-flowet returnerede for mange poster.');
  result[key]={partial:!!(source['@odata.nextLink']||raw['@odata.nextLink'])||source.value.length>=5000,items:source.value.filter(t=>str(t.LogStatus).trim().toLowerCase()==='open').map(t=>({id:t.ID,title:str(t.Title),status:'Open',category:str(t.LogCategory),date:str(key==='crewLog'?t.SpecifyDate:t.OriginalFlightDate),link:safeLink(t['{Link}'])})).sort((a,b)=>b.date.localeCompare(a.date)||Number(b.id)-Number(a.id))};
 }
 return result;
}
export function logsReader(root,file){
 let cached=null,pending=null;
 return {
  snapshot:()=>({configured:fs.existsSync(file),data:cached}),
  async read(){
   if(pending)return pending;
   pending=(async()=>{
    if(!fs.existsSync(file))throw new Error('Log-flowet er ikke konfigureret.');
    const target=new URL(fs.readFileSync(file,'utf8').trim());
    if(target.protocol!=='https:'||!target.hostname.endsWith('.environment.api.powerplatform.com')||target.username||target.password)throw new Error('Log-flowets adresse er ugyldig.');
    const text=await new Promise((resolve,reject)=>{
     const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(root,'flow-request.ps1')],{windowsHide:true,stdio:['pipe','pipe','pipe']});
     let output='',oversize=false;
     const fail=()=>new Error('Log-flowet kunne ikke hentes. Kontrollér flowets kørselshistorik.');
     const timer=setTimeout(()=>{child.kill();reject(fail());},60000);
     child.stdout.setEncoding('utf8');child.stdout.on('data',s=>{output+=s;if(output.length>10000000){oversize=true;child.kill();}});child.stderr.resume();child.stdin.on('error',()=>{});
     child.on('error',()=>{clearTimeout(timer);reject(fail());});
     child.on('close',code=>{clearTimeout(timer);if(code!==0||oversize)reject(fail());else resolve(output);});child.stdin.end(target.href);
    });
    let raw;try{raw=JSON.parse(text.replace(/^\uFEFF/,'').trim());}catch{throw new Error('Log-flowet returnerede ikke JSON.');}
    const next=normalizeLogs(raw);cached=next;return cached;
   })();try{return await pending;}finally{pending=null;}
  }
 };
}

import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';

export function templateReader(root,file){
 let cached=null,pending=null;
 return {
  snapshot:()=>({configured:fs.existsSync(file),data:cached}),
  async read(){
   if(pending)return pending;
   pending=(async()=>{
    if(!fs.existsSync(file))throw new Error('Template-flowet er ikke konfigureret.');
    const target=new URL(fs.readFileSync(file,'utf8').trim());
    if(target.protocol!=='https:'||!target.hostname.endsWith('.environment.api.powerplatform.com'))throw new Error('Template-flowets adresse er ugyldig.');
    const text=await new Promise((resolve,reject)=>{
     const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(root,'flow-request.ps1')],{windowsHide:true,stdio:['pipe','pipe','pipe']});
     let output='',oversize=false;
     const timer=setTimeout(()=>{child.kill();reject(new Error('Template-flowet svarede ikke inden for 60 sekunder.'));},60000);
     child.stdout.setEncoding('utf8');
     child.stdout.on('data',chunk=>{output+=chunk;if(output.length>10000000){oversize=true;child.kill();}});
     child.stderr.resume();
     child.on('error',()=>{clearTimeout(timer);reject(new Error('Template-forbindelsen kunne ikke startes.'));});
     child.on('close',code=>{clearTimeout(timer);if(code!==0||oversize)reject(new Error('Template-flowet kunne ikke hentes.'));else resolve(output);});
     child.stdin.on('error',()=>{});child.stdin.end(target.href);
    });
    let raw;try{raw=JSON.parse(text.replace(/^\uFEFF/,'').trim());}catch{throw new Error('Template-flowet returnerede ikke JSON.');}
    if(!Array.isArray(raw.value))throw new Error('Template-flowets svar mangler value.');
    const str=v=>typeof v==='string'?v:typeof v==='number'?String(v):v?.Value||'';
    const safeLink=v=>{try{const u=new URL(typeof v==='string'?v:v?.Url);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
    cached={generatedAt:new Date().toISOString(),partial:!!raw['@odata.nextLink'],items:raw.value.filter(t=>t.Active!==false).map(t=>({id:t.ID,title:str(t.Title),code:str(t.ChecklistCode),sortOrder:Number(t.SortOrder)||0,info:str(t.Info),link:safeLink(t.Link),days:str(t.DaysMask),season:str(t.Season),validFrom:str(t.ValidFrom),validTo:str(t.ValidTo),visibleFrom:str(t.VisibleFrom)})).sort((a,b)=>a.sortOrder-b.sortOrder||a.id-b.id)};
    return cached;
   })();
   try{return await pending;}finally{pending=null;}
  }
 };
}

import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
export function validateDone(b){
 if(!Number.isSafeInteger(b?.itemId)||b.itemId<1||typeof b.doneBy!=='string'||!b.doneBy.trim()||b.doneBy.length>200||/[\x00-\x1f]/.test(b.doneBy))throw Object.assign(new Error('Udfyld dit navn og vælg et gyldigt punkt.'),{status:400});
 return {itemId:b.itemId,doneBy:b.doneBy.trim()};
}
export function doneWriter(root,file){
 const pending=new Map();
 return async input=>{
  const b=validateDone(input);
  if(pending.has(b.itemId))return pending.get(b.itemId);
  if(!fs.existsSync(file))throw new Error('Afkrydsningsflowet er ikke konfigureret.');
  const target=new URL(fs.readFileSync(file,'utf8').trim());
  if(target.protocol!=='https:'||!target.hostname.endsWith('.environment.api.powerplatform.com')||target.username||target.password)throw new Error('Flowadressen er ugyldig.');
  const request=new Promise((resolve,reject)=>{
   const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(root,'done-request.ps1')],{windowsHide:true,stdio:['pipe','pipe','pipe']});
   let output='';const fail=()=>new Error('Gemningen blev ikke bekræftet. Opdatér listen og kontrollér SharePoint før et nyt forsøg.');
   const timer=setTimeout(()=>{child.kill();reject(fail());},60000);
   child.stdout.setEncoding('utf8');child.stdout.on('data',s=>{output+=s;if(output.length>10000)child.kill();});child.stderr.resume();child.stdin.on('error',()=>{});
   child.on('error',()=>{clearTimeout(timer);reject(fail());});
   child.on('close',code=>{clearTimeout(timer);try{const r=JSON.parse(output);if(code!==0||r.ok!==true||r.done!==true)throw fail();resolve({ok:true,done:true,itemId:b.itemId});}catch{reject(fail());}});
   child.stdin.end(JSON.stringify({url:target.href,...b}));
  });pending.set(b.itemId,request);try{return await request;}finally{pending.delete(b.itemId);}
 };
}

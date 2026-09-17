import http from 'node:http';
import {documentLibrary} from './documents.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {templateReader} from './templates.mjs';
import {logsReader} from './logs.mjs';
import {logWriter} from './log-create.mjs';
import {checklistItemWriter} from './checklist-item.mjs';
import {normalizeRunitem} from './runitems.mjs';
import {startWriter,validateStart} from './checklist-start.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const dataDir=process.env.OCC_DATA_DIR||path.join(root,'data');
fs.mkdirSync(dataDir,{recursive:true});
const documents=documentLibrary(dataDir);
const configPath=path.join(dataDir,'config.json');
const cfg=fs.existsSync(configPath)?JSON.parse(fs.readFileSync(configPath,'utf8')):{};
const port=Number(process.env.PORT||cfg.port||8787), base='/OCCtools';
const origin=process.env.OCC_ORIGIN||cfg.origin||`http://127.0.0.1:${port}`;
const file=path.join(dataDir,'content.json');
if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify({revision:1,...JSON.parse(fs.readFileSync(path.join(root,'seed.json'),'utf8'))},null,2),{flag:'wx'});
let content=JSON.parse(fs.readFileSync(file,'utf8'));
const logCreateFile=process.env.OCC_LOG_CREATE_FLOW_URL_FILE||path.join(dataDir,'log-create-flow-url.txt');
const createLogEntry=logWriter(root,logCreateFile,path.join(dataDir,'log-create-attempts'));
const checklistItemFile=process.env.OCC_CHECKLIST_ITEM_FLOW_URL_FILE||path.join(dataDir,'checklist-item-flow-url.txt');
const createChecklistItem=checklistItemWriter(root,checklistItemFile,path.join(dataDir,'checklist-item-attempts'));
const sessions=new Map();let failures=0,blockedUntil=0;
let flightpointCache=null,flightpointPending=null;
const flowFile=process.env.OCC_FLOW_URL_FILE||path.join(dataDir,'flow-url.txt');
const saveChecklistDone=doneWriter(root,process.env.OCC_DONE_FLOW_URL_FILE||path.join(dataDir,'done-flow-url.txt'));
const startFlowFile=process.env.OCC_START_FLOW_URL_FILE||path.join(dataDir,'start-flow-url.txt');
const startReadReady=process.env.OCC_START_READ_READY==='1';
const createChecklist=startWriter(root,startFlowFile,path.join(dataDir,'start-attempts.json'));
const templates=templateReader(root,process.env.OCC_TEMPLATES_FLOW_URL_FILE||path.join(dataDir,'templates-flow-url.txt'));
const logs=logsReader(root,process.env.OCC_LOGS_FLOW_URL_FILE||path.join(dataDir,'logs-flow-url.txt'));
const runitemsFlowFile=process.env.OCC_RUNITEMS_FLOW_URL_FILE||path.join(dataDir,'runitems-flow-url.txt');let runitemsCache=null,runitemsPending=null;
async function readRunitems(){if(runitemsPending)return runitemsPending;runitemsPending=(async()=>{if(!fs.existsSync(runitemsFlowFile))throw new Error('Checklist-flowet er endnu ikke konfigureret på serveren.');const target=new URL(fs.readFileSync(runitemsFlowFile,'utf8').trim());if(target.protocol!=='https:'||!target.hostname.endsWith('.environment.api.powerplatform.com'))throw new Error('Checklist-flowadressen skal være en HTTPS-adresse hos Power Platform.');const text=await new Promise((resolve,reject)=>{const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(root,'flow-request.ps1')],{windowsHide:true,stdio:['pipe','pipe','pipe']});let output='';const timer=setTimeout(()=>{child.kill();reject(new Error('Checklist-flowet svarede ikke inden for 60 sekunder.'));},60000);child.stdout.setEncoding('utf8');child.stdout.on('data',s=>{output+=s;});child.stderr.resume();child.on('error',()=>{clearTimeout(timer);reject(new Error('Serveren kunne ikke starte checklist-flowet.'));});child.on('close',code=>{clearTimeout(timer);if(code!==0)reject(new Error('Checklist-flowet kunne ikke hentes. Kontrollér flowets kørselshistorik.'));else resolve(output);});child.stdin.on('error',()=>{});child.stdin.end(target.href);});let raw;try{raw=JSON.parse(text.replace(/^\uFEFF/,'').trim());}catch{throw new Error('Checklist-flowets Response skal returnere JSON.');}const source=raw.runitems;if(!source||!Array.isArray(source.value))throw new Error('Checklist-flowets svar mangler runitems.value.');if(source.value.length>5000)throw new Error('For mange checklist-poster i flowets svar.');runitemsCache={generatedAt:new Date().toISOString(),runitems:{value:source.value.map(normalizeRunitem),partial:!!source['@odata.nextLink']}};return runitemsCache;})();try{return await runitemsPending;}finally{runitemsPending=null;}}
async function readFlightpoint(){
 if(flightpointPending)return flightpointPending;
 flightpointPending=(async()=>{
  if(!fs.existsSync(flowFile))throw new Error('Flowforbindelsen er endnu ikke konfigureret på serveren.');
  const target=new URL(fs.readFileSync(flowFile,'utf8').trim());
  if(target.protocol!=='https:'||!target.hostname.endsWith('.environment.api.powerplatform.com'))throw new Error('Flowadressen skal være en HTTPS-adresse hos Power Platform.');
  const text=await new Promise((resolve,reject)=>{const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(root,'flow-request.ps1')],{windowsHide:true,stdio:['pipe','pipe','pipe']});let output='';const timer=setTimeout(()=>{child.kill();reject(new Error('Flowet svarede ikke inden for 60 sekunder.'));},60000);child.stdout.setEncoding('utf8');child.stdout.on('data',s=>{output+=s;if(output.length>10000000){child.kill();}});child.stderr.resume();child.on('error',()=>{clearTimeout(timer);reject(new Error('Serveren kunne ikke starte Power Automate-forbindelsen.'));});child.on('close',code=>{clearTimeout(timer);if(code!==0||output.length>10000000)reject(new Error('Flowet kunne ikke hentes. Kontrollér flowets kørselshistorik og serverens netværksadgang.'));else resolve(output);});child.stdin.on('error',()=>{});child.stdin.end(target.href);});let raw;try{raw=JSON.parse(text.replace(/^\uFEFF/,'').trim());}catch{throw new Error('Flowets Response skal returnere JSON.');}
  const clean={generatedAt:new Date().toISOString()};
  for(const key of ['calendar','adhocCalendar','contacts','passwords','runitems']){const source=raw[key]||{value:[]};if(!Array.isArray(source.value))throw new Error(`Flowets svar mangler ${key}.value.`);if(source.value.length>5000)throw new Error('For mange poster i flowets svar.');
   clean[key]={value:source.value.map(t=>({ID:t.ID,Title:t.Title,StartTime:t.StartTime,EndTime:t.EndTime,FlightDate:t.FlightDate,Run:t.Run,Description:t.Description||t.Info,Category:{Value:t.Category?.Value},Phone:t.Phone,Email:t.Email,UserName:t.UserName||t.Username||t.User||t.Account,Password:t.Password||t.Secret,URL:t.URL||t.Url,Day:t.Day||t.Code||t.Duty,Completed:t.Completed,Done:t.Done,Status:t.Status?.Value||t.Status,'{Link}':t['{Link}']})),partial:!!source['@odata.nextLink']};
  }
  flightpointCache=clean;return clean;
 })();try{return await flightpointPending;}finally{flightpointPending=null;}
}
// Checklist-flowet hentes direkte via Node HTTPS. Det undgår PowerShells
// tekst-/encoding-konvertering, som kan få et ellers gyldigt JSON-svar til at fejle.
async function readRunitemsDirect(){
 if(runitemsPending)return runitemsPending;
 runitemsPending=(async()=>{
  if(!fs.existsSync(runitemsFlowFile))throw new Error('Checklist-flowet er endnu ikke konfigureret på serveren.');
  const target=new URL(fs.readFileSync(runitemsFlowFile,'utf8').trim());
  if(target.protocol!=='https:'||!target.hostname.endsWith('.environment.api.powerplatform.com'))throw new Error('Checklist-flowadressen skal være en HTTPS-adresse hos Power Platform.');
  const response=await fetch(target,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:'{}',signal:AbortSignal.timeout(55000)});
  const text=await response.text();
  if(!response.ok)throw new Error('Checklist-flowet kunne ikke hentes. Kontrollér flowets kørselshistorik.');
  let raw;try{raw=JSON.parse(text.replace(/^\uFEFF/,'').trim());if(typeof raw==='string')raw=JSON.parse(raw);}catch{throw new Error('Checklist-flowets Response skal returnere JSON.');}
  if(raw?.body&&!raw.runitems)raw=raw.body;
  const source=raw.runitems;
  if(!source||!Array.isArray(source.value))throw new Error('Checklist-flowets svar mangler runitems.value.');
  if(source.value.length>5000)throw new Error('For mange checklist-poster i flowets svar.');
  runitemsCache={generatedAt:new Date().toISOString(),runitems:{value:source.value.map(normalizeRunitem),partial:!!source['@odata.nextLink']}};
  return runitemsCache;
 })();
 try{return await runitemsPending;}finally{runitemsPending=null;}
}
function reply(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
function session(req){const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('occ_session='))?.slice(12);const s=sessions.get(token);return s&&s.expires>Date.now()?{token,...s}:null;}
function cookie(token,maxAge){return `occ_session=${token}; Path=${base}; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${origin.startsWith('https:')?'; Secure':''}`;}
async function body(req,limit=500000){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)throw Object.assign(new Error('Indholdet er for stort.'),{status:413});chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(new Error('Ugyldigt indhold.'),{status:400});}}
const str=(v,max=200)=>typeof v==='string'&&v.length<=max;
const url=v=>str(v,4000)&&(!v||/^\/OCCtools\/documents\/[a-z0-9-]+\.pdf$/.test(v)||(/^https?:\/\//i.test(v)&&(()=>{try{const u=new URL(v);return !u.username&&!u.password;}catch{return false;}})()));
function valid(c){if(!c||!str(c.title,80)||!c.title.trim()||typeof c.projectsVisible!=='boolean'||!Array.isArray(c.categories)||c.categories.length>40||!Array.isArray(c.projects)||c.projects.length>30)return false;
 const ids=new Set();const id=v=>str(v,100)&&/^[a-zA-Z0-9_-]+$/.test(v)&&!ids.has(v)&&!!ids.add(v);
 return c.categories.every(g=>id(g.id)&&str(g.name)&&g.name.trim()&&str(g.description,3000)&&['hotel','roster','plane','book','calendar'].includes(g.icon)&&url(g.manual)&&Array.isArray(g.tools)&&g.tools.length<=100&&g.tools.every(t=>id(t.id)&&str(t.name)&&t.name.trim()&&url(t.url)&&str(t.description,12000)&&url(t.manual)&&(t.display===undefined||['link','pdf'].includes(t.display))))&&c.projects.every(p=>id(p.id)&&str(p.name)&&p.name.trim()&&str(p.label)&&str(p.status)&&str(p.date)&&str(p.summary,2000)&&str(p.body,18000)&&typeof p.visible==='boolean'&&Array.isArray(p.milestones)&&p.milestones.length<=10&&p.milestones.every(m=>str(m.date)&&str(m.text,500)));}
const server=http.createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','SAMEORIGIN');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'self' https://bwoty.sharepoint.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'self'");
try{const pathname=new URL(req.url,'http://localhost').pathname;
if(pathname==='/'||pathname===base){res.writeHead(302,{Location:base+'/'});return res.end();}
if(!pathname.startsWith(base+'/'))return reply(res,404,{error:'Ikke fundet.'});
const route=pathname.slice(base.length);
const previewRoute=/^\/document-preview\/([a-z0-9-]+)\/(\d+)\.png$/.exec(route);
if(req.method==='GET'&&previewRoute)return await documents.preview(req,res,previewRoute[1],Number(previewRoute[2]));
if((req.method==='GET'||req.method==='HEAD')&&route.startsWith('/documents/')&&route.endsWith('.pdf'))return documents.serve(req,res,route.slice(11,-4));
if(route.startsWith('/api/')){
 if(req.method==='GET'&&route==='/api/documents')return reply(res,200,documents.list(new URL(req.url,'http://localhost').searchParams));
 if(req.method==='GET'&&route==='/api/content')return reply(res,200,content);
 if(req.method==='GET'&&route==='/api/templates')return reply(res,200,templates.snapshot());
 if(req.method==='GET'&&route==='/api/logs')return reply(res,200,logs.snapshot());
 if(req.method==='GET'&&route==='/api/log-create')return reply(res,200,{configured:fs.existsSync(logCreateFile)});
 if(req.method==='GET'&&route==='/api/checklist-item')return reply(res,200,{configured:fs.existsSync(checklistItemFile)});
 if(req.method==='GET'&&route==='/api/checklist-start')return reply(res,200,{configured:fs.existsSync(startFlowFile),ready:startReadReady&&fs.existsSync(startFlowFile)});
 if(req.method==='GET'&&route==='/api/flightpoint')return reply(res,200,{configured:fs.existsSync(flowFile),data:flightpointCache});
 if(req.method==='GET'&&route==='/api/runitems')return reply(res,200,{configured:fs.existsSync(runitemsFlowFile),data:runitemsCache});
 if(req.method==='GET'&&route==='/api/calendar-preview'){
  const preview=process.env.OCC_CALENDAR_PREVIEW_FILE;
  if(!preview||req.headers.host!==`127.0.0.1:${port}`)return reply(res,200,{available:false});
  const raw=JSON.parse(fs.readFileSync(preview,'utf8'));
  return reply(res,200,{available:true,snapshot:{statusCode:raw.statusCode,headers:{Date:raw.headers?.Date},body:{'@odata.nextLink':raw.body?.['@odata.nextLink']?'more-pages':undefined,value:raw.body?.value?.map(t=>({ID:t.ID,Title:t.Title,StartTime:t.StartTime,EndTime:t.EndTime,Description:t.Description,Category:{Value:t.Category?.Value},'{Link}':t['{Link}']}))}}});
 }
 if(req.method==='GET'&&route==='/api/session'){const s=session(req);return reply(res,200,{authenticated:!!s,csrf:s?.csrf,configured:!!cfg.passwordHash});}
 if(!['POST','PUT'].includes(req.method))return reply(res,405,{error:'Metoden er ikke tilladt.'});
 if(req.headers.origin!==origin)return reply(res,403,{error:'Anmodningen kommer fra en anden adresse end den konfigurerede portal.'});
 if(req.method==='POST'&&route==='/api/log-create'){
  const input=await body(req,4096);
  try{return reply(res,200,await createLogEntry(input));}catch(e){return reply(res,e.status||502,{error:e.message,uncertain:e.uncertain!==false&&e.status!==400&&e.status!==503});}
 }
 if(req.method==='POST'&&route==='/api/checklist-item'){
  const input=await body(req,4096);
  try{return reply(res,200,await createChecklistItem(input));}catch(e){return reply(res,e.status||502,{error:e.message,uncertain:e.uncertain!==false&&e.status!==400&&e.status!==503});}
 }
 if(req.method==='POST'&&route==='/api/checklist-start'){
  const input=validateStart(await body(req));
  if(!startReadReady)return reply(res,503,{error:'Oprettelse afventer kontrol af henteflowet for åbne adhoc-checklister.'});
  try{return reply(res,200,await createChecklist(input));}catch(e){return reply(res,502,{error:e.message});}
 }
 if(req.method==='POST'&&route==='/api/checklist-done'){
  const input=validateDone(await body(req));
  if(!runitemsCache?.runitems.value.some(t=>Number(t.ID)===input.itemId))return reply(res,400,{error:'Punktet er ikke i den hentede liste. Opdatér checklisterne først.'});
  try{const result=await saveChecklistDone(input);for(const item of runitemsCache?.runitems.value||[])if(Number(item.ID)===input.itemId)item.Done=true;return reply(res,200,result);}catch{return reply(res,502,{error:'Gemningen blev ikke bekræftet. Opdatér listen og kontrollér SharePoint før et nyt forsøg.'});}
 }
 if(req.method==='POST'&&route==='/api/templates'){try{return reply(res,200,{configured:true,data:await templates.read()});}catch(e){return reply(res,502,{error:e.message});}}
 if(req.method==='POST'&&route==='/api/logs'){try{return reply(res,200,{configured:true,data:await logs.read()});}catch(e){return reply(res,502,{error:e.message});}}
 if(req.method==='POST'&&route==='/api/flightpoint'){try{return reply(res,200,{configured:true,data:await readFlightpoint()});}catch(e){return reply(res,502,{error:e.message});}}
 if(req.method==='POST'&&route==='/api/runitems'){try{return reply(res,200,{configured:true,data:await readRunitems()});}catch(e){return reply(res,502,{error:e.message});}}
 if(route==='/api/login'&&req.method==='POST'){
  if(!cfg.passwordHash)return reply(res,503,{error:'Admin er ikke sat op endnu. Kør installationsvejledningen på serveren.'});
  if(Date.now()<blockedUntil)return reply(res,429,{error:'For mange forsøg. Prøv igen om 15 minutter.'});
  const b=await body(req);const pwd=typeof b.password==='string'?b.password:'';
  if(pwd.length>1000)return reply(res,400,{error:'Ugyldigt login.'});
  const hash=crypto.scryptSync(pwd,cfg.salt,64),expected=Buffer.from(cfg.passwordHash,'hex');
  const accepted=b.username===(cfg.username||'admin')&&expected.length===hash.length&&crypto.timingSafeEqual(hash,expected);
  if(!accepted){if(++failures>=8){blockedUntil=Date.now()+900000;failures=0;}return reply(res,401,{error:'Forkert brugernavn eller adgangskode.'});}
  failures=0;for(const[k,s]of sessions)if(s.expires<Date.now())sessions.delete(k);
  if(sessions.size>=100)sessions.clear();const token=crypto.randomBytes(32).toString('hex'),csrf=crypto.randomBytes(24).toString('hex');sessions.set(token,{csrf,expires:Date.now()+8*3600000});res.setHeader('Set-Cookie',cookie(token,28800));return reply(res,200,{authenticated:true,csrf});
 }
 const s=session(req);if(!s)return reply(res,401,{error:'Log ind som admin for at fortsætte.'});
 if(req.headers['x-csrf-token']!==s.csrf)return reply(res,403,{error:'Sessionen er ændret. Log ind igen.'});
 if(route==='/api/documents'&&req.method==='POST')return reply(res,200,await documents.upload(await body(req,35500000)));
 if(route==='/api/logout'&&req.method==='POST'){sessions.delete(s.token);res.setHeader('Set-Cookie',cookie('',0));return reply(res,200,{ok:true});}
 if(route==='/api/content'&&req.method==='PUT'){const next=await body(req);if(next.revision!==content.revision)return reply(res,409,{error:'Indholdet er ændret i en anden fane. Kopiér dine ændringer, og genindlæs siden.'});if(!valid(next))return reply(res,400,{error:'Kontrollér navne, tekstlængder og links. Links skal starte med http:// eller https://.'});
 const clean={revision:content.revision+1,title:next.title,projectsVisible:next.projectsVisible,projects:next.projects,categories:next.categories,updatedAt:new Date().toISOString()};
 fs.copyFileSync(file,path.join(dataDir,`backup-${content.revision}.json`));const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(clean,null,2));fs.renameSync(temp,file);content=clean;return reply(res,200,content);}
 return reply(res,404,{error:'Ikke fundet.'});
}
if(req.method!=='GET'&&req.method!=='HEAD')return reply(res,405,{error:'Metoden er ikke tilladt.'});
const manuals={
 '/manuals/gna-slot-extension.pdf':{file:'gna-slot-extension.pdf',type:'application/pdf',disposition:'inline'},
 '/manuals/gna-occ-howto.pptx':{file:'gna-occ-howto.pptx',type:'application/vnd.openxmlformats-officedocument.presentationml.presentation',disposition:'attachment'}
};
if(manuals[route]){const m=manuals[route],target=path.join(root,'dist','manuals',m.file);if(!fs.existsSync(target))return reply(res,404,{error:'Manualen findes ikke.'});res.writeHead(200,{'Content-Type':m.type,'Content-Length':fs.statSync(target).size,'Content-Disposition':`${m.disposition}; filename="${m.file}"`,'Cache-Control':'private, max-age=300'});if(req.method==='HEAD')return res.end();fs.createReadStream(target).pipe(res);return;}
const assets={'/documents.js':'documents.js','/templates.js':'templates.js','/':'index.html','/app.js':'app.js','/style.css':'style.css','/wheel.css':'wheel.css','/logo.png':'logo.png'};const asset=assets[route];if(!asset)return reply(res,404,{error:'Ikke fundet.'});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'};res.writeHead(200,{'Content-Type':types[path.extname(asset)],'Cache-Control':asset==='index.html'?'no-cache':'public, max-age=300'});if(req.method==='HEAD')return res.end();fs.createReadStream(path.join(root,'dist',asset)).pipe(res);
}catch(e){if(!res.headersSent)reply(res,e.status||500,{error:e.status?e.message:'Handlingen kunne ikke gennemføres. Prøv igen.'});else res.end();console.error('OCC request error:',e.message);}});
server.listen(port,'127.0.0.1',()=>console.log(`OCC tools: http://127.0.0.1:${port}${base}/`));
import {doneWriter,validateDone} from './checklist-done.mjs';

import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import crypto from 'node:crypto';
const execute=promisify(execFile);
export function documentLibrary(dataDir){
 const folder=path.join(dataDir,'documents'),index=path.join(folder,'index.json');
 let stamp=-1,docs=[];
 function read(){if(!fs.existsSync(index))return [];const updated=fs.statSync(index).mtimeMs;if(updated!==stamp){docs=JSON.parse(fs.readFileSync(index,'utf8'));stamp=updated;}return docs;}
 function list(params){const q=(params.get('q')||'').trim().toLocaleLowerCase('da').slice(0,200),category=params.get('category'),id=params.get('id'),folderFilter=params.get('folder');let rows=[];
 for(const d of read()){if(category&&d.category!==category||id&&d.id!==id||folderFilter&&d.folder!==folderFilter&&!d.alsoIn?.includes(folderFilter))continue;const {pages,...meta}=d;if(!q){rows.push(meta);continue;}
 const title=d.title.toLocaleLowerCase('da').includes(q);let matches=0;
 for(let i=0;i<pages.length;i++){const text=pages[i].replace(/\s+/g,' '),at=text.toLocaleLowerCase('da').indexOf(q);if(at>=0){rows.push({...meta,page:i+1,snippet:text.slice(Math.max(0,at-80),at+180)});if(++matches>=(id?2000:3))break;}}
 if(title&&!matches)rows.push({...meta,page:1,snippet:d.searchablePages?'Titelmatch':'Titelmatch · scannet PDF, indhold kræver OCR'});
 }return {total:rows.length,items:q&&!id?rows.slice(0,60):rows};}
 function serve(req,res,id){if(!/^[a-z0-9-]+$/.test(id)||!read().some(d=>d.id===id)){res.writeHead(404);res.end();return;}
 const doc=read().find(d=>d.id===id),file=path.join(folder,doc.file||id+'.pdf'),size=fs.statSync(file).size;
 const headers={'Content-Type':'application/pdf','Content-Disposition':'inline; filename="'+id+'.pdf"','Cache-Control':'no-store','Accept-Ranges':'bytes'};
 const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');if(req.headers.range&&!match){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
 const start=match?Number(match[1]):0,end=match&&match[2]?Math.min(Number(match[2]),size-1):size-1;
 if(start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
 if(match)headers['Content-Range']=`bytes ${start}-${end}/${size}`;headers['Content-Length']=end-start+1;
 res.writeHead(match?206:200,headers);if(req.method==='HEAD')res.end();else fs.createReadStream(file,{start,end}).pipe(res);
 }
 const pending=new Map();
 async function preview(req,res,id,page){
  const doc=read().find(d=>d.id===id);if(!doc||!Number.isInteger(page)||page<1||page>doc.pageCount){res.writeHead(404);res.end();return;}
  const cache=path.join(folder,'previews');fs.mkdirSync(cache,{recursive:true});
  const target=path.join(cache,`${doc.version||id}-${page}.png`),key=(doc.version||id)+'-'+page;
  if(!fs.existsSync(target)){
   if(!pending.has(key)){
    if(pending.size>=2){res.writeHead(429);res.end();return;}
    const python=process.env.OCC_PYTHON||path.join(process.env.USERPROFILE||'', '.cache','codex-runtimes','codex-primary-runtime','dependencies','python','python.exe');
    const script=fileURLToPath(new URL('./pdf-preview.py',import.meta.url));
    const temp=target+'.tmp';
    pending.set(key,execute(python,[script,path.join(folder,doc.file||id+'.pdf'),String(page),temp],{windowsHide:true,timeout:30000,maxBuffer:8192}).then(()=>fs.renameSync(temp,target)).finally(()=>{pending.delete(key);if(fs.existsSync(temp))fs.unlinkSync(temp);}));
   }
   await pending.get(key);
  }
  res.writeHead(200,{'Content-Type':'image/png','Content-Length':fs.statSync(target).size,'Cache-Control':'no-store'});fs.createReadStream(target).pipe(res);
 }
 let uploading=false;
 async function upload(input){
  const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
  if(uploading)fail('En PDF behandles allerede. Prøv igen om lidt.',409);
  if(!input||typeof input.base64!=='string'||input.base64.length>35000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(input.base64))fail('Vælg en PDF på højst 25 MB.');
  const bytes=Buffer.from(input.base64,'base64');if(bytes.length>25*1024*1024||bytes.subarray(0,5).toString()!=='%PDF-')fail('Filen er ikke en gyldig PDF på højst 25 MB.');
  const old=input.id?read().find(d=>d.id===input.id):null;if(input.id&&!old)fail('Dokumentet findes ikke.',404);
  if(old&&(input.version||'')!==(old.version||''))fail('PDF’en er ændret siden du åbnede admin. Hent listen igen.',409);
  if(!old&&(typeof input.title!=='string'||!input.title.trim()||input.title.length>200||typeof input.category!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(input.category)||typeof input.folder!=='string'||input.folder.length>200))fail('Udfyld navn og menu.');
  uploading=true;fs.mkdirSync(folder,{recursive:true});const version=crypto.randomUUID(),id=old?.id||'pdf-'+crypto.randomUUID(),filename=version+'.pdf',target=path.join(folder,filename);
  try{
   fs.writeFileSync(target,bytes,{flag:'wx'});
   const python=process.env.OCC_PYTHON||path.join(process.env.USERPROFILE||'','.cache','codex-runtimes','codex-primary-runtime','dependencies','python','python.exe');
   let parsed;try{const result=await execute(python,[fileURLToPath(new URL('./pdf-index.py',import.meta.url)),target],{windowsHide:true,timeout:60000,maxBuffer:24000000,encoding:'utf8'});parsed=JSON.parse(result.stdout);}catch{fail('PDF’en kunne ikke læses. Brug en PDF uden adgangskode (maks. 2.000 sider).',422);}
   if(!Array.isArray(parsed.pages)||!parsed.pages.length)fail('PDF’en har ingen læsbare sider.',422);
   const updated={...(old||{}),id,title:old?.title||input.title.trim(),category:old?.category||input.category,folder:old?.folder||input.folder,addedAt:old?.addedAt||new Date().toISOString(),updatedAt:new Date().toISOString(),version,file:filename,pages:parsed.pages,pageCount:parsed.pages.length,searchablePages:parsed.pages.filter(p=>p.trim()).length};
   const next=read().filter(d=>d.id!==id).concat(updated);
   if(fs.existsSync(index))fs.copyFileSync(index,path.join(folder,'index-backup-'+version+'.json'));
   fs.writeFileSync(index+'.tmp',JSON.stringify(next));fs.renameSync(index+'.tmp',index);stamp=-1;
   const {pages,...meta}=updated;return {...meta,url:'/OCCtools/documents/'+id+'.pdf'};
  }catch(e){if(fs.existsSync(target)&&!read().some(d=>d.file===filename))fs.unlinkSync(target);throw e;}finally{uploading=false;}
 }
 return {list,serve,preview,upload};
}

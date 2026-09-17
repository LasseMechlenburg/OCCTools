import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
export function addSlotLinks(content){
 const next=structuredClone(content),menu=next.categories?.find(c=>c.id==='operations')||next.categories?.find(c=>c.name==='Trafik');
 if(!Array.isArray(menu?.tools))throw Error('Trafik menu was not found. No content changed.');
 let changed=false;
 for(const item of [{id:'online-slot-coordination',name:'Online Slot Coordination',url:'https://www.online-coordination.com',description:'Online slotkoordinering.',manual:'',active:true},{id:'e-airport-slots',name:'E-Airport Slots',url:'https://e-airportslots.aero',description:'Airport slots.',manual:'',active:true}]){
  if(next.categories.some(c=>c.tools?.some(t=>t.id===item.id||t.url?.replace(/\/$/,'')===item.url)))continue;
  menu.tools.push(item);changed=true;
 }
 if(changed)next.revision=Number(next.revision||0)+1;return {content:next,changed};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const file=process.argv[2];if(!file)throw Error();const result=addSlotLinks(JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')));if(result.changed){const temp=file+'.slots-update.tmp';fs.writeFileSync(temp,JSON.stringify(result.content,null,2));fs.renameSync(temp,file);}console.log(result.changed?'Two slot links merged; existing settings preserved.':'Slot links already exist; content unchanged.');}catch{console.error('Slot link migration failed. Restore backup; no content is printed.');process.exitCode=1;}
}

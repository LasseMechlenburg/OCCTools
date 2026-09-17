import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {checklistItemWriter,validateChecklistItem,copenhagenDate} from './checklist-item.mjs';
const input={mode:'open',runId:1243,title:' Test æøå ',requestId:'checklist-request-123456789'};
test('open items use a concrete run ID, including adhoc; unrelated fields are stripped',()=>{
 assert.deepEqual(validateChecklistItem({...input,checklistCode:'DIV',date:'2000-01-01',Done:true}),{mode:'open',runId:1243,title:'Test æøå',requestId:input.requestId});
 for(const runId of [0,-1,1.5,'1243',null])assert.throws(()=>validateChecklistItem({...input,runId}),e=>e.status===400);
});
test('future items use one real future Danish date and routine code',()=>{
 const now=new Date('2026-09-17T22:30:00Z');
 assert.equal(copenhagenDate(now),'2026-09-18');
 const b={...input,mode:'future',checklistCode:'CN',date:'2026-09-19'};
 assert.equal(validateChecklistItem(b,now).date,'2026-09-19');
 for(const date of ['2026-09-18','2026-09-17','2026-02-30','2026-13-01','bad'])assert.throws(()=>validateChecklistItem({...b,date},now));
 assert.throws(()=>validateChecklistItem({...b,checklistCode:'DIV'},now));
});
test('invalid title, mode and request ID never pass validation',()=>{
 for(const b of [{...input,title:''},{...input,title:'x'.repeat(256)},{...input,title:'a\nb'},{...input,mode:'other'},{...input,requestId:'../bad'}])assert.throws(()=>validateChecklistItem(b));
});
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'occ-item-test-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const file=path.join(root,'flow.txt'),journal=path.join(root,'attempts');fs.writeFileSync(file,'https://example.environment.api.powerplatform.com/test');return {root,file,journal};}
test('successful write and restart do not duplicate the same request',async t=>{
 const f=fixture(t);let calls=0;const transport=async({body})=>{calls++;assert.deepEqual(body,{mode:'open',title:'Test æøå',runId:1243});return {ok:true};};
 const write=checklistItemWriter(f.root,f.file,f.journal,transport);
 await write(input);await write(input);await checklistItemWriter(f.root,f.file,f.journal,transport)(input);
 assert.equal(calls,1);await assert.rejects(write({...input,runId:1244}),e=>e.status===409);
});
test('uncertain response blocks retry, also after restart',async t=>{
 const f=fixture(t);let calls=0;const transport=async()=>{calls++;throw Error('upstream secret');};
 const write=checklistItemWriter(f.root,f.file,f.journal,transport);
 await assert.rejects(write(input),e=>e.uncertain&&!e.message.includes('secret'));
 await assert.rejects(checklistItemWriter(f.root,f.file,f.journal,transport)(input),e=>e.uncertain);assert.equal(calls,1);
});

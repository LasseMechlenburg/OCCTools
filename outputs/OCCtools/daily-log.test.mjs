import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {dailyLogService,validateDailyEntry,normalizeDaily,dayInDenmark,validDay} from './daily-log.mjs';
const today='2026-09-17',input={date:today,mode:'create',entryText:'Linje 1\nÆøå "test"',name:' Lasse ',requestId:'daily-request-123456789'};
const item={ID:1,EntryText:'Original',Created:'2026-09-17T09:00:00Z',Modified:'2026-09-17T09:00:00Z',CreatedByName:'Anne',ModifiedByName:'Anne','@odata.etag':'"1"'};
function fixture(t,send){const root=fs.mkdtempSync(path.join(os.tmpdir(),'occ-daily-test-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const readFile=path.join(root,'read.txt'),writeFile=path.join(root,'write.txt');for(const f of [readFile,writeFile])fs.writeFileSync(f,'https://example.environment.api.powerplatform.com/'+path.basename(f));let instant=new Date('2026-09-17T12:00:00Z');const options={root,readFile,writeFile,journalDir:path.join(root,'journal'),send,now:()=>instant};return {options,service:dailyLogService(options),time:v=>instant=new Date(v)};}
test('Danish day and leap date validation',()=>{
 assert.equal(dayInDenmark(new Date('2026-09-17T22:01:00Z')),'2026-09-18');
 assert.equal(dayInDenmark(new Date('2026-01-17T23:01:00Z')),'2026-01-18');
 assert.equal(validDay('2026-02-30'),false);assert.equal(validDay('2028-02-29'),true);
});
test('validates name, long multiline text, day, id and exact ETag',()=>{
 assert.equal(validateDailyEntry(input,today).name,'Lasse');
 assert.equal(validateDailyEntry({...input,entryText:'a'.repeat(63999)},today).entryText.length,63999);
 for(const b of [{...input,name:''},{...input,name:'x'.repeat(201)},{...input,entryText:'a'.repeat(64000)},{...input,date:'2026-09-16'},{...input,mode:'other'},{...input,mode:'update',itemId:1,etag:'*'}])assert.throws(()=>validateDailyEntry(b,today));
});
test('normalizes names, ETags, pagination and rejects a mismatched date',()=>{
 const r=normalizeDaily({value:[item],'@odata.nextLink':'next'},today,today);assert.equal(r.items[0].createdBy,'Anne');assert.equal(r.items[0].etag,'"1"');assert.equal(r.partial,true);
 assert.throws(()=>normalizeDaily({value:[item]},'2026-09-16',today));
});
test('create sends only approved flow fields and journals success across restart',async t=>{
 let calls=0;const f=fixture(t,async({body})=>{calls++;assert.deepEqual(body,{mode:'create',entryText:input.entryText,name:'Lasse',requestId:input.requestId});return {status:200,body:{ok:true}};});
 await f.service.write(input);await f.service.write(input);await dailyLogService(f.options).write(input);assert.equal(calls,1);
 await assert.rejects(f.service.write({...input,entryText:'different'}),e=>e.uncertain);
});
test('update checks latest version and never sends creator or date fields',async t=>{
 const calls=[];const f=fixture(t,async r=>{calls.push(r.body);return r.body.date?{status:200,body:{value:[item]}}:{status:200,body:{ok:true}};});
 await f.service.write({...input,mode:'update',itemId:1,etag:'"1"'});assert.equal(calls.length,2);assert.equal(calls[1].name,'Lasse');assert.equal('CreatedByName' in calls[1],false);assert.equal('date' in calls[1],false);
});
test('stale version rejects before any update call',async t=>{
 let calls=0;const f=fixture(t,async()=>{calls++;return {status:200,body:{value:[item]}};});
 await assert.rejects(f.service.write({...input,mode:'update',itemId:1,etag:'"2"'}),e=>e.status===409&&!e.uncertain);assert.equal(calls,1);
});
test('SharePoint atomic version rejection is preserved and not retried',async t=>{
 let calls=0;const f=fixture(t,async()=>{calls++;return {status:409,body:{ok:false}};});
 await assert.rejects(f.service.write(input),e=>e.status===409&&!e.uncertain);await assert.rejects(f.service.write(input),e=>e.status===409);assert.equal(calls,1);
});
test('timeout stays uncertain and cannot repeat after restart',async t=>{
 let calls=0;const f=fixture(t,async()=>{calls++;throw Error('secret upstream');});
 await assert.rejects(f.service.write(input),e=>e.uncertain&&!e.message.includes('secret'));
 await assert.rejects(dailyLogService(f.options).write(input),e=>e.uncertain);assert.equal(calls,1);
});
test('midnight during preflight rejects write',async t=>{
 let calls=0;const f=fixture(t,async()=>{calls++;f.time('2026-09-17T22:00:01Z');return {status:200,body:{value:[item]}};});
 await assert.rejects(f.service.write({...input,mode:'update',itemId:1,etag:'"1"'}),e=>e.status===409);assert.equal(calls,1);
});
test('simultaneous same request invokes transport only once',async t=>{
 let finish,calls=0;const f=fixture(t,()=>{calls++;return new Promise(r=>finish=r);});const a=f.service.write(input),b=f.service.write(input);finish({status:200,body:{ok:true}});await Promise.all([a,b]);assert.equal(calls,1);
});

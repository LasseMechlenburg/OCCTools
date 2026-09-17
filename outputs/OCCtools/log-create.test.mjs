import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {logWriter,validateLogEntry} from './log-create.mjs';
const input={logType:'traffic',title:'Test æøå',requestId:'12345678-1234-1234-1234-123456789abc'};
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'occ-log-test-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const file=path.join(root,'flow.txt'),journal=path.join(root,'attempts');fs.writeFileSync(file,'https://example.environment.api.powerplatform.com/test');return {root,file,journal};}
test('requires valid type, title and request ID',()=>{
 assert.equal(validateLogEntry({...input,title:'  Ændring  '}).title,'Ændring');
 for(const value of [{...input,title:' '},{...input,title:'x'.repeat(256)},{...input,title:'a\nb'},{...input,logType:'other'},{...input,requestId:'../../bad'}])assert.throws(()=>validateLogEntry(value),e=>e.status===400);
});
test('sends only title and logType; repeated success is not sent again after restart',async t=>{
 const f=fixture(t);let calls=0;const transport=async({body})=>{calls++;assert.deepEqual(body,{logType:'traffic',title:'Test æøå'});return {ok:true};};
 const writer=logWriter(f.root,f.file,f.journal,transport);await writer(input);await writer(input);
 await logWriter(f.root,f.file,f.journal,transport)(input);assert.equal(calls,1);
 await assert.rejects(writer({...input,title:'different'}),e=>e.status===409);
});
test('concurrent double submit invokes transport once',async t=>{
 const f=fixture(t);let calls=0,finish;const writer=logWriter(f.root,f.file,f.journal,()=>{calls++;return new Promise(resolve=>finish=resolve);});
 const first=writer(input),second=writer(input);finish({ok:true});await Promise.all([first,second]);assert.equal(calls,1);
});
test('uncertain failure is never automatically repeated, including after restart',async t=>{
 const f=fixture(t);let calls=0;const transport=async()=>{calls++;throw new Error('private upstream response');};
 const writer=logWriter(f.root,f.file,f.journal,transport);
 await assert.rejects(writer(input),e=>e.uncertain&&!e.message.includes('private upstream'));
 await assert.rejects(writer(input),e=>e.uncertain);
 await assert.rejects(logWriter(f.root,f.file,f.journal,transport)(input),e=>e.uncertain);assert.equal(calls,1);
});
test('missing configuration and invalid URL never call transport',async t=>{
 const f=fixture(t);let calls=0;const transport=async()=>{calls++;};
 await assert.rejects(logWriter(f.root,path.join(f.root,'missing'),f.journal,transport)(input),e=>e.status===503&&!e.uncertain);
 fs.writeFileSync(f.file,'http://example.com');await assert.rejects(logWriter(f.root,f.file,f.journal,transport)(input),e=>e.status===503);assert.equal(calls,0);
});
test('false success response remains uncertain',async t=>{
 const f=fixture(t);await assert.rejects(logWriter(f.root,f.file,f.journal,async()=>({ok:false}))(input),e=>e.uncertain);
});

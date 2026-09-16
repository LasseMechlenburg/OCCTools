import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {documentLibrary} from './documents.mjs';

const fixturesAvailable=fs.existsSync(new URL('./data/documents/approved-airlines.pdf',import.meta.url))&&fs.existsSync(new URL('./data/documents/vps-transport.pdf',import.meta.url));
test('PDF upload, replacement, backup and validation in isolated storage',{skip:!fixturesAvailable?'Private PDF fixtures are not included in Git':false},async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'occ-pdf-test-'));
 const lib=documentLibrary(temp),base64=fs.readFileSync(new URL('./data/documents/approved-airlines.pdf',import.meta.url)).toString('base64');
 const first=await lib.upload({title:'Test document',category:'procedures',folder:'Test',base64});
 assert.equal(first.pageCount,2);assert.equal(first.searchablePages,2);
 assert.equal(lib.list(new URLSearchParams('q=Udestående')).items[0].page,2);
 const replacement=fs.readFileSync(new URL('./data/documents/vps-transport.pdf',import.meta.url)).toString('base64');
 const second=await lib.upload({id:first.id,version:first.version,base64:replacement});
 assert.equal(second.searchablePages,0);assert.equal(lib.list(new URLSearchParams('q=Udestående')).total,0);
 assert.equal(first.id,second.id);assert.notEqual(first.file,second.file);
 assert.ok(fs.existsSync(path.join(temp,'documents',first.file)));
 assert.ok(fs.readdirSync(path.join(temp,'documents')).some(n=>n.startsWith('index-backup-')));
 await assert.rejects(lib.upload({id:first.id,version:first.version,base64}),e=>e.status===409);
 await assert.rejects(lib.upload({id:'../outside',base64}),e=>e.status===404);
 await assert.rejects(lib.upload({title:'Invalid',category:'procedures',folder:'',base64:Buffer.from('not PDF').toString('base64')}),e=>e.status===400);
 await assert.rejects(lib.upload({title:'Broken',category:'procedures',folder:'',base64:Buffer.from('%PDF-broken').toString('base64')}),e=>e.status===422);
 assert.equal(lib.list(new URLSearchParams()).total,1);
});

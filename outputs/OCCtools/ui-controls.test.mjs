import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {test} from 'node:test';

const app=readFileSync(new URL('./dist/app.js',import.meta.url),'utf8');
const copySource=app.slice(app.indexOf('function copyButton('),app.indexOf('function initializeTheme('));
const groupSource=app.slice(app.indexOf('function searchToolGroup('),app.indexOf('function portalSearch(){'));
function copyHarness(writeText){
 const messages=[];
 const context=vm.createContext({navigator:{clipboard:{writeText}},toast:v=>messages.push(v),setTimeout:()=>{},button:(text,cls,onclick)=>({textContent:text,onclick,setAttribute(){}})});
 vm.runInContext(copySource,context);
 return {make:(value)=>context.copyButton(value,'password'),messages};
}
test('copy uses the actual value, not the masked display, and reports success',async()=>{
 let copied;const h=copyHarness(async value=>{copied=value;});const b=h.make('Synthetic-test-only');await b.onclick();
 assert.equal(copied,'Synthetic-test-only');assert.equal(b.textContent,'Kopieret ✓');assert.equal(b.disabled,false);
 assert.ok(h.messages.every(m=>!m.includes('Synthetic-test-only')));
});
test('clipboard denial reports failure without exposing the value',async()=>{
 const h=copyHarness(async()=>{throw new Error('Denied');});const b=h.make('Synthetic-test-only');await b.onclick();
 assert.equal(b.textContent,'Prøv igen');assert.equal(b.disabled,false);assert.ok(h.messages.every(m=>!m.includes('Synthetic-test-only')));
});
test('unavailable clipboard reports failure',async()=>{
 const h=copyHarness(undefined);const b=h.make('+45 00000000');await b.onclick();assert.equal(b.textContent,'Prøv igen');
});
test('search distinguishes PowerApps, PDFs, and other tools',()=>{
 const c=vm.createContext({});vm.runInContext(groupSource,c);
 assert.equal(c.searchToolGroup({url:'https://apps.powerapps.com/play/test'}),'Apps');
 assert.equal(c.searchToolGroup({url:'/OCCtools/documents/test.pdf',display:'pdf'}),'PDF-links');
 assert.equal(c.searchToolGroup({url:'https://example.com/tool'}),'Værktøjer og links');
});

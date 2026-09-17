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

const visibilitySource=app.slice(app.indexOf('function activeCategories('),app.indexOf('async function api('));
const docs=readFileSync(new URL('./dist/documents.js',import.meta.url),'utf8');
const documentVisibilitySource=docs.slice(docs.indexOf('function documentIsActive('),docs.indexOf('function documentMenuNames('));
test('inactive menus and links are hidden without modifying the stored content',()=>{
 const c=vm.createContext({});vm.runInContext(visibilitySource,c);
 const source={categories:[{id:'old',tools:[{id:'legacy'},{id:'hidden',active:false}]},{id:'off',active:false,tools:[{id:'child',active:true}]}]};
 const original=JSON.stringify(source),shown=c.activeCategories(source);
 assert.equal(shown.length,1);assert.equal(shown[0].tools.length,1);assert.equal(shown[0].tools[0].id,'legacy');assert.equal(JSON.stringify(source),original);
 source.categories[1].active=true;assert.equal(c.activeCategories(source).length,2);
});
test('checkbox defaults to active and changes only its target',()=>{
 const c=vm.createContext({el:()=>({append(...children){this.children=children;}}),document:{createTextNode:t=>t}});vm.runInContext(visibilitySource,c);
 const item={name:'Sample'},row=c.activeControl(item,'Aktiv');const input=row.children[0];assert.equal(input.checked,true);
 input.checked=false;input.onchange();assert.equal(item.active,false);input.checked=true;input.onchange();assert.equal(item.active,true);
});
test('PDFs follow link, menu and library visibility, including reactivation',()=>{
 const c=vm.createContext({});vm.runInContext(documentVisibilitySource,c);
 const d={id:'sample',category:'procedures'},link={url:'/OCCtools/documents/sample.pdf',active:false};
 const menu={id:'procedures',tools:[link]},source={categories:[menu]};
 assert.equal(c.documentIsActive(d,source),false);link.active=true;assert.equal(c.documentIsActive(d,source),true);
 menu.active=false;assert.equal(c.documentIsActive(d,source),false);
 menu.active=true;menu.tools=[{id:'library-procedures',active:false}];assert.equal(c.documentIsActive(d,source),false);
 menu.tools[0].active=true;assert.equal(c.documentIsActive(d,source),true);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {addSlotLinks} from './migrate-slot-links.mjs';
test('slot links merge without losing server-only edits and are idempotent',()=>{
 const data={revision:99,categories:[{id:'operations',name:'Custom Trafik',tools:[{id:'custom',url:'https://example.com',active:false}]},{id:'other',tools:[]}],projects:[{name:'Keep'}]};
 const result=addSlotLinks(data);assert.equal(data.categories[0].tools.length,1);assert.equal(result.content.categories[0].tools.length,3);assert.equal(result.content.revision,100);assert.deepEqual(result.content.projects,data.projects);assert.equal(result.content.categories[0].tools[0].active,false);assert.equal(addSlotLinks(result.content).changed,false);
});
test('existing relocated or inactive slot links are preserved',()=>{
 const data={categories:[{id:'operations',tools:[]},{id:'other',tools:[{id:'e-airport-slots',url:'custom',active:false},{id:'online-slot-coordination',url:'custom2'}]}]};
 assert.equal(addSlotLinks(data).changed,false);assert.throws(()=>addSlotLinks({categories:[]}));
});

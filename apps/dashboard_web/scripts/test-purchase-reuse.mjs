import assert from 'node:assert/strict';
import {purchaseDraft,filterPurchaseHistory,latestReceivedPurchase} from '../src/lib/purchaseReuse.ts';
const part={id:'p1',name:'Motor',category:'Motors',part_number:'M-1',supplier:'Supplier'};
const old={id:'a',part_id:'p1',item_name:'Motor',quantity:10,estimated_cost:500,supplier:'Shop',product_url:'https://example.com/motor',status:'received',created_at:'2026-08-01',reason:'Old justification',requested_by:'someone',payment_source:'personal'};
assert.deepEqual(purchaseDraft(old,part),{part_id:'p1',item_name:'Motor',quantity:'1',estimated_cost:'',supplier:'Shop',product_url:'https://example.com/motor',urgency:'normal',reason:''});
assert.equal(purchaseDraft(old).part_id,''); // Archived/unavailable inventory must not be silently linked.
assert.equal(purchaseDraft(old).item_name,'Motor');
assert.deepEqual(purchaseDraft(),{part_id:'',item_name:'',quantity:'1',estimated_cost:'',supplier:'',product_url:'',urgency:'normal',reason:''});
const newer={...old,id:'b',created_at:'2026-09-01'},pending={...old,id:'c',status:'requested',created_at:'2026-10-01'};
assert.equal(latestReceivedPurchase([old,pending,newer],'p1').id,'b');
assert.equal(latestReceivedPurchase([old],'different'),undefined);
assert.equal(filterPurchaseHistory([old],[part],'m-1','Motors').length,1);
assert.equal(filterPurchaseHistory([old],[part],' SHOP ','').length,1);
assert.equal(filterPurchaseHistory([old],[part],'','Electrical').length,0);
assert.equal(filterPurchaseHistory([{...old,part_id:null}],[],'','uncategorized').length,1);
assert.equal(filterPurchaseHistory([{...old,category:'Motors',part_number:'M-1'}],[],'M-1','Motors').length,1);
assert.equal(old.quantity,10);
console.log('PASS purchase reuse: clean draft, historical records preserved, received-only selection, search/category and unavailable inventory');

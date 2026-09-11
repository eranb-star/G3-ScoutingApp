import assert from 'node:assert/strict';
import {nextServiceDate,serviceIsDue,replenishmentQuantity} from '../src/lib/operationsPlanning.ts';
const base={status:'installed',service_interval_days:30,last_serviced_at:null,first_service_due:'2026-11-02'};
assert.equal(serviceIsDue(base,Date.parse('2026-11-01T21:59:00Z')),false);
assert.equal(serviceIsDue(base,Date.parse('2026-11-01T22:00:00Z')),true); // Jerusalem winter midnight.
assert.equal(serviceIsDue({...base,status:'spare'},Date.parse('2026-11-03')),false);
assert.equal(serviceIsDue({...base,first_service_due:null},Date.parse('2026-11-03')),false);
assert.equal(serviceIsDue({...base,status:'service_due',first_service_due:null}),true);
const serviced={...base,last_serviced_at:'2026-11-03T10:00:00Z'};
assert.equal(nextServiceDate(serviced),Date.parse('2026-12-03T10:00:00Z'));
assert.equal(serviceIsDue(serviced,Date.parse('2026-11-04')),false);
assert.equal(nextServiceDate({...serviced,service_interval_days:null}),null);
assert.equal(replenishmentQuantity(2,12,3,4),3);
assert.equal(replenishmentQuantity(2,6,0,8),0);
assert.equal(replenishmentQuantity(1.5,5,1,0.5),2);
console.log('PASS service baseline, repeat interval, winter timezone boundary, spare exclusion and replenishment quantities');

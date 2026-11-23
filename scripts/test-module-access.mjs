import assert from 'node:assert/strict';
import {harness} from './test-startup-loading.mjs';
const dataUnavailable=await harness(['data']);await dataUnavailable.flush();
assert.equal(dataUnavailable.state().access.management,true);assert.equal(dataUnavailable.state().access.achievement,true);assert.equal(dataUnavailable.state().access.standard4,false);assert.equal(dataUnavailable.state().access.year,2026);
dataUnavailable.emit('online');await dataUnavailable.flush();assert.equal(dataUnavailable.state().access.management,true);dataUnavailable.stop();
const achievementUnavailable=await harness(['achievement'],2027);await achievementUnavailable.flush();assert.equal(achievementUnavailable.state().access.management,true);assert.equal(achievementUnavailable.state().access.achievement,false);assert.equal(achievementUnavailable.state().access.standard4,true);assert.equal(achievementUnavailable.state().access.year,2027);achievementUnavailable.stop();
console.log('PASS: unrelated module failure preserves assigned access, reconnect refresh and year scoping.');

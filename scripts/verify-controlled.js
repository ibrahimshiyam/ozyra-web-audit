import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {verifyBundle} from '../src/storage.js';
const bundle=process.argv[2];
if(!bundle)throw new Error('Pass a controlled bundle directory');
const manifest=JSON.parse(await readFile(join(bundle,'manifest.json'),'utf8'));
await verifyBundle(bundle,manifest.key);
const r=JSON.parse(await readFile(join(bundle,'capture.json'),'utf8'));
assert.equal(r.kind,'controlled-browser-measurement');assert.equal(r.costs.modelCalls,0);
assert.ok(r.pages.every(p=>p.status==='complete'));
assert.ok(r.pages[0].views.some(v=>v.scrollWidth>v.width));
assert.ok(r.pages[0].views[0].axe.violations.some(a=>a.id==='image-alt'));
assert.ok(r.pages[0].views[0].axe.violations.some(a=>a.id==='label'));
assert.equal(r.pages[1].views[0].axe.violations.length,0);
assert.equal(r.lighthouse.snapshot.status,'measured');assert.equal(r.lighthouse.performance.status,'measured');
assert.ok(Number.isFinite(r.lighthouse.performance.metrics['largest-contentful-paint'].value));
for(const p of r.pages)for(const v of p.views){const png=await readFile(join(bundle,v.screenshot));assert.equal(png.subarray(1,4).toString(),'PNG');}
console.log('Verified actual browser/axe/Lighthouse evidence, screenshots and checksums; no model calls.');

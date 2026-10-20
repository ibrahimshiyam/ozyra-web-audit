// One explicitly dispatched bounded read-only smoke; never a scheduled prospect crawl.
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {auditIsolated} from './audit-isolated.js';
const root=await mkdtemp(join(tmpdir(),'ozyra-public-smoke-'));
try{
 const manifestPath=join(root,'manifest.json'),out=join(root,'private');
 await writeFile(manifestPath,JSON.stringify({version:1,pages:['https://example.com/']}),{mode:0o600});
 const result=await auditIsolated({manifestPath,out});
 const report=JSON.parse(await readFile(join(result.bundle,'capture.json'),'utf8'));
 assert.equal(report.kind,'public-browser-measurement');assert.equal(report.pages.length,1);assert.equal(report.pages[0].httpStatus,200);
 assert.ok(['complete','partial'].includes(report.pages[0].status));assert.equal(report.costs.modelCalls,0);
 const views=report.pages[0].views.filter(v=>v.screenshot);assert.equal(views.length,3);
 for(const view of views){const png=await readFile(join(result.bundle,view.screenshot));assert.equal(png.subarray(1,4).toString(),'PNG');}
 const replay=await promisify(execFile)(process.execPath,['src/cli.js','audit','--manifest',manifestPath,'--out',out]);assert.equal(JSON.parse(replay.stdout).cached,true);
 const manifest=JSON.parse(await readFile(join(result.bundle,'manifest.json'),'utf8'));
 console.log(JSON.stringify({smoke:'passed',demonstrationDomain:'example.com',pageCount:1,viewports:views.map(v=>v.width),status:report.pages[0].status,axeViolationRules:views.map(v=>v.axe.violations.length),lighthouse:report.lighthouse.status,networkRequests:report.network.requests,bytes:report.network.bytes,brokerEventReasons:report.network.events.map(e=>e.reason),isolation:report.config.isolation,cacheReplay:true,modelCalls:0,evidenceManifestKey:manifest.key,artifactsUploaded:false,formsSubmitted:false}));
}finally{await rm(root,{recursive:true,force:true});}

import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {startFixture} from './controlled-fixture.js';
import {captureFixture,tools} from './capture.js';
import {renderCaptured} from './captured-report.js';
import {outsideRepository,verifyBundle} from './storage.js';
import {hash} from './engine.js';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
export async function controlled(out,{fresh=false}={}) {
 const output=await outsideRepository(out);
 const chrome=process.env.OZYRA_CHROME ?? (process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':null);
 const browserVersion=chrome?(await promisify(execFile)(chrome,['--version'])).stdout.trim():'playwright-managed';
 const sources=await Promise.all(['capture.js','network.js','controlled-fixture.js','captured-report.js','storage.js','engine.js'].map(n=>readFile(new URL(n,import.meta.url))));
 const key=hash([tools,browserVersion,hash(await readFile(new URL('../package-lock.json',import.meta.url))),...sources.map(hash),fresh?Date.now():'cached']);
 await mkdir(output,{recursive:true,mode:0o700});
 const bundle=join(output,key);
 try {await verifyBundle(bundle,key);return {bundle,cached:true,modelCalls:0};}
 catch(e){if(e.code!=='ENOENT')throw e;}
 const fixture=await startFixture();
 try {
   const {report,artifacts}=await captureFixture(fixture,bundle);
   const html=renderCaptured(report);
   await writeFile(join(bundle,'report.html'),html,{mode:0o600});
   artifacts['report.html']=hash(html);
   await writeFile(join(bundle,'manifest.json'),JSON.stringify({key,kind:'owned-controlled-fixture',artifacts},null,2),{mode:0o600});
   return {bundle,cached:false,modelCalls:0,status:report.pages.map(p=>p.status),lighthouse:report.lighthouse.status};
 }finally {await fixture.close();}
}

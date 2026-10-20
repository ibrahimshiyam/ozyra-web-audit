import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startFixture} from '../src/controlled-fixture.js';
import {captureFixture} from '../src/capture.js';
const enabled=process.env.OZYRA_BROWSER_TESTS==='1';
async function run(options,check){const fixture=await startFixture();const dir=await mkdtemp(join(tmpdir(),'ozyra-browser-test-'));try{const result=await captureFixture(fixture,dir,{lighthouse:false,viewports:[{width:390,height:844}],navigationDelayMs:0,...options});await check(result,fixture,dir);}finally{await fixture.close();await rm(dir,{recursive:true,force:true});}}
test('real browser captures PNG and actual axe findings; clean fixture avoids alt/label failures',{skip:!enabled},async()=>run({paths:['/','/clean']},async({report,artifacts},fixture,dir)=>{
 assert.equal(report.pages[0].status,'complete');
 const view=report.pages[0].views[0];assert.ok(view.scrollWidth>view.width);
 assert.ok(view.axe.violations.some(v=>v.id==='image-alt'));assert.ok(view.axe.violations.some(v=>v.id==='label'));
 assert.ok(!report.pages[1].views[0].axe.violations.some(v=>['image-alt','label'].includes(v.id)));
 const png=await readFile(join(dir,view.screenshot));assert.equal(png.subarray(1,4).toString(),'PNG');assert.ok(artifacts[view.screenshot]);
 assert.ok(fixture.requests.some(r=>r.path==='/robots.txt'));
}));
test('browser redirects to metadata/private origins and robots disallow stop',{skip:!enabled},async()=>run({paths:['/redirect','/redirect-private','/disallowed']},({report},fixture)=>{
 assert.ok(report.pages.every(p=>p.status==='blocked'));
 assert.ok(report.blocked.some(b=>b.reason==='OUT_OF_SCOPE'));
 assert.ok(report.blocked.some(b=>b.reason==='ROBOTS_DISALLOW'));
 assert.ok(!fixture.requests.some(r=>r.path==='/disallowed'));
}));
test('browser mutation, private subresource and websocket never reach destination',{skip:!enabled},async()=>run({paths:['/adversarial'],budget:{requestMs:700}},({report},fixture)=>{
 assert.ok(report.blocked.some(b=>b.reason==='MUTATION_BLOCKED'));
 assert.ok(report.blocked.some(b=>b.reason==='OUT_OF_SCOPE'));
 assert.ok(report.blocked.some(b=>b.reason==='WEBSOCKET_BLOCKED'));
 assert.ok(!fixture.requests.some(r=>r.method==='POST'||r.path==='/mutation'));
 assert.notEqual(report.pages[0].status,'complete');
}));
for(const [path,expected]of [['/denied','ACCESS_STOP_403'],['/rate-limit','ACCESS_STOP_429'],['/challenge','CHALLENGE_OR_LOGIN_STOP']])test(`browser ${expected} stops site`,{skip:!enabled},async()=>run({paths:[path,'/clean']},({report},fixture)=>{
 assert.ok(report.blocked.some(b=>b.reason===expected));assert.equal(report.pages[1].status,'blocked');assert.ok(!fixture.requests.some(r=>r.path==='/clean'));
}));
for(const [name,paths,budget]of [['request',['/'],{requests:1}],['bytes',['/big'],{responseBytes:5000}],['time',['/slow'],{requestMs:200}]])test(`browser ${name} cap returns blocked coverage`,{skip:!enabled},async()=>run({paths,budget},({report})=>{assert.equal(report.pages[0].status,'blocked');assert.ok(report.blocked.some(b=>/BUDGET/.test(b.reason)));}));
test('browser unhandled loopback navigation is denied by fallback proxy',{skip:!enabled},async()=>{
 const {denyProxy}=await import('../src/network.js');const {chromium}=await import('playwright-core');
 const fixture=await startFixture(),proxy=await denyProxy();let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.OZYRA_CHROME??(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined),chromiumSandbox:true,proxy:{server:proxy.url},args:['--proxy-bypass-list=<-loopback>','--disable-quic','--host-resolver-rules=MAP * ~NOTFOUND']});
  const {get}=await import('node:http');
  const status=await new Promise((resolve,reject)=>{get(proxy.url+'/',res=>{res.resume();resolve(res.statusCode);}).on('error',reject);});assert.equal(status,403);
  const page=await browser.newPage();
  try{const response=await page.goto(fixture.origin,{timeout:5000});assert.equal(response.status(),403);}
  catch(e){assert.match(e.message,/ERR_PROXY_CONNECTION_FAILED|ERR_BLOCKED_BY_CLIENT/);}
  assert.equal(fixture.requests.length,0);
 }finally{await browser?.close();await proxy.close();await fixture.close();}
});

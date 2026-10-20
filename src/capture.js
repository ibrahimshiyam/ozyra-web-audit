import { chromium } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';
import puppeteer from 'puppeteer-core';
import robotsParser from 'robots-parser';
import { navigation, snapshot } from 'lighthouse';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { brokerFetch, Budget, checkedURL, denyProxy } from './network.js';
import { hash } from './engine.js';
import {isOwnedFixture} from './controlled-fixture.js';
import {brokerRPC,remoteFetch} from './socket-broker.js';
import {assertIsolation} from '../scripts/isolation-proof.js';
const lock = JSON.parse(readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
export const viewports = [{width:390,height:844},{width:320,height:800},{width:1440,height:900}];
export const tools = Object.fromEntries(['playwright-core','@axe-core/playwright','lighthouse','puppeteer-core'].map(p=>[p,lock.packages[`node_modules/${p}`].version]));
const delay = ms => new Promise(resolve=>setTimeout(resolve,ms));

/** Controlled fixtures only. No externally supplied target or private-network exception CLI. */
export async function captureFixture(fixture, directory, options = {}) {
  if(!isOwnedFixture(fixture))throw new Error('OWNED_FIXTURE_REQUIRED');
  return captureCore(fixture,directory,options);
}
export async function captureBroker(socketPath,directory,options={}){
  const isolation=await assertIsolation();
  const scope=await brokerRPC(socketPath,'/manifest');
  return captureCore({origin:scope.origin},directory,{...options,paths:scope.pages.map(u=>new URL(u).pathname),navigationDelayMs:scope.navigationDelayMs,budget:scope.limits,remote:{scope,socketPath,isolation,fetch:remoteFetch(socketPath)}});
}
async function captureCore(fixture,directory,options){
  const remote=options.remote;
  const paths = options.paths ?? ['/','/clean'];
  if (!paths.length || paths.length > 3 || paths.some(p=>!p.startsWith('/') || p.startsWith('//'))) throw new Error('PAGE_SCOPE');
  const approved = new Set(paths.map(p=>new URL(p,fixture.origin).href));
  const budget = new Budget(options.budget);
  const fetch=remote?.fetch ?? ((url,method='GET')=>brokerFetch(url,{origin:fixture.origin,method,budget,fixture}));
  const proxy = await denyProxy();
  const profile = await mkdtemp(join(tmpdir(),'ozyra-browser-'));
  const blocked = [], pages = [], artifacts = {};
  let context, watchdog, ppBrowser, siteStop;
  const save = async (name,data) => { await writeFile(join(directory,name),data,{mode:0o600}); artifacts[name]=hash(data); };
  await mkdir(directory,{recursive:true,mode:0o700});
  try {
    const robotsURL=new URL('/robots.txt',fixture.origin).href;
    const robotsResponse=remote?{status:200,body:Buffer.from('')}:await fetch(robotsURL);
    if(robotsResponse.status!==200)throw new Error('ROBOTS_UNAVAILABLE');
    const robots=robotsParser(robotsURL,robotsResponse.body.toString());
    context = await chromium.launchPersistentContext(profile, {
      executablePath: process.env.OZYRA_CHROME ?? (process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined),
      headless:true, chromiumSandbox:true, serviceWorkers:'block', acceptDownloads:false,
      locale:'en-US', timezoneId:'UTC', viewport:viewports[0], proxy:{server:proxy.url},
      env:{PATH:process.env.PATH, HOME:profile, TMPDIR:tmpdir(), LANG:'en_US.UTF-8'},
      args:['--remote-debugging-port=0','--disable-quic','--proxy-bypass-list=<-loopback>', '--host-resolver-rules=MAP * ~NOTFOUND', '--force-webrtc-ip-handling-policy=disable_non_proxied_udp'],
    });
    watchdog=setTimeout(()=>context.close().catch(()=>{}),budget.limits.deadlineMs);
    await context.routeWebSocket('**/*',socket=>{blocked.push({reason:'WEBSOCKET_BLOCKED'});socket.close();});
    await context.route('**/*',async route=> {
      const request=route.request();
      try {
        if(siteStop)throw new Error(siteStop);
        checkedURL(request.url(),fixture.origin);
        if(robots.isAllowed(request.url(),'OzyraWebAudit')===false)throw new Error('ROBOTS_DISALLOW');
        if(request.isNavigationRequest() && request.frame()===request.frame().page().mainFrame() && !approved.has(request.url())) throw new Error('NAVIGATION_SCOPE');
        const response=await fetch(request.url(),request.method(),request.isNavigationRequest()&&request.frame()===request.frame().page().mainFrame());
        await route.fulfill(response);
      } catch(e) {
        if(/ACCESS_STOP|CHALLENGE|BUDGET/.test(e.message))siteStop=e.message;
        blocked.push({url:(()=>{try{const u=new URL(request.url());return u.origin+u.pathname;}catch{return '[invalid URL]';}})(),method:request.method(),reason:e.message});
        await route.abort('blockedbyclient').catch(()=>{});
      }
    });
    const browserVersion=context.browser().version();
    const [page]=context.pages();
    page.on('dialog',dialog=>dialog.dismiss().catch(()=>{}));
    page.on('download',download=>download.cancel().catch(()=>{}));
    for(const path of paths) {
      const url=new URL(path,fixture.origin).href;
      const result={url,status:'complete',views:[],headers:{},manualReview:'not_tested',fieldPerformance:'unknown'};
      for(const viewport of (options.viewports ?? viewports)) {
        const start=blocked.length;
        try {
          if(siteStop)throw new Error(siteStop);
          budget.check();
          await page.setViewportSize(viewport);
          await delay(options.navigationDelayMs ?? 5000);
          const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:budget.limits.requestMs});
          result.httpStatus=response?.status()??null;
          if(result.httpStatus>=400)result.status='partial';
          await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1000))]));
          await page.waitForTimeout(150);
          const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
          const measurements=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,width:innerWidth,title:document.title,contactLinks:[...document.querySelectorAll('a[href]')].filter(a=>/^(tel:|mailto:)/i.test(a.getAttribute('href'))).map(a=>({text:a.textContent.trim(),kind:a.getAttribute('href').split(':')[0]}))}));
          const prefix=`page-${pages.length}-${viewport.width}`;
          const screenshot=`${prefix}.png`,fullPage=`${prefix}-full.png`,axeFile=`${prefix}-axe.json`;
          await save(screenshot,await page.screenshot({animations:'disabled'}));
          await save(fullPage,await page.screenshot({fullPage:true,animations:'disabled'}));
          await save(axeFile,JSON.stringify(axe,null,2));
          const headers=await response.allHeaders();
          for(const name of ['content-security-policy','x-frame-options','strict-transport-security'])if(headers[name])result.headers[name]=headers[name];
          result.views.push({...viewport,...measurements,axe:{violations:axe.violations.map(v=>({id:v.id,impact:v.impact,count:v.nodes.length,targets:v.nodes.map(n=>n.target)})),incomplete:axe.incomplete.length,passes:axe.passes.length,inapplicable:axe.inapplicable.length,artifact:axeFile},screenshot,fullPage,httpStatus:result.httpStatus,status:blocked.length>start||result.httpStatus>=400?'partial':'complete',blocked:blocked.slice(start)});
          if(blocked.length>start)result.status='partial';
        }catch(e){result.status='blocked';result.views.push({...viewport,status:'blocked',reason:e.message});break;}
      }
      pages.push(result);
    }
    let lighthouse={status:'not_tested'};
    if(options.lighthouse!==false && pages[0]?.status==='complete') {
      try {
        const [port,wsPath]=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n');
        ppBrowser=await puppeteer.connect({browserWSEndpoint:`ws://127.0.0.1:${port}${wsPath}`});
        const pp=(await ppBrowser.pages()).find(p=>p.url()===page.url());
        await page.setViewportSize(viewports[0]);
        const snapshotURL=pp.url();
        const snap=await snapshot(pp,{config:{extends:'lighthouse:default',settings:{onlyCategories:['accessibility']}}});
        await save('lighthouse-snapshot.json',JSON.stringify(snap.lhr,null,2));
        lighthouse={status:'partial',snapshot:{status:'measured',url:snapshotURL,viewport:viewports[0],artifact:'lighthouse-snapshot.json',accessibilityScore:snap.lhr.categories.accessibility?.score},performance:{status:'unknown'}};
        try {
          await delay(options.navigationDelayMs ?? 5000);
          const nav=await navigation(pp,pages[0].url,{config:{extends:'lighthouse:default',settings:{onlyCategories:['performance'],maxWaitForLoad:10000,maxWaitForFcp:10000,throttlingMethod:'provided',disableStorageReset:true,screenEmulation:{disabled:true}}},flags:{logLevel:'error'}});
          await save('lighthouse-navigation.json',JSON.stringify(nav.lhr,null,2));
          const metrics=Object.fromEntries(['largest-contentful-paint','cumulative-layout-shift','total-blocking-time','first-contentful-paint','total-byte-weight'].map(id=>[id,{value:nav.lhr.audits[id]?.numericValue??null,unit:nav.lhr.audits[id]?.numericUnit??null}]));
          lighthouse.performance={url:pages[0].url,viewport:viewports[0],status:nav.lhr.runtimeError?'unavailable':'measured',metrics,artifact:'lighthouse-navigation.json',limitations:'Single brokered diagnostic run with provided throttling; transport changes timing. Not canonical visitor performance or field data; TBT is not INP.'};
          lighthouse.status=nav.lhr.runtimeError?'partial':'complete';
        }catch(e){lighthouse.performance={status:'unavailable',reason:e.message};}
      }catch(e){lighthouse={status:'unavailable',reason:e.message};}
    }
    const network=remote?await brokerRPC(remote.socketPath,'/stats'):{requests:budget.requests,bytes:budget.bytes,limits:budget.limits};
    const report={schemaVersion:2,kind:remote?(remote.scope.kind==='public-passive'?'public-browser-measurement':'controlled-external-browser-measurement'):'controlled-browser-measurement',capturedAt:new Date().toISOString(),tools:{...tools,chrome:browserVersion},config:{viewports:options.viewports??viewports,locale:'en-US',timezone:'UTC',region:'local runner; not Maldives field data',brokered:true,browserSandbox:true,isolation:remote?.isolation??'application-guards-only'},pages,lighthouse,blocked,network,costs:{modelCalls:0,inputTokens:0,outputTokens:0},limitations:[remote?.scope.kind==='public-passive'?'Read-only public-page capture; no authentication, form submission or outreach.':'Owned controlled fixtures only; no prospect assessed.','Accessibility requires manual review; no conformance or security grade.','Blocked resources can affect rendering; inspect coverage before making claims.']};
    await save('capture.json',JSON.stringify(report,null,2));
    return {report,artifacts};
  }finally{
    clearTimeout(watchdog);
    await ppBrowser?.disconnect().catch(()=>{});
    await context?.close().catch(()=>{});
    await proxy.close();
    await rm(profile,{recursive:true,force:true});
  }
}

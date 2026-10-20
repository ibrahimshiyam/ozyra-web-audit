import http from 'node:http';
import {chmod,unlink} from 'node:fs/promises';
import robotsParser from 'robots-parser';
import {brokerFetch,Budget,checkedURL,isPublicAddress} from './network.js';
import {isOwnedFixture} from './controlled-fixture.js';
import {referencedResources} from './resources.js';
export const USER_AGENT='OzyraWebAudit/0.3 (+https://github.com/ibrahimshiyam/ozyra-web-audit)';
export function validateManifest(input,{fixture}={}) {
 if(!input||input.version!==1||!Array.isArray(input.pages)||!input.pages.length||input.pages.length>3)throw new Error('MANIFEST_INVALID');
 if(Object.keys(input).some(k=>!['version','pages'].includes(k)))throw new Error('MANIFEST_FIELDS');
 const urls=input.pages.map(raw=>{const u=new URL(raw);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.hash||u.search)throw new Error('MANIFEST_URL');return u.href;});
 const origin=new URL(urls[0]).origin;
 if(urls.some(u=>new URL(u).origin!==origin)||new Set(urls).size!==urls.length)throw new Error('MANIFEST_SCOPE');
 const u=new URL(urls[0]);if(!isOwnedFixture(fixture)&&u.port)throw new Error('NONSTANDARD_PORT');
 const host=u.hostname.replace(/^\[|\]$/g,'');
 if(!(isOwnedFixture(fixture)&&fixture.origin===origin) && ((/^[\d.]+$/.test(host)||host.includes(':'))&&!isPublicAddress(host)||host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')))throw new Error('PRIVATE_ADDRESS');
 return {version:1,pages:urls,origin};
}
export async function startBroker({socketPath,manifest,fixture,limits={},navigationDelayMs=5000}) {
 const scope=validateManifest(manifest,{fixture});
 // No caller-controlled production budget increase or fast-rate bypass.
 if(!isOwnedFixture(fixture)&&(Object.keys(limits).length||navigationDelayMs<5000))throw new Error('PRODUCTION_LIMIT_OVERRIDE');
 const budget=new Budget(limits),allowed=new Set(scope.pages),pageSet=new Set(scope.pages);
 const events=[];let rpcCount=0;let stopped=null,lastNavigation=0,queue=Promise.resolve(),robots;
 let mode=isOwnedFixture(fixture)?'controlled-external-fixture':'public-passive';
 const fetch=async(url,method='GET')=>brokerFetch(url,{origin:scope.origin,method,budget,fixture,userAgent:USER_AGENT});
 let robotsURL=new URL('/robots.txt',scope.origin).href;
 for(let hops=0;hops<4;hops++) {
  const result=await fetch(robotsURL);
  if(result.status>=300&&result.status<400&&result.headers.location){robotsURL=new URL(result.headers.location,robotsURL).href;if(hops===3)throw new Error('ROBOTS_REDIRECT_LIMIT');continue;}
  if(result.status===404||result.status===410)robots=robotsParser(robotsURL,'');
  else if(result.status>=200&&result.status<300)robots=robotsParser(robotsURL,result.body.toString());
  else throw new Error('ROBOTS_UNAVAILABLE');
  break;
 }
 const handleFetch=async message=>{
  if(stopped)throw new Error(stopped);
  if(Object.keys(message).some(k=>!['url','method','navigation'].includes(k))||typeof message.url!=='string'||message.url.length>4096||typeof message.method!=='string'||typeof message.navigation!=='boolean')throw new Error('PROTOCOL_FIELDS');
  if(!['GET','HEAD'].includes(message.method))throw new Error('MUTATION_BLOCKED');
  const url=checkedURL(message.url,scope.origin);url.hash='';
  if(!allowed.has(url.href)||(message.navigation&&!pageSet.has(url.href)))throw new Error('RESOURCE_SCOPE');
  if(robots.isAllowed(url.href,'OzyraWebAudit')===false)throw new Error('ROBOTS_DISALLOW');
  if(pageSet.has(url.href)){const wait=Math.max(0,lastNavigation+navigationDelayMs-Date.now());if(wait)await new Promise(r=>setTimeout(r,wait));lastNavigation=Date.now();}
  budget.check();
  const result=await fetch(url.href,message.method);
  if(result.headers.location&&result.status>=300&&result.status<400){
   const target=checkedURL(new URL(result.headers.location,url).href,scope.origin).href;
   if(message.navigation&&!pageSet.has(target))throw new Error('REDIRECT_SCOPE');
   allowed.add(target);
  }
  for(const resource of referencedResources(result.body,result.headers['content-type'],url.href)){if(allowed.size>=500)throw new Error('RESOURCE_BUDGET');allowed.add(resource);}
  return {status:result.status,headers:result.headers,body:result.body.toString('base64')};
 };
 const server=http.createServer(async(req,res)=>{
  const reply=(status,data)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));};
  if(++rpcCount>500){stopped='RPC_BUDGET';reply(403,{error:stopped});return;}
  if(req.method==='GET'&&req.url==='/manifest'){reply(200,{...scope,kind:mode,limits:budget.limits,navigationDelayMs});return;}
  if(req.method==='GET'&&req.url==='/stats'){reply(200,{requests:budget.requests,bytes:budget.bytes,limits:budget.limits,events,stopped});return;}
  if(req.method!=='POST'||req.url!=='/fetch'){reply(403,{error:'PROTOCOL_ROUTE'});return;}
  let bytes=0;const chunks=[];
  try{
   for await(const chunk of req){bytes+=chunk.length;if(bytes>16384)throw new Error('PROTOCOL_SIZE');chunks.push(chunk);}
   const message=JSON.parse(Buffer.concat(chunks).toString());
   const job=queue.then(()=>handleFetch(message));queue=job.catch(()=>{});
   reply(200,await job);
  }catch(e){const reason=/^[A-Z0-9_]+$/.test(e.message)?e.message:'REQUEST_FAILED';if(/ACCESS_STOP|CHALLENGE|BUDGET/.test(reason))stopped=reason;if(events.length<128)events.push({reason});reply(403,{error:reason});}
 });
 server.requestTimeout=50000;server.headersTimeout=5000;
 server.on('connect',(req,socket)=>socket.destroy());server.on('upgrade',(req,socket)=>socket.destroy());
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(socketPath,resolve);});
 await chmod(socketPath,0o600);
 return {scope,budget,events,close:async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await unlink(socketPath).catch(()=>{});}};
}
export async function brokerRPC(socketPath,path,message) {
 return new Promise((resolve,reject)=>{
  const body=message?Buffer.from(JSON.stringify(message)):null;
  const req=http.request({socketPath,path,method:body?'POST':'GET',headers:body?{'content-type':'application/json','content-length':body.length}:{}},res=>{
   const chunks=[];let bytes=0;res.on('data',chunk=>{bytes+=chunk.length;if(bytes>12*1024*1024)req.destroy(new Error('PROTOCOL_RESPONSE_SIZE'));else chunks.push(chunk);});
   res.on('error',reject);res.on('end',()=>{try{const result=JSON.parse(Buffer.concat(chunks));if(res.statusCode!==200)throw new Error(result.error??'BROKER_DENIED');resolve(result);}catch(e){reject(e);}});
  });
  const timer=setTimeout(()=>req.destroy(new Error('BROKER_TIMEOUT')),55000);req.on('close',()=>clearTimeout(timer));req.on('error',reject);req.end(body);
 });
}
export function remoteFetch(socketPath){return async(url,method='GET',navigation=false)=>{const r=await brokerRPC(socketPath,'/fetch',{url,method,navigation});return {...r,body:Buffer.from(r.body,'base64')};};}

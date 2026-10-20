import assert from 'node:assert/strict';
import {mkdtemp,readFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {Resolver} from 'node:dns/promises';
import dgram from 'node:dgram';
import packet from 'dns-packet';
import {startFixture} from '../src/controlled-fixture.js';
import {startBroker,brokerRPC} from '../src/socket-broker.js';
import {runIsolated} from '../src/isolated-runner.js';
import {verifyBundle} from '../src/storage.js';
const exec=promisify(execFile),root=await mkdtemp(join(tmpdir(),'ozyra-bridge-'));
let checks=0;
async function withBroker(fixture,paths,fn,limits={}){
 const directory=await mkdtemp(join(root,'run-')),socketPath=join(directory,'requests.sock');
 const broker=await startBroker({socketPath,manifest:{version:1,pages:paths.map(p=>fixture.origin+p)},fixture,limits,navigationDelayMs:0});
 try{await fn({broker,directory,socketPath,fetch:(path,method='GET',navigation=true)=>brokerRPC(socketPath,'/fetch',{url:path.startsWith('http')?path:fixture.origin+path,method,navigation})});}finally{await broker.close();}
}
async function rejected(f,pattern){await assert.rejects(f,pattern);checks++;}
async function browser(fixture,short){
 await withBroker(fixture,['/','/clean'],async({directory})=>{
  const output=await mkdtemp(join(root,'out-'));const result=await runIsolated({socketDirectory:directory,output,short});
  const report=JSON.parse(await readFile(join(output,'bundle/capture.json'),'utf8'));
  assert.equal(report.kind,'controlled-external-browser-measurement');assert.ok(report.pages.every(p=>p.status==='complete'));
  assert.ok(report.pages[0].views[0].axe.violations.some(v=>v.id==='image-alt'));assert.ok(report.pages[0].views[0].axe.violations.some(v=>v.id==='label'));
  assert.equal(report.pages[1].views[0].axe.violations.length,0);assert.equal(report.config.isolation.capabilities,'none');
  if(!short)assert.equal(report.lighthouse.performance.status,'measured');
  const manifest=JSON.parse(await readFile(join(output,'bundle/manifest.json'),'utf8'));await verifyBundle(join(output,'bundle'),manifest.key);
  checks++;console.log(JSON.stringify({case:fixture.origin.startsWith('https:')?'owned HTTPS capture':'owned HTTP capture',result:JSON.parse(result.stdout)}));
 });
}
try{
 const http=await startFixture();
 try{
  await withBroker(http,['/','/disallowed'],async({fetch})=>{
   await fetch('/');const before=http.requests.length;
   await rejected(()=>fetch('/','POST'),/MUTATION_BLOCKED/);
   await rejected(()=>fetch('http://169.254.169.254/'),/OUT_OF_SCOPE/);
   await rejected(()=>fetch('/hidden'),/RESOURCE_SCOPE/);
   await rejected(()=>fetch('/disallowed'),/ROBOTS_DISALLOW/);
   assert.equal(http.requests.length,before);
  });
  await withBroker(http,['/redirect'],async({fetch})=>rejected(()=>fetch('/redirect'),/OUT_OF_SCOPE/));
  await withBroker(http,['/'],async({fetch})=>rejected(()=>fetch('/'),/REQUEST_BUDGET/),{requests:1});
  await withBroker(http,['/big'],async({fetch})=>rejected(()=>fetch('/big'),/BYTE_BUDGET/),{responseBytes:1024});
  await withBroker(http,['/slow'],async({fetch})=>rejected(()=>fetch('/slow'),/TIME_BUDGET/),{requestMs:100});
  await browser(http,true);
  await withBroker(http,['/adversarial'],async({directory})=>{
   const output=await mkdtemp(join(root,'adversarial-'));await runIsolated({socketDirectory:directory,output,short:true});
   const r=JSON.parse(await readFile(join(output,'bundle/capture.json'),'utf8'));
   assert.notEqual(r.pages[0].status,'complete');assert.ok(r.blocked.some(b=>b.reason==='OUT_OF_SCOPE'));assert.ok(r.blocked.some(b=>b.reason==='MUTATION_BLOCKED'));assert.ok(!http.requests.some(r=>r.method==='POST'||r.path==='/mutation'));checks++;
  });
 }finally{await http.close();}
 const cert=join(root,'cert.pem'),key=join(root,'key.pem');
 await exec('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=fixture.test','-addext','subjectAltName=IP:127.0.0.1,DNS:fixture.test']);
 const tls={key:await readFile(key),cert:await readFile(cert)};
 const https=await startFixture({tls});try{await browser(https,false);}finally{await https.close();}
 let address='127.0.0.1';const dns=dgram.createSocket('udp4');
 dns.on('message',(data,peer)=>{const q=packet.decode(data);dns.send(packet.encode({type:'response',id:q.id,flags:packet.AUTHORITATIVE_ANSWER,questions:q.questions,answers:q.questions.map(q=>({name:q.name,type:'A',class:'IN',ttl:0,data:address}))}),peer.port,peer.address);});
 await new Promise(r=>dns.bind(0,'127.0.0.1',r));const resolver=new Resolver();resolver.setServers([`127.0.0.1:${dns.address().port}`]);
 const rebinding=await startFixture({hostname:'fixture.test',resolver:async hostname=>(await resolver.resolve4(hostname)).map(address=>({address,family:4}))});
 try{await withBroker(rebinding,['/'],async({fetch})=>{await fetch('/');const before=rebinding.requests.length;address='169.254.169.254';await rejected(()=>fetch('/pixel.svg','GET',false),/PRIVATE_ADDRESS/);assert.equal(rebinding.requests.length,before);});}finally{await rebinding.close();dns.close();}
 await exec('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=wrong.invalid','-addext','subjectAltName=DNS:wrong.invalid']);
 const mismatch=await startFixture({tls:{key:await readFile(key),cert:await readFile(cert)}});
 try{await rejected(()=>startBroker({socketPath:join(root,'bad-tls.sock'),manifest:{version:1,pages:[mismatch.origin+'/']},fixture:mismatch}),/certificate|Hostname|IP|altname/i);assert.equal(mismatch.requests.length,0);}finally{await mismatch.close();}
 console.log(JSON.stringify({integration:'passed',checks,externalHTTP:true,externalHTTPS:true,DNSRebinding:'blocked',TLSHostnameMismatch:'blocked',mutations:'blocked',privateResources:'blocked',publicTargetsAccessed:false}));
}finally{await rm(root,{recursive:true,force:true});}

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {referencedResources} from '../src/resources.js';
import {startBroker,brokerRPC,validateManifest} from '../src/socket-broker.js';
import {startFixture} from '../src/controlled-fixture.js';
test('resource discovery accepts delivered static sources, not anchors/forms/off-origin URLs',()=>{
 const urls=referencedResources(Buffer.from('<script src="/a.js"></script><img src="/x.png"><a href="/hidden">x</a><form action="/submit"></form><img src="http://169.254.169.254/x"><style>a{background:url(/bg.png)}</style>'),'text/html','https://example.com/');
 assert.deepEqual([...urls].sort(),['https://example.com/a.js','https://example.com/bg.png','https://example.com/x.png']);
});
test('manifest rejects private IPs, credentials, queries and mixed origins',()=>{
 for(const url of ['http://127.0.0.1/','http://[::1]/','http://2130706433/','http://localhost/','https://u:p@example.com/','https://example.com/?token=x'])assert.throws(()=>validateManifest({version:1,pages:[url]}));
 assert.throws(()=>validateManifest({version:1,pages:['https://example.com/','https://other.com/']}));
});
test('real Unix broker authorizes resources on server and cannot accept budget overrides',async()=>{
 const root=await mkdtemp(join(tmpdir(),'ozyra-socket-test-')),fixture=await startFixture();let broker;
 try{
  const socketPath=join(root,'requests.sock');broker=await startBroker({socketPath,manifest:{version:1,pages:[fixture.origin+'/']},fixture,navigationDelayMs:0});
  const call=(url,extra={})=>brokerRPC(socketPath,'/fetch',{url:fixture.origin+url,method:'GET',navigation:false,...extra});
  await assert.rejects(call('/pixel.svg'),/RESOURCE_SCOPE/);
  await call('/',{navigation:true});const image=await call('/pixel.svg');assert.match(Buffer.from(image.body,'base64').toString(),/<svg/);
  await assert.rejects(call('/',{method:'POST'}),/MUTATION_BLOCKED/);
  await assert.rejects(call('/',{limits:{requests:999}}),/PROTOCOL_FIELDS/);
  await assert.rejects(call('/hidden'),/RESOURCE_SCOPE/);
  assert.ok(!fixture.requests.some(r=>r.path==='/hidden'||r.method==='POST'));
 }finally{await broker?.close();await fixture.close();await rm(root,{recursive:true,force:true});}
});

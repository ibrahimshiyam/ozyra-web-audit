import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {isPublicAddress,resolvePublic,checkedURL,Budget,brokerFetch} from '../src/network.js';
test('private, reserved, metadata, mapped and non-IP addresses fail',()=> {
 for(const ip of ['127.0.0.1','10.1.2.3','172.16.0.1','192.168.1.1','169.254.169.254','100.64.0.1','0.0.0.0','255.255.255.255','224.0.0.1','192.0.2.1','::1','::','fe80::1','fc00::1','::ffff:127.0.0.1','::ffff:8.8.8.8','2001:db8::1','localhost'])assert.equal(isPublicAddress(ip),false,ip);
 assert.equal(isPublicAddress('8.8.8.8'),true);
});
test('mixed DNS answers fail, not just the first answer',async()=> {
 await assert.rejects(resolvePublic('example.com',async()=>[{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}]),/PRIVATE_ADDRESS/);
 await assert.rejects(resolvePublic('example.com',async()=>[]),/PRIVATE_ADDRESS/);
});
test('URLs reject credentials, schemes and off-origin redirects/resources',()=> {
 for(const url of ['file:///etc/passwd','http://user:pass@example.com','http://127.1','http://2130706433','http://[::ffff:127.0.0.1]','https://other.com/'])assert.throws(()=>checkedURL(url,'https://example.com'));
 assert.equal(checkedURL('https://example.com/style.css','https://example.com').hostname,'example.com');
});
test('budget limits return errors, never pass',()=> {
 const b=new Budget({requests:1,bytes:4,responseBytes:3});b.request();assert.throws(()=>b.request(),/REQUEST_BUDGET/);assert.throws(()=>b.chunk(4,4),/BYTE_BUDGET/);
 const t=new Budget({deadlineMs:1});t.started-=10;assert.throws(()=>t.check(),/TIME_BUDGET/);
});
test('broker pins checked address and resolves again on subsequent calls',async()=> {
 let resolutions=0,connections=0;
 const resolver=async()=>{resolutions++;return [{address:resolutions===1?'8.8.8.8':'127.0.0.1',family:4}];};
 const transport=(options,callback)=>{
  connections++;assert.equal(options.hostname,'8.8.8.8');assert.equal(options.headers.host,'example.com');assert.equal(options.servername,'example.com');assert.equal(options.rejectUnauthorized,true);assert.equal(options.agent,false);
  const req=new EventEmitter();req.destroy=e=>req.emit('error',e);req.end=()=>queueMicrotask(()=>{const res=new EventEmitter();res.statusCode=200;res.headers={'content-type':'text/plain','set-cookie':'SECRET'};callback(res);res.emit('data',Buffer.from('ok'));res.emit('end');req.emit('close');});return req;
 };
 const result=await brokerFetch('https://example.com/',{origin:'https://example.com',resolver,transport});assert.equal(result.body.toString(),'ok');assert.equal(result.headers['set-cookie'],undefined);
 await assert.rejects(brokerFetch('https://example.com/',{origin:'https://example.com',resolver,transport}),/PRIVATE_ADDRESS/);assert.equal(connections,1);
});
test('mutations fail before DNS or connection',async()=> {
 let called=false;
 await assert.rejects(brokerFetch('https://example.com/',{origin:'https://example.com',method:'POST',resolver:()=>{called=true;}}),/MUTATION_BLOCKED/);assert.equal(called,false);
});
test('unresponsive DNS is bounded',async()=>{
 await assert.rejects(brokerFetch('https://example.com/',{origin:'https://example.com',resolver:()=>new Promise(()=>{}),budget:new Budget({requestMs:10})}),/DNS_TIME_BUDGET/);
});
test('caller cannot invent a loopback fixture capability',async()=>{
 await assert.rejects(brokerFetch('http://127.0.0.1/',{origin:'http://127.0.0.1',fixture:{origin:'http://127.0.0.1',address:'127.0.0.1'},resolver:async()=>[{address:'127.0.0.1',family:4}]}),/PRIVATE_ADDRESS/);
});

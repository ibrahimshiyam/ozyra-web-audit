import assert from 'node:assert/strict';
import {networkInterfaces} from 'node:os';
import {readFile} from 'node:fs/promises';
import net from 'node:net';
import dgram from 'node:dgram';
assert.notEqual(process.getuid(),0,'Browser/controller must be non-root');
assert.deepEqual(Object.keys(networkInterfaces()).filter(name=>name!=='lo'),[],'Only loopback is permitted');
const status=await readFile('/proc/self/status','utf8');
assert.match(status,/CapEff:\s+0+\n/,'No effective Linux capabilities');
assert.match(status,/NoNewPrivs:\s+1\n/,'No new privileges');
for(const host of ['1.1.1.1','169.254.169.254','10.0.0.1','2606:4700:4700::1111']) {
 await new Promise((resolve,reject)=>{
  const socket=net.createConnection({host,port:443});
  socket.setTimeout(1000,()=>socket.destroy(new Error('TEST_TIMEOUT')));
  socket.once('connect',()=>{socket.destroy();reject(new Error(`Unexpected network reachability: ${host}`));});
  socket.once('error',e=>{socket.destroy();if(['ENETUNREACH','EHOSTUNREACH','EADDRNOTAVAIL'].includes(e.code))resolve();else reject(e);});
 });
}
await new Promise((resolve,reject)=>{
 const socket=dgram.createSocket('udp4');
 socket.send(Buffer.from('owned isolation probe'),53,'1.1.1.1',e=>{socket.close();if(e && ['ENETUNREACH','EHOSTUNREACH'].includes(e.code))resolve();else reject(new Error('UDP/DNS egress did not fail with unreachable'));});
});
console.log(JSON.stringify({isolation:'verified-network-none',uid:process.getuid(),interfaces:Object.keys(networkInterfaces()),capabilities:'none',noNewPrivileges:true,tcpIPv4:'unreachable',tcpIPv6:'unreachable',udpDNS:'unreachable'}));

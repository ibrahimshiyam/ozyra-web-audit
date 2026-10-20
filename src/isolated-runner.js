import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
export async function runIsolated({socketDirectory,output,image='ozyra-isolation-proof',short=false}){
 if(process.platform!=='linux')throw new Error('LINUX_DOCKER_RUNNER_REQUIRED');
 const profile=resolve(new URL('../runner/chromium-seccomp.json',import.meta.url).pathname);
 const args=['run','--rm','--init','--network','none','--user',`${process.getuid()}:${process.getgid()}`,'--cap-drop','ALL','--security-opt','no-new-privileges','--security-opt',`seccomp=${profile}`,'--read-only','--tmpfs','/tmp:rw,nosuid,nodev,size=512m','--shm-size','256m','--memory','2g','--cpus','2','--pids-limit','256','--mount',`type=bind,src=${socketDirectory},dst=/broker,readonly`,'--mount',`type=bind,src=${output},dst=/out`];
 if(short)args.push('--env','OZYRA_TEST_SHORT=1');
 args.push(image,'node','scripts/bridge-capture.js');
 return new Promise((resolve,reject)=>{
  const child=spawn('docker',args,{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
  const timer=setTimeout(()=>child.kill('SIGTERM'),600000);child.once('close',()=>clearTimeout(timer));
  child.stdout.on('data',d=>{stdout+=d;if(stdout.length>20000)child.kill();});child.stderr.on('data',d=>{stderr+=d;if(stderr.length>50000)child.kill();});
  child.on('error',reject);child.on('close',code=>code===0?resolve({stdout,stderr}):reject(new Error(`ISOLATED_RUN_FAILED (${code}): ${stderr.slice(-4000)}`)));
 });
}

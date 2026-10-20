import {readFile,writeFile,mkdir,mkdtemp,rm,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {PUBLIC_AUDIT_ENABLED} from '../src/public-gate.js';
import {startBroker,validateManifest} from '../src/socket-broker.js';
import {runIsolated} from '../src/isolated-runner.js';
import {outsideRepository,verifyBundle} from '../src/storage.js';
import {hash} from '../src/engine.js';
const exec=promisify(execFile),image='ozyra-isolation-proof';
export async function auditIsolated({manifestPath,out,fresh=false}){
 if(!PUBLIC_AUDIT_ENABLED)throw new Error('PUBLIC_AUDIT_GATE_CLOSED');
 if(process.platform!=='linux')throw new Error('LINUX_DOCKER_RUNNER_REQUIRED');
 if((await stat(manifestPath)).size>16384)throw new Error('MANIFEST_SIZE');
 const input=JSON.parse(await readFile(manifestPath,'utf8'));validateManifest(input);
 const output=await outsideRepository(out);await mkdir(output,{recursive:true,mode:0o700});
 const imageID=(await exec('docker',['image','inspect',image,'--format','{{.Id}}'])).stdout.trim();
 const sources=await Promise.all(['socket-broker.js','network.js','resources.js','isolated-runner.js','capture.js','captured-report.js'].map(n=>readFile(new URL('../src/'+n,import.meta.url))));
 const key=hash([imageID,input,...sources.map(hash),fresh?Date.now():'cached']);
 const directory=join(output,key),bundle=join(directory,'bundle');
 try{const manifest=JSON.parse(await readFile(join(bundle,'manifest.json'),'utf8'));await verifyBundle(bundle,manifest.key);return {bundle,cached:true,modelCalls:0};}catch(e){if(e.code!=='ENOENT')throw e;}
 await mkdir(directory,{recursive:true,mode:0o700});
 const socketDirectory=await mkdtemp(join(tmpdir(),'ozyra-private-broker-'));
 let broker;
 try{
  broker=await startBroker({socketPath:join(socketDirectory,'requests.sock'),manifest:input});
  await runIsolated({socketDirectory,output:directory,image});
  const manifest=JSON.parse(await readFile(join(bundle,'manifest.json'),'utf8'));await verifyBundle(bundle,manifest.key);
  const r=JSON.parse(await readFile(join(bundle,'capture.json'),'utf8'));
  return {bundle,cached:false,modelCalls:0,statuses:r.pages.map(p=>p.status),lighthouse:r.lighthouse.status};
 }catch(e){await writeFile(join(directory,'private-error.txt'),e.message,{mode:0o600});throw new Error('AUDIT_FAILED_SEE_PRIVATE_OUTPUT');}
 finally{await broker?.close();await rm(socketDirectory,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),options={};
 for(let i=0;i<args.length;i++){if(args[i]==='--fresh')options.fresh=true;else if(args[i]==='--manifest'&&args[i+1])options.manifestPath=args[++i];else if(args[i]==='--out'&&args[i+1])options.out=args[++i];else throw new Error('Usage: --manifest private.json --out /private/output [--fresh]');}
 if(!options.manifestPath||!options.out)throw new Error('Manifest and private output required');
 auditIsolated(options).then(result=>console.log(JSON.stringify(result))).catch(e=>{console.error(/^[A-Z0-9_]+$/.test(e.message)?e.message:'AUDIT_SETUP_FAILED');process.exitCode=1;});
}

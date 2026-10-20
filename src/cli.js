#!/usr/bin/env node
import {readFile,writeFile,mkdir,stat,realpath} from 'node:fs/promises';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {analyze, hash, VERSION} from './engine.js';
import {render} from './report.js';
import {requireLiveCapture,limits} from './policy.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function run(args) {
 const [command,...rest]=args;
 if(command==='controlled') {
   if(rest[0]!=='--out' || !rest[1] || (rest.length>2 && (rest.length!==3 || rest[2]!=='--fresh'))) throw new Error('Usage: controlled --out /outside/repo/path [--fresh]');
   const {controlled}=await import('./controlled.js');
   console.log(JSON.stringify(await controlled(rest[1],{fresh:rest[2]==='--fresh'}))); return;
 }
 if(command==='audit') requireLiveCapture();
 if(!['demo','analyze'].includes(command)) { console.log('Usage: node src/cli.js demo --out /outside/repo/path\n       node src/cli.js analyze --input fixture.json --out /outside/repo/path\nLive audit disabled. Synthetic evidence only. No LLM or network.'); return; }
 const options={};
 for(let i=0;i<rest.length;i+=2){ if(!['--input','--out'].includes(rest[i]) || !rest[i+1]) throw new Error('Unknown or incomplete option'); options[rest[i]]=rest[i+1]; }
 if(!options['--out']) throw new Error('--out is required and must be outside the repository');
 const output=resolve(options['--out']);
 // Resolve the closest existing ancestor to prevent symlink paths pointing into this repository.
 let ancestor=output; const suffix=[];
 while(true){try{ancestor=await realpath(ancestor);break;}catch(e){if(e.code!=='ENOENT')throw e;suffix.unshift(ancestor.slice(dirname(ancestor).length+1));ancestor=dirname(ancestor);}}
 const canonical=resolve(ancestor,...suffix), rel=relative(root,canonical);
 if(!rel || (!rel.startsWith('..'+ '/')) && !isAbsolute(rel)) throw new Error('Output must be outside repository');
 const inputPath=command==='demo'?resolve(root,'fixtures/demo.json'):options['--input'];
 if(!inputPath)throw new Error('--input required');
 if((await stat(inputPath)).size>limits.inputBytes)throw new Error('Input byte limit exceeded');
 const input=JSON.parse(await readFile(inputPath,'utf8'));
 const report=analyze(input);
 const key=hash([VERSION,report.sourceHash]);
 await mkdir(canonical,{recursive:true,mode:0o700});
 const bundle=resolve(canonical,key);
 try{await mkdir(bundle,{mode:0o700});}catch(e){if(e.code!=='EEXIST')throw e;
 const manifest=JSON.parse(await readFile(resolve(bundle,'manifest.json'),'utf8'));
 if(manifest.key!==key || JSON.stringify(Object.keys(manifest.artifacts).sort())!==JSON.stringify(['report.html','report.json','source.json']))throw new Error('Invalid cache manifest');
 for(const [name,digest] of Object.entries(manifest.artifacts)){if(hash(await readFile(resolve(bundle,name),'utf8'))!==digest)throw new Error('Cached artifact integrity failure');}
 console.log(JSON.stringify({bundle,cached:true,modelCalls:0}));return;}
 const files={'source.json':JSON.stringify(input,null,2),'report.json':JSON.stringify(report,null,2),'report.html':render(report)};
 const artifacts={};
 for(const [name,body]of Object.entries(files)){await writeFile(resolve(bundle,name),body,{flag:'wx',mode:0o600});artifacts[name]=hash(body);}
 await writeFile(resolve(bundle,'manifest.json'),JSON.stringify({key,engineVersion:VERSION,synthetic:true,artifacts},null,2),{flag:'wx',mode:0o600});
 console.log(JSON.stringify({bundle,cached:false,modelCalls:0}));
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url))run(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});

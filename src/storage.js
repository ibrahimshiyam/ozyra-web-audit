import {realpath,readFile} from 'node:fs/promises';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from './engine.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function outsideRepository(path) {
  if(!path)throw new Error('--out required, outside repository');
  let ancestor=resolve(path);const parts=[];
  while(true){try{ancestor=await realpath(ancestor);break;}catch(e){if(e.code!=='ENOENT')throw e;parts.unshift(ancestor.slice(dirname(ancestor).length+1));ancestor=dirname(ancestor);}}
  const result=resolve(ancestor,...parts),rel=relative(root,result);
  if(!rel || (!rel.startsWith('../') && rel!=='..' && !isAbsolute(rel)))throw new Error('Output must be outside repository');
  return result;
}
export async function verifyBundle(bundle,key) {
  const manifest=JSON.parse(await readFile(resolve(bundle,'manifest.json'),'utf8'));
  if(manifest.key!==key || !manifest.artifacts || !Object.keys(manifest.artifacts).length)throw new Error('Invalid manifest');
  for(const [name,digest]of Object.entries(manifest.artifacts)) {
    if(!/^[a-zA-Z0-9_-]+\.(json|html|png)$/.test(name))throw new Error('Invalid artifact name');
    if(hash(await readFile(resolve(bundle,name)))!==digest)throw new Error('Cached artifact integrity failure');
  }
  return manifest;
}

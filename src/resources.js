import {parse as parseHTML} from 'parse5';
import {parse as parseCSS,walk} from 'css-tree';
export function referencedResources(body, contentType, base) {
 const urls=new Set();
 const add=raw=>{try{const u=new URL(raw,base);u.hash='';if(['http:','https:'].includes(u.protocol)&&!u.username&&!u.password&&u.origin===new URL(base).origin)urls.add(u.href);}catch{}};
 const css=text=>{try{walk(parseCSS(text),node=>{if(node.type==='Url')add(node.value);if(node.type==='Atrule'&&node.name==='import')node.prelude?.children?.forEach(n=>{if(n.type==='String')add(n.value);});});}catch{}};
 if(body.length>1_000_000)return urls; // Fail closed on oversized discovery input.
 const text=body.toString();
 if(contentType?.includes('text/css'))css(text);
 if(contentType?.includes('text/html')) {
  const visit=node=>{
   const a=Object.fromEntries((node.attrs??[]).map(a=>[a.name,a.value]));
   if(['img','script','source','video','audio','iframe'].includes(node.tagName)&&a.src)add(a.src);
   if(node.tagName==='video'&&a.poster)add(a.poster);
   if(node.tagName==='link'&&/^(stylesheet|icon|preload|modulepreload)$/.test(a.rel??'')&&a.href)add(a.href);
   if(a.style)css(`a{${a.style}}`);
   if(node.tagName==='style')css((node.childNodes??[]).map(n=>n.value??'').join(''));
   for(const child of node.childNodes??[])visit(child);
  };visit(parseHTML(text));
 }
 return urls;
}

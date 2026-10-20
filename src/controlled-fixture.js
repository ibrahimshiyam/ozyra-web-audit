import http from 'node:http';
const ownedFixtures=new WeakSet();
export const isOwnedFixture=fixture=>ownedFixtures.has(fixture);
export async function startFixture() {
  const requests = [];
  const base = (body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Ozyra owned test clinic</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:18px/1.5 system-ui;margin:24px;color:#14354a;background:#f4f8fb}main{max-width:900px}h1{font-size:36px}a{color:#124080}button{padding:16px}img{width:120px;height:80px}</style></head><body><main><h1>Owned demonstration clinic</h1><p>This is an Ozyra test fixture. No real institution or patient data.</p>${body}</main></body></html>`;
  const server = http.createServer((req,res)=> {
    requests.push({method:req.method,path:req.url});
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Content-Security-Policy',"frame-ancestors 'none'");
    const path = req.url.split('?')[0];
    if(path==='/robots.txt'){res.setHeader('Content-Type','text/plain');res.end('User-agent: *\nDisallow: /disallowed\n');return;}
    if(path==='/redirect'){res.writeHead(302,{Location:'http://169.254.169.254/latest/meta-data/'});res.end();return;}
    if(path==='/redirect-private'){res.writeHead(302,{Location:'http://127.0.0.1:1/'});res.end();return;}
    if(path==='/denied'){res.writeHead(403);res.end('Denied');return;}
    if(path==='/rate-limit'){res.writeHead(429,{'Retry-After':'60'});res.end('Slow down');return;}
    if(path==='/challenge'){res.end(base('<p>Verify you are human</p>'));return;}
    if(path==='/big'){res.end('x'.repeat(100000));return;}
    if(path==='/slow'){return;}
    if(path==='/pixel.svg'){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="#287999"/></svg>');return;}
    if(path==='/clean'){res.end(base('<h2>Appointments</h2><p>Call our fictional reception.</p><a href="tel:+000000000">Call reception</a>'));return;}
    if(path==='/adversarial'){res.end(base(`<p>Controlled guard fixture</p><script>
      fetch('/mutation',{method:'POST',body:'not patient data'}).catch(()=>{});
      fetch('http://169.254.169.254/metadata').catch(()=>{});
      fetch('/slow').catch(()=>{});
      new WebSocket('ws://127.0.0.1:1/');
    </script><img src="http://127.0.0.1:1/private" alt="Blocked test">`));return;}
    if(path==='/'){res.end(base('<h2>Appointment information</h2><div style="width:760px">Intentionally overflowing test content.</div><img src="/pixel.svg"><label>Unassociated test label</label><input id="unlabelled"><p><a href="/clean">Contact information</a></p>'));return;}
    res.writeHead(404);res.end('Fixture path missing');
  });
  server.requestTimeout=5000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const origin=`http://127.0.0.1:${server.address().port}`;
  const fixture=Object.freeze({origin,address:'127.0.0.1',requests,close:async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}});
  ownedFixtures.add(fixture);
  return fixture;
}

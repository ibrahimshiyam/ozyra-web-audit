import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import {isOwnedFixture} from './controlled-fixture.js';

export const DEFAULT_BUDGET = Object.freeze({ requests: 120, bytes: 32 * 1024 * 1024, responseBytes: 8 * 1024 * 1024, deadlineMs: 480000, requestMs: 45000 });
export function isPublicAddress(address) {
  try {
    const parsed = ipaddr.parse(address);
    // Mapped addresses are rejected, rather than permitting surprising aliases.
    return parsed.range() === 'unicast' && !(parsed.kind() === 'ipv6' && parsed.isIPv4MappedAddress());
  } catch { return false; }
}
export async function resolvePublic(hostname, resolver = dns.lookup) {
  const records = await resolver(hostname.replace(/^\[|\]$/g, ''), { all: true, verbatim: true });
  if (!records.length || records.some(r => !isPublicAddress(r.address))) throw new Error('PRIVATE_ADDRESS');
  return records[0];
}
export function checkedURL(raw, origin) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('UNSAFE_URL');
  if (url.origin !== origin) throw new Error('OUT_OF_SCOPE');
  return url;
}
export class Budget {
  constructor(limits = {}) { this.limits = { ...DEFAULT_BUDGET, ...limits }; this.started = Date.now(); this.requests = 0; this.bytes = 0; }
  check() { if (Date.now() - this.started >= this.limits.deadlineMs) throw new Error('TIME_BUDGET'); }
  request() { this.check(); if (++this.requests > this.limits.requests) throw new Error('REQUEST_BUDGET'); }
  chunk(n, responseBytes) { this.check(); this.bytes += n; if (this.bytes > this.limits.bytes || responseBytes > this.limits.responseBytes) throw new Error('BYTE_BUDGET'); }
}
/** Broker pins the validated IP on each request. It never follows redirects itself. */
export async function brokerFetch(raw, { origin, method = 'GET', budget = new Budget(), fixture, resolver = dns.lookup, transport } = {}) {
  const url = checkedURL(raw, origin);
  if (!['GET', 'HEAD'].includes(method)) throw new Error('MUTATION_BLOCKED');
  budget.request();
  let dnsTimer;
  const address = isOwnedFixture(fixture) && fixture.origin === origin && fixture.address === '127.0.0.1'
    ? { address: '127.0.0.1', family: 4 }
    : await Promise.race([resolvePublic(url.hostname, resolver),new Promise((_,reject)=>{dnsTimer=setTimeout(()=>reject(new Error('DNS_TIME_BUDGET')),Math.max(1,Math.min(budget.limits.requestMs,budget.limits.deadlineMs-(Date.now()-budget.started))));})]).finally(()=>clearTimeout(dnsTimer));
  budget.check();
  const send = transport ?? (url.protocol === 'https:' ? https.request : http.request);
  return new Promise((resolve, reject) => {
    const req = send({ protocol: url.protocol, hostname: address.address, family: address.family,
      port: url.port || (url.protocol === 'https:' ? 443 : 80), path: url.pathname + url.search,
      servername: url.hostname, rejectUnauthorized: true, method, agent: false,
      headers: { host: url.host, 'user-agent': 'OzyraWebAudit/0.2 controlled-fixture prototype', accept: '*/*' } }, res => {
      const chunks = []; let bytes = 0;
      res.on('data', chunk => {
        bytes += chunk.length;
        try { budget.chunk(chunk.length, bytes); chunks.push(chunk); }
        catch (e) { req.destroy(e); }
      });
      res.on('error', reject);
      res.on('end', () => {
        const status = res.statusCode;
        if ([401,403,429].includes(status)) { reject(new Error(`ACCESS_STOP_${status}`)); return; }
        // Do not persist cookies, credential headers or arbitrary response metadata.
        const headers = {};
        for (const key of ['content-type','content-security-policy','strict-transport-security','x-frame-options','location'])
          if (res.headers[key]) headers[key] = String(res.headers[key]);
        if(status>=300 && status<400 && headers.location) {
          try { checkedURL(new URL(headers.location,url).href,origin); } catch(e) { reject(e);return; }
        }
        const body = Buffer.concat(chunks);
        if (headers['content-type']?.includes('text/html') && /<input[^>]+type=["']?password|verify you are human|g-recaptcha|h-captcha/i.test(body.toString())) {
          reject(new Error('CHALLENGE_OR_LOGIN_STOP')); return;
        }
        resolve({ status, headers, body });
      });
    });
    const remaining = Math.max(1, budget.limits.deadlineMs - (Date.now() - budget.started));
    const timer = setTimeout(() => req.destroy(new Error('TIME_BUDGET')), Math.min(remaining, budget.limits.requestMs));
    req.on('close', () => clearTimeout(timer));
    req.on('error', reject);
    req.end();
  });
}
/** Browser fallback networking is denied; approved requests are fulfilled by brokerFetch. */
export async function denyProxy() {
  const server = http.createServer((req,res) => { res.writeHead(403); res.end('DIRECT_NETWORK_DISABLED'); });
  server.on('connect', (req, socket) => socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'));
  server.on('upgrade', (req, socket) => socket.destroy());
  const sockets = new Set();
  server.on('connection', socket => { sockets.add(socket); socket.on('close',()=>sockets.delete(socket)); });
  await new Promise((resolve,reject) => { server.once('error',reject); server.listen(0,'127.0.0.1',resolve); });
  return { url: `http://127.0.0.1:${server.address().port}`, close: async () => { for(const s of sockets)s.destroy(); await new Promise(resolve=>server.close(resolve)); } };
}

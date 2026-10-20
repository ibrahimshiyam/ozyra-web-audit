import {createHash} from 'node:crypto';
import {limits, publicUrl} from './policy.js';
export const VERSION = '0.1.0';
export const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
function keys(object, allowed) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) throw new Error('Expected object');
  for (const key of Object.keys(object)) if (!allowed.includes(key)) throw new Error(`Unsupported field: ${key}`);
}
export function validate(input) {
  keys(input, ['schemaVersion','synthetic','capturedAt','pages']);
  if (!input || input.schemaVersion !== 1 || input.synthetic !== true) throw new Error('Only schemaVersion 1 synthetic evidence is supported');
  if (!Array.isArray(input.pages) || !input.pages.length || input.pages.length > limits.pages) throw new Error('Expected 1–3 pages');
  let origin;
  const seen = new Set();
  for (const p of input.pages) {
    keys(p, ['url','status','headers','views','labSamples']);
    if(p.headers) {
      keys(p.headers, Object.keys(p.headers));
      for(const [name,value] of Object.entries(p.headers)) {
        if (!['content-security-policy','x-frame-options','strict-transport-security'].includes(name.toLowerCase())) throw new Error('Only allowlisted non-cookie headers accepted');
        if (typeof value !== 'string' || value.length > 4096) throw new Error('Invalid header value');
      }
    }
    if(p.labSamples && (!Array.isArray(p.labSamples) || p.labSamples.length)) throw new Error('Performance ingestion is not implemented; leave labSamples empty');
    const u = new URL(publicUrl(p.url));
    if (!u.hostname.endsWith('.invalid')) throw new Error('Synthetic URLs must use .invalid domains');
    if (origin && origin !== u.origin) throw new Error('Pages must share an origin');
    origin = u.origin;
    if (seen.has(u.href)) throw new Error('Duplicate page URL');
    seen.add(u.href);
    if (!['complete','blocked','not_tested'].includes(p.status)) throw new Error('Invalid page status');
    if (!Array.isArray(p.views) || p.views.length > 3) throw new Error('Expected up to 3 views');
    for (const v of p.views) {
      keys(v, ['width','scrollWidth','axeViolations']);
      if (!Number.isFinite(v.width) || v.width < 1 || !Number.isFinite(v.scrollWidth) || v.scrollWidth < 0) throw new Error('Invalid viewport metrics');
      if (!Array.isArray(v.axeViolations) || v.axeViolations.length > 100) throw new Error('Invalid accessibility findings');
      for (const a of v.axeViolations) { keys(a, ['id','target']); if (typeof a.id !== 'string' || typeof a.target !== 'string' || a.id.length > 100 || a.target.length > 500) throw new Error('Invalid rule or selector'); }
    }
  }
  return input;
}
export function analyze(input) {
  validate(input);
  const findings = new Map();
  const add = (rule, dimension, observed, p, v, source, target = '') => {
    const fingerprint = hash([rule, target, v?.width ?? null]).slice(0,16);
    if (!findings.has(fingerprint)) findings.set(fingerprint, {id:fingerprint, rule, dimension, observed, status:'needs_review', confidence:'synthetic evidence only', target, viewport:v?.width ?? null, evidence:[], affectedPages:[]});
    const f = findings.get(fingerprint);
    f.evidence.push({path:'source.json', pointer:source});
    if (!f.affectedPages.includes(p.url)) f.affectedPages.push(p.url);
  };
  input.pages.forEach((p, pi) => {
    if (p.status !== 'complete') return;
    p.views.forEach((v, vi) => {
      const ptr = `/pages/${pi}/views/${vi}`;
      if (v.scrollWidth > v.width + 1) add('layout.horizontal-overflow','responsive',`Document width exceeds viewport at ${v.width}px; task impact requires review`,p,v,ptr);
      for (const [ai,a] of v.axeViolations.entries()) add(`axe.${a.id}`,'accessibility',`Supplied automated finding: ${a.id}; not a conformance determination`,p,v,`${ptr}/axeViolations/${ai}`,a.target);
    });
    if (p.headers) {
      const headers = Object.fromEntries(Object.entries(p.headers).map(([k,v])=>[k.toLowerCase(),String(v)]));
      if (!headers['content-security-policy']?.match(/(?:^|;)\s*frame-ancestors\s/i) && !headers['x-frame-options']) add('headers.frame-control-unobserved','passive_posture','Neither CSP frame-ancestors nor X-Frame-Options observed in supplied headers; applicability requires review, not proof of vulnerability',p,null,`/pages/${pi}/headers`);
    }
  });
  return {schemaVersion:1, engineVersion:VERSION, synthetic:true, sourceHash:hash(input), runId:hash([VERSION,input]).slice(0,20), capturedAt:input.capturedAt ?? null, costs:{modelCalls:0,inputTokens:0,outputTokens:0}, coverage:input.pages.map(p=>({url:p.url,status:p.status,viewports:p.views.map(v=>v.width),manualReview:'not_tested',fieldPerformance:'unknown',liveSecurity:'not_tested'})), findings:[...findings.values()], performance:input.pages.map(p=>({url:p.url,kind:'synthetic lab values',samples:p.labSamples ?? [],field:'unknown'})), limitations:['Synthetic supplied evidence; no website visited or screenshot captured.','Automated accessibility findings do not establish WCAG conformance.','No holistic security or quality grade.','Lab values are not real-user experience; TBT is not INP.']};
}

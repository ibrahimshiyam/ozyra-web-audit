/** No network client exists in this release. URL parsing is not an SSRF defence. */
export const limits = Object.freeze({pages:3, navigationDelayMs:5000, pageTimeoutMs:45000, siteTimeoutMs:480000, inputBytes:1_000_000});
export function publicUrl(value) {
  const u = new URL(value);
  if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password)
    throw new Error('Only credential-free HTTP(S) URLs are representable');
  u.hash = '';
  return u.href;
}
export function requireLiveCapture() {
  throw new Error('DIRECT_LIVE_DISABLED: use audit --manifest private.json --out /private/output on the verified Linux Docker runner. Direct browser networking is never enabled.');
}

export function applySecurityHeaders(set: { headers: any }): void {
  if (set.headers && typeof set.headers.set === 'function') {
    set.headers.set('X-Content-Type-Options', 'nosniff');
    set.headers.set('X-Frame-Options', 'SAMEORIGIN');
    set.headers.set('X-XSS-Protection', '1; mode=block');
    set.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  } else if (set.headers) {
    set.headers['X-Content-Type-Options'] = 'nosniff';
    set.headers['X-Frame-Options'] = 'SAMEORIGIN';
    set.headers['X-XSS-Protection'] = '1; mode=block';
    set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
  }
}

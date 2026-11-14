/**
 * Engine Que Security Utilities
 * - HTML Entity Escaper for Stored XSS Prevention
 * - 10-Digit Mobile Phone Input Standardizer & Country Code Selector
 * - Input Boundary Limiter
 */

const SUPPORTED_COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'USA / Canada', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
];

/**
 * Robust HTML entity escaping for XSS prevention.
 * Converts sensitive HTML control characters into safe character entities.
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes phone input into strict 10 digits.
 * Automatically removes non-digits and truncates to 10 characters.
 */
function sanitize10DigitMobile(raw) {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  // Strip single trunk 0 (e.g. 09876543210 -> 9876543210)
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  // Strip 91 prefix if user typed 919876543210 without country selector
  else if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 10);
}

/**
 * Populates an HTML <select> element with supported country codes.
 */
function populateCountrySelect(selectElement, defaultCode = '+91') {
  if (!selectElement) return;
  selectElement.innerHTML = SUPPORTED_COUNTRY_CODES.map(c => `
    <option value="${c.code}" ${c.code === defaultCode ? 'selected' : ''}>
      ${c.flag} ${c.code} (${c.country})
    </option>
  `).join('');
}

/**
 * Attaches real-time 10-digit input mask and enforcement to an HTML input.
 */
function setup10DigitPhoneMask(inputElement) {
  if (!inputElement) return;
  inputElement.setAttribute('maxlength', '10');
  inputElement.setAttribute('inputmode', 'numeric');
  inputElement.setAttribute('pattern', '[0-9]{10}');
  inputElement.setAttribute('placeholder', '10-digit mobile number');

  inputElement.addEventListener('input', function(e) {
    const sanitized = sanitize10DigitMobile(e.target.value);
    if (e.target.value !== sanitized) {
      e.target.value = sanitized;
    }
  });
}

// Export for module/Node/Bun environments if available
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    escapeHtml,
    sanitize10DigitMobile,
    populateCountrySelect,
    setup10DigitPhoneMask,
    SUPPORTED_COUNTRY_CODES,
  };
}

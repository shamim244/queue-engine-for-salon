export interface SupportedCountry {
  code: string;
  country: string;
  flag: string;
}

export const SUPPORTED_COUNTRY_CODES: SupportedCountry[] = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'USA / Canada', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+971', country: 'United Arab Emirates', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
];

export function getSupportedCountryCodes(): SupportedCountry[] {
  return [...SUPPORTED_COUNTRY_CODES];
}

export interface PhoneValidationResult {
  isValid: boolean;
  normalizedPhone: string;
  countryCode: string;
  nationalNumber: string;
  error?: string;
}

/**
 * Standardize and validate mobile numbers:
 * - Core national number MUST be strictly 10 digits.
 * - Handles country codes (+91 default, expandable to international).
 * - Strips leading trunk zeros (09876543210 -> 9876543210).
 * - Strips spaces, dashes, and brackets.
 */
export function parseAndValidateMobile(
  input: string | null | undefined,
  preferredCountryCode: string = '+91'
): PhoneValidationResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      normalizedPhone: '',
      countryCode: preferredCountryCode,
      nationalNumber: '',
      error: 'Mobile phone number is required.',
    };
  }

  const raw = input.trim();
  if (!raw) {
    return {
      isValid: false,
      normalizedPhone: '',
      countryCode: preferredCountryCode,
      nationalNumber: '',
      error: 'Mobile phone number cannot be blank.',
    };
  }

  // Clean all characters except digits and leading '+'
  const hasPlus = raw.startsWith('+');
  const digitsOnly = raw.replace(/\D/g, '');

  if (!digitsOnly) {
    return {
      isValid: false,
      normalizedPhone: '',
      countryCode: preferredCountryCode,
      nationalNumber: '',
      error: 'Mobile phone number must contain valid digits.',
    };
  }

  let countryCode = preferredCountryCode.startsWith('+') ? preferredCountryCode : `+${preferredCountryCode}`;
  let nationalNumber = digitsOnly;

  if (hasPlus) {
    // Explicit country code provided with '+'
    // Sort by longest dial code first to match multi-digit codes (e.g. +971 before +9)
    const sortedCodes = [...SUPPORTED_COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
    let matched = false;

    for (const c of sortedCodes) {
      const codeDigits = c.code.replace('+', '');
      if (digitsOnly.startsWith(codeDigits)) {
        countryCode = c.code;
        nationalNumber = digitsOnly.slice(codeDigits.length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Generic fallback for any E.164 country code: take leading 1 to 4 digits if national length is 10
      if (digitsOnly.length > 10) {
        const excess = digitsOnly.length - 10;
        countryCode = `+${digitsOnly.slice(0, excess)}`;
        nationalNumber = digitsOnly.slice(excess);
      }
    }
  } else {
    // No leading plus
    // Case A: 11 digits starting with trunk 0 (e.g. 09876543210 -> 9876543210)
    if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
      nationalNumber = digitsOnly.slice(1);
    }
    // Case B: 12 digits starting with 91 (e.g. 919876543210)
    else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      countryCode = '+91';
      nationalNumber = digitsOnly.slice(2);
    }
    // Case C: Standard 10 digits
    else {
      nationalNumber = digitsOnly;
    }
  }

  // Core requirement: Mobile number must be exactly 10 digits
  if (nationalNumber.length !== 10) {
    return {
      isValid: false,
      normalizedPhone: '',
      countryCode,
      nationalNumber,
      error: `Mobile number must be exactly 10 digits. (Received ${nationalNumber.length} digits).`,
    };
  }

  const normalizedPhone = `${countryCode}${nationalNumber}`;

  return {
    isValid: true,
    normalizedPhone,
    countryCode,
    nationalNumber,
  };
}

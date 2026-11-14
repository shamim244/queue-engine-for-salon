import { isMySqlConnected, getDb } from '../mysql';
import type { SecuritySettings } from '../../engine/types';
import { memoryStore, defaultSecuritySettings } from './store';

function mapRowToSecuritySettings(r: any): SecuritySettings {
  let allowedCustomOrigins: string[] = [];
  if (r.allowed_custom_origins) {
    if (typeof r.allowed_custom_origins === 'string') {
      try {
        allowedCustomOrigins = JSON.parse(r.allowed_custom_origins);
      } catch {
        allowedCustomOrigins = r.allowed_custom_origins.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    } else if (Array.isArray(r.allowed_custom_origins)) {
      allowedCustomOrigins = r.allowed_custom_origins;
    }
  }

  let allowedCountryCodes: string[] = ['+91', '+1', '+44', '+971', '+65'];
  if (r.allowed_country_codes) {
    if (typeof r.allowed_country_codes === 'string') {
      try {
        allowedCountryCodes = JSON.parse(r.allowed_country_codes);
      } catch {
        allowedCountryCodes = r.allowed_country_codes.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    } else if (Array.isArray(r.allowed_country_codes)) {
      allowedCountryCodes = r.allowed_country_codes;
    }
  }

  return {
    id: r.id || 'default_security_settings',
    pinMaxAttempts: Number(r.pin_max_attempts ?? 5),
    pinWindowSeconds: Number(r.pin_window_seconds ?? 900),
    loginMaxAttempts: Number(r.login_max_attempts ?? 10),
    loginWindowSeconds: Number(r.login_window_seconds ?? 900),
    checkinMaxAttempts: Number(r.checkin_max_attempts ?? 10),
    checkinWindowSeconds: Number(r.checkin_window_seconds ?? 300),
    allowedCustomOrigins,
    defaultCountryCode: r.default_country_code || '+91',
    allowedCountryCodes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const securityRepo = {
  async getSettings(): Promise<SecuritySettings> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows]: any = await db.query(
          'SELECT * FROM security_settings WHERE id = ? LIMIT 1',
          ['default_security_settings']
        );
        if (rows.length > 0) {
          const settings = mapRowToSecuritySettings(rows[0]);
          memoryStore.securitySettings = settings;
          return settings;
        }
      } catch (err: any) {
        console.warn(`[SecurityRepo] Error reading security_settings from MySQL: ${err.message}`);
      }
    }
    return memoryStore.securitySettings || { ...defaultSecuritySettings };
  },

  async updateSettings(partial: Partial<SecuritySettings>): Promise<SecuritySettings> {
    const current = await this.getSettings();
    const updated: SecuritySettings = {
      ...current,
      ...partial,
      allowedCustomOrigins: partial.allowedCustomOrigins !== undefined
        ? partial.allowedCustomOrigins
        : current.allowedCustomOrigins,
      allowedCountryCodes: partial.allowedCountryCodes !== undefined
        ? partial.allowedCountryCodes
        : current.allowedCountryCodes,
      updatedAt: new Date().toISOString(),
    };

    memoryStore.securitySettings = updated;

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `INSERT INTO security_settings (
            id, pin_max_attempts, pin_window_seconds, login_max_attempts, login_window_seconds,
            checkin_max_attempts, checkin_window_seconds, allowed_custom_origins,
            default_country_code, allowed_country_codes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            pin_max_attempts = VALUES(pin_max_attempts),
            pin_window_seconds = VALUES(pin_window_seconds),
            login_max_attempts = VALUES(login_max_attempts),
            login_window_seconds = VALUES(login_window_seconds),
            checkin_max_attempts = VALUES(checkin_max_attempts),
            checkin_window_seconds = VALUES(checkin_window_seconds),
            allowed_custom_origins = VALUES(allowed_custom_origins),
            default_country_code = VALUES(default_country_code),
            allowed_country_codes = VALUES(allowed_country_codes),
            updated_at = CURRENT_TIMESTAMP`,
          [
            updated.id,
            updated.pinMaxAttempts,
            updated.pinWindowSeconds,
            updated.loginMaxAttempts,
            updated.loginWindowSeconds,
            updated.checkinMaxAttempts,
            updated.checkinWindowSeconds,
            JSON.stringify(updated.allowedCustomOrigins),
            updated.defaultCountryCode,
            JSON.stringify(updated.allowedCountryCodes),
          ]
        );
      } catch (err: any) {
        console.warn(`[SecurityRepo] Error updating security_settings in MySQL: ${err.message}`);
      }
    }

    return updated;
  },
};

/**
 * Utility functions for safe number, currency, date, and text formatting.
 * Guaranteed never to throw on undefined, null, object, or unexpected types.
 */

// Clean vehicle key: strips all spaces, hyphens, symbols and converts to uppercase
// E.g. 'JH11D0037', 'JH11D 0037', 'jh-11-d-0037' all become 'JH11D0037'
export function cleanVehicleKey(raw: unknown): string {
  if (!raw) return '';
  return String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Pretty display of vehicle plate (standardized uppercase, single spacing)
export function formatVehiclePlate(raw: unknown): string {
  if (!raw) return '';
  const cleaned = cleanVehicleKey(raw);
  if (!cleaned) return '';
  // If standard Indian format like JH11D0037 or MH12AB1234, format nicely
  const match = cleaned.match(/^([A-Z]{2})([0-9]{1,2})([A-Z]{0,3})([0-9]{1,4})$/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]} ${match[4]}`.replace(/\s+/g, ' ').trim();
  }
  return cleaned;
}

// Check if two vehicle numbers represent the exact same vehicle
export function isSameVehicle(v1: unknown, v2: unknown): boolean {
  const k1 = cleanVehicleKey(v1);
  const k2 = cleanVehicleKey(v2);
  return Boolean(k1 && k2 && k1 === k2);
}

export function formatCurrency(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '0';
  }
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) {
    return '0';
  }
  return num.toLocaleString('en-IN');
}

export function formatWeight(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '0';
  }
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) {
    return '0';
  }
  return num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function formatNumber(value: unknown, fractionDigits = 0): string {
  if (value === null || value === undefined || value === '') {
    return '0';
  }
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) {
    return '0';
  }
  return num.toLocaleString('en-IN', { maximumFractionDigits: fractionDigits });
}

export function safeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

export function safeEmailDisplay(email: unknown): string {
  if (!email || typeof email !== 'string') return 'Admin';
  if (email.includes('@')) {
    return email.split('@')[0] || email;
  }
  return email;
}

export function safeDateDisplay(dateVal: unknown): string {
  if (!dateVal) return '-';
  if (typeof dateVal === 'string') {
    return dateVal.includes('T') ? dateVal.split('T')[0] : dateVal;
  }
  if (typeof dateVal === 'object') {
    const obj = dateVal as any;
    if (typeof obj.toDate === 'function') {
      try {
        return obj.toDate().toISOString().split('T')[0];
      } catch {
        return '-';
      }
    }
    if (typeof obj.seconds === 'number') {
      try {
        return new Date(obj.seconds * 1000).toISOString().split('T')[0];
      } catch {
        return '-';
      }
    }
  }
  return String(dateVal);
}

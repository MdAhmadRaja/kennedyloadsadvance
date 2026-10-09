/**
 * Utility functions for safe number and currency formatting
 * Prevents any undefined or NaN toLocaleString runtime errors
 */

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

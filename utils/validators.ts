/** Validate email format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validate non-empty string */
export function isRequired(value: string): boolean {
  return value.trim().length > 0;
}

/** Validate minimum length */
export function minLength(value: string, min: number): boolean {
  return value.length >= min;
}

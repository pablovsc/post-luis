import crypto from 'crypto';

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password.trim()).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  const inputHash = hashPassword(password);
  return inputHash === hash;
}


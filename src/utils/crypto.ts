import crypto from 'crypto';

/**
 * Verify WhatsApp webhook signature
 */
export function verifyWhatsAppSignature(
  payload: string,
  signature: string,
  appSecret: string
): boolean {
  const expectedSignature = crypto.createHmac('sha256', appSecret).update(payload).digest('hex');

  const signatureHash = signature.startsWith('sha256=') ? signature.slice(7) : signature;

  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signatureHash));
}

/**
 * Generate SHA256 hash of a buffer
 */
export function generateSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Generate a random verification token
 */
export function generateVerifyToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

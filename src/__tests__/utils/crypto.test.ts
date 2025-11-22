import { verifyWhatsAppSignature, generateSha256 } from '../../utils/crypto';

describe('Crypto Utilities', () => {
  describe('verifyWhatsAppSignature', () => {
    it('should verify valid signature', () => {
      const payload = 'test payload';
      const secret = 'test-secret';

      // Generate signature
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const isValid = verifyWhatsAppSignature(
        payload,
        `sha256=${expectedSignature}`,
        secret
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = 'test payload';
      const secret = 'test-secret';
      const invalidSignature = 'sha256=invalid';

      const isValid = verifyWhatsAppSignature(payload, invalidSignature, secret);

      expect(isValid).toBe(false);
    });
  });

  describe('generateSha256', () => {
    it('should generate consistent hash', () => {
      const buffer = Buffer.from('test data');
      const hash1 = generateSha256(buffer);
      const hash2 = generateSha256(buffer);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different hashes for different data', () => {
      const buffer1 = Buffer.from('test data 1');
      const buffer2 = Buffer.from('test data 2');

      const hash1 = generateSha256(buffer1);
      const hash2 = generateSha256(buffer2);

      expect(hash1).not.toBe(hash2);
    });
  });
});
